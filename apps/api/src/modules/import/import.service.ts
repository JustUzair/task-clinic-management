import { basename } from "node:path";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  AccountRole,
  ImportBatchStatus,
  ImportRowStatus,
  ImportSource,
  ImportType,
  NotificationType,
} from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { sha256 } from "../../lib/crypto.js";
import { parseCsv, type CsvLimits, type ParsedCsvRow } from "./csv-parser.js";
import {
  normalizeShiftRow,
  type RawShiftRow,
  type ShiftRequirements,
} from "./shift-normalization.js";
import {
  normalizeStaffRow,
  type RawStaffRow,
} from "./staff-normalization.js";
import type { NotificationService } from "../notification/notification.service.js";
import type { SseHub } from "../realtime/sse-hub.js";

const staffHeaders = ["staff_id", "full_name", "role", "email"] as const;
const shiftHeaders = [
  "shift_id",
  "date",
  "start_time",
  "end_time",
  "requirements",
] as const;

export interface ImportInput {
  content: string;
  createdByAccountId?: string;
  filename: string;
  source: ImportSource;
}

export interface ImportSummary {
  acceptedRows: number;
  batchId: string;
  mergedRows: number;
  rejectedRows: number;
  totalRows: number;
}

interface Counters {
  acceptedRows: number;
  mergedRows: number;
  rejectedRows: number;
}

type TransactionClient = Prisma.TransactionClient;

export class ImportService {
  constructor(
    private readonly database: PrismaClient,
    private readonly limits: CsvLimits,
    private readonly timezone: string,
    private readonly notifications?: NotificationService,
    private readonly events?: SseHub,
  ) {}

  async importStaff(input: ImportInput): Promise<ImportSummary> {
    const rows = parseCsv(input.content, staffHeaders, this.limits);
    return this.runImport(input, ImportType.STAFF, rows, (transaction, batchId) =>
      this.persistStaffRows(transaction, batchId, rows),
    );
  }

  async importShifts(input: ImportInput): Promise<ImportSummary> {
    const rows = parseCsv(input.content, shiftHeaders, this.limits);
    return this.runImport(input, ImportType.SHIFT, rows, (transaction, batchId) =>
      this.persistShiftRows(transaction, batchId, rows),
    );
  }

  private async runImport(
    input: ImportInput,
    type: ImportType,
    rows: ParsedCsvRow[],
    persistRows: (
      transaction: TransactionClient,
      batchId: string,
    ) => Promise<Counters>,
  ): Promise<ImportSummary> {
    const checksum = sha256(input.content);
    const seedFingerprint =
      input.source === ImportSource.SEED ? `${type}:${checksum}` : null;

    if (seedFingerprint) {
      const completed = await this.database.importBatch.findUnique({
        where: { seedFingerprint },
      });
      if (completed?.status === ImportBatchStatus.COMPLETED) {
        return this.toSummary(completed);
      }
    }

    const batch = await this.database.importBatch.create({
      data: {
        checksum,
        createdByAccountId: input.createdByAccountId,
        seedFingerprint,
        source: input.source,
        sourceFilename: basename(input.filename),
        totalRows: rows.length,
        type,
      },
    });

    try {
      return await this.database.$transaction(
        async transaction => {
          const counters = await persistRows(transaction, batch.id);
          const completed = await transaction.importBatch.update({
            where: { id: batch.id },
            data: {
              ...counters,
              completedAt: new Date(),
              status: ImportBatchStatus.COMPLETED,
            },
          });

          return this.toSummary(completed);
        },
        {
          maxWait: 10_000,
          timeout: 120_000,
        },
      );
    } catch (error) {
      await this.database.$transaction(async transaction => {
        await transaction.importBatch.update({
          where: { id: batch.id },
          data: {
            completedAt: new Date(),
            failureReason:
              error instanceof Error ? error.message : "Unknown import failure",
            status: ImportBatchStatus.FAILED,
          },
        });

        if (input.createdByAccountId && this.notifications) {
          await this.notifications.create(transaction, {
            eventKey: `import:${batch.id}:failed`,
            messageData: {
              batchId: batch.id,
              sourceFilename: basename(input.filename),
            },
            recipientAccountId: input.createdByAccountId,
            relatedEntity: "ImportBatch",
            relatedRecordId: batch.id,
            type: NotificationType.IMPORT_FAILED,
          });
        }
      });
      if (input.createdByAccountId && this.events) {
        this.events.publishToAccount(input.createdByAccountId, {
          name: "import.status_changed",
          resourceId: batch.id,
        });
        this.events.publishToAccount(input.createdByAccountId, {
          name: "notification.created",
          resourceId: batch.id,
        });
      }
      throw error;
    }
  }

  private async persistStaffRows(
    transaction: TransactionClient,
    batchId: string,
    rows: ParsedCsvRow[],
  ): Promise<Counters> {
    const counters = this.emptyCounters();

    for (const row of rows) {
      if (row.columnError) {
        counters.rejectedRows += 1;
        await this.createEvidence(transaction, batchId, row, {
          action: "rejected",
          explanation: row.columnError,
          reasonCode: "COLUMN_COUNT_MISMATCH",
          status: ImportRowStatus.REJECTED,
        });
        continue;
      }

      const normalized = normalizeStaffRow(row.raw as unknown as RawStaffRow);
      if (!normalized.ok) {
        counters.rejectedRows += 1;
        await this.createEvidence(transaction, batchId, row, {
          action: "rejected",
          explanation: normalized.message,
          reasonCode: normalized.reasonCode,
          status: ImportRowStatus.REJECTED,
        });
        continue;
      }

      const value = normalized.value;
      const existingProfile = await transaction.staffProfile.findUnique({
        where: { staffId: value.staff_id },
        include: { account: true },
      });
      const normalizedData = {
        email: value.email,
        full_name: value.full_name,
        role: value.role,
        staff_id: value.staff_id,
      };

      if (existingProfile) {
        const exactMatch =
          existingProfile.profession === value.role &&
          existingProfile.account.email === value.email &&
          existingProfile.account.fullName === value.full_name;

        if (exactMatch) {
          counters.mergedRows += 1;
          await this.createEvidence(transaction, batchId, row, {
            action: "kept_existing",
            explanation: "An identical normalized staff record already exists",
            linkedEntity: "StaffProfile",
            linkedRecordId: existingProfile.id,
            normalizedData,
            reasonCode: "EXACT_DUPLICATE",
            status: ImportRowStatus.MERGED,
          });
        } else {
          counters.rejectedRows += 1;
          await this.createEvidence(transaction, batchId, row, {
            action: "rejected",
            explanation:
              "staff_id already exists with different normalized data",
            linkedEntity: "StaffProfile",
            linkedRecordId: existingProfile.id,
            normalizedData,
            reasonCode: "STAFF_ID_CONFLICT",
            status: ImportRowStatus.REJECTED,
          });
        }
        continue;
      }

      const accountWithEmail = await transaction.account.findUnique({
        where: { email: value.email },
        include: { staffProfile: true },
      });
      if (accountWithEmail) {
        counters.rejectedRows += 1;
        await this.createEvidence(transaction, batchId, row, {
          action: "rejected",
          explanation: "email already belongs to another account",
          linkedEntity: "Account",
          linkedRecordId: accountWithEmail.id,
          normalizedData,
          reasonCode: "EMAIL_CONFLICT",
          status: ImportRowStatus.REJECTED,
        });
        continue;
      }

      const created = await transaction.account.create({
        data: {
          email: value.email,
          fullName: value.full_name,
          role: AccountRole.STAFF,
          staffProfile: {
            create: {
              profession: value.role,
              staffId: value.staff_id,
            },
          },
        },
        include: { staffProfile: true },
      });

      counters.acceptedRows += 1;
      await this.createEvidence(transaction, batchId, row, {
        action: "inserted",
        explanation: "Staff account and profile created",
        linkedEntity: "StaffProfile",
        linkedRecordId: created.staffProfile?.id,
        normalizedData,
        status: ImportRowStatus.ACCEPTED,
      });
    }

    return counters;
  }

  private async persistShiftRows(
    transaction: TransactionClient,
    batchId: string,
    rows: ParsedCsvRow[],
  ): Promise<Counters> {
    const counters = this.emptyCounters();

    for (const row of rows) {
      if (row.columnError) {
        counters.rejectedRows += 1;
        await this.createEvidence(transaction, batchId, row, {
          action: "rejected",
          explanation: row.columnError,
          reasonCode: "COLUMN_COUNT_MISMATCH",
          status: ImportRowStatus.REJECTED,
        });
        continue;
      }

      const normalized = normalizeShiftRow(
        row.raw as unknown as RawShiftRow,
        this.timezone,
      );
      if (!normalized.ok) {
        counters.rejectedRows += 1;
        await this.createEvidence(transaction, batchId, row, {
          action: "rejected",
          explanation: normalized.message,
          reasonCode: normalized.reasonCode,
          status: ImportRowStatus.REJECTED,
        });
        continue;
      }

      const value = normalized.value;
      const requirementsJson: Prisma.InputJsonObject = {
        doctor: value.requirements.doctor,
        nurse: value.requirements.nurse,
        receptionist: value.requirements.receptionist,
      };
      const normalizedData = {
        ends_at: value.endsAt.toISOString(),
        requirements: requirementsJson,
        shift_id: value.externalShiftId,
        starts_at: value.startsAt.toISOString(),
      } satisfies Prisma.InputJsonObject;
      const existing = await transaction.shift.findUnique({
        where: { externalShiftId: value.externalShiftId },
      });

      if (existing) {
        const exactMatch =
          existing.startsAt.getTime() === value.startsAt.getTime() &&
          existing.endsAt.getTime() === value.endsAt.getTime() &&
          this.requirementsEqual(existing.requirements, value.requirements);

        if (exactMatch) {
          counters.mergedRows += 1;
          await this.createEvidence(transaction, batchId, row, {
            action: "kept_existing",
            explanation: "An identical normalized shift already exists",
            linkedEntity: "Shift",
            linkedRecordId: existing.id,
            normalizedData,
            reasonCode: "EXACT_DUPLICATE",
            status: ImportRowStatus.MERGED,
          });
        } else {
          counters.rejectedRows += 1;
          await this.createEvidence(transaction, batchId, row, {
            action: "rejected",
            explanation:
              "shift_id already exists with different normalized data",
            linkedEntity: "Shift",
            linkedRecordId: existing.id,
            normalizedData,
            reasonCode: "SHIFT_ID_CONFLICT",
            status: ImportRowStatus.REJECTED,
          });
        }
        continue;
      }

      const created = await transaction.shift.create({
        data: {
          endsAt: value.endsAt,
          externalShiftId: value.externalShiftId,
          requirements: requirementsJson,
          startsAt: value.startsAt,
        },
      });

      counters.acceptedRows += 1;
      await this.createEvidence(transaction, batchId, row, {
        action: "inserted",
        explanation: "Shift created",
        linkedEntity: "Shift",
        linkedRecordId: created.id,
        normalizedData,
        status: ImportRowStatus.ACCEPTED,
      });
    }

    return counters;
  }

  private async createEvidence(
    transaction: TransactionClient,
    batchId: string,
    row: ParsedCsvRow,
    result: {
      action: string;
      explanation: string;
      linkedEntity?: string;
      linkedRecordId?: string;
      normalizedData?: Prisma.InputJsonValue;
      reasonCode?: string;
      status: ImportRowStatus;
    },
  ): Promise<void> {
    await transaction.importRow.create({
      data: {
        action: result.action,
        batchId,
        explanation: result.explanation,
        linkedEntity: result.linkedEntity,
        linkedRecordId: result.linkedRecordId,
        normalizedData: result.normalizedData,
        rawData: row.raw,
        reasonCode: result.reasonCode,
        sourceRowNumber: row.rowNumber,
        status: result.status,
      },
    });
  }

  private emptyCounters(): Counters {
    return { acceptedRows: 0, mergedRows: 0, rejectedRows: 0 };
  }

  private requirementsEqual(
    stored: Prisma.JsonValue,
    expected: ShiftRequirements,
  ): boolean {
    if (!stored || Array.isArray(stored) || typeof stored !== "object") {
      return false;
    }

    return (
      stored.doctor === expected.doctor &&
      stored.nurse === expected.nurse &&
      stored.receptionist === expected.receptionist
    );
  }

  private toSummary(batch: {
    acceptedRows: number;
    id: string;
    mergedRows: number;
    rejectedRows: number;
    totalRows: number;
  }): ImportSummary {
    return {
      acceptedRows: batch.acceptedRows,
      batchId: batch.id,
      mergedRows: batch.mergedRows,
      rejectedRows: batch.rejectedRows,
      totalRows: batch.totalRows,
    };
  }
}
