import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import {
  AccountRole,
  AssignmentStatus,
  NotificationType,
  Profession,
  ShiftStatus,
} from "../../generated/prisma/enums.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/app-error.js";
import { normalizeShiftRow } from "../import/shift-normalization.js";
import type { NotificationService } from "../notification/notification.service.js";
import type { SseHub } from "../realtime/sse-hub.js";
import type { ShiftMutationInput } from "./shift.schemas.js";

interface NormalizedMutation {
  endsAt: Date;
  requirements: Prisma.InputJsonObject;
  requirementsByProfession: Record<Profession, number>;
  startsAt: Date;
}

export class ShiftService {
  constructor(
    private readonly database: PrismaClient,
    private readonly notifications: NotificationService,
    private readonly events: SseHub,
    private readonly timezone: string,
  ) {}

  async create(input: ShiftMutationInput, managerAccountId: string) {
    const normalized = this.normalizeInput(input);

    const shift = await this.database.$transaction(async transaction => {
      const now = await this.databaseNow(transaction);
      this.assertFutureStart(normalized.startsAt, now);

      return transaction.shift.create({
        data: {
          createdByAccountId: managerAccountId,
          endsAt: normalized.endsAt,
          requirements: normalized.requirements,
          startsAt: normalized.startsAt,
        },
      });
    });
    this.events.publishToRole(AccountRole.MANAGER, {
      name: "coverage.changed",
      resourceId: shift.id,
    });

    return shift;
  }

  async update(
    shiftId: string,
    input: ShiftMutationInput,
    managerAccountId: string,
  ) {
    const normalized = this.normalizeInput(input);

    const result = await this.database.$transaction(
      async transaction => {
        const now = await this.databaseNow(transaction);
        const shift = await this.lockMutableShift(transaction, shiftId, now);
        this.assertFutureStart(normalized.startsAt, now);
        const activeAssignments = await transaction.assignment.findMany({
          where: { shiftId, status: AssignmentStatus.ACTIVE },
          include: {
            staffProfile: {
              include: { account: true },
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        const notificationAccountIds: string[] = [];

        const updated = await transaction.shift.update({
          where: { id: shift.id },
          data: {
            endsAt: normalized.endsAt,
            requirements: normalized.requirements,
            startsAt: normalized.startsAt,
          },
        });

        const retainedByProfession = new Map<Profession, number>();
        for (const assignment of activeAssignments) {
          const profession = assignment.staffProfile.profession;
          const retained = retainedByProfession.get(profession) ?? 0;
          const capacity =
            normalized.requirementsByProfession[profession] ?? 0;

          if (retained >= capacity) {
            await this.cancelAssignmentForEdit(
              transaction,
              assignment,
              managerAccountId,
              now,
              "SHIFT_EDIT_CAPACITY_REDUCED",
            );
            notificationAccountIds.push(
              assignment.staffProfile.account.id,
            );
            continue;
          }

          const overlap = await transaction.assignment.findFirst({
            where: {
              id: { not: assignment.id },
              staffProfileId: assignment.staffProfileId,
              status: AssignmentStatus.ACTIVE,
              assignmentStartsAt: { lt: normalized.endsAt },
              assignmentEndsAt: { gt: normalized.startsAt },
            },
            select: { id: true },
          });

          if (overlap) {
            await this.cancelAssignmentForEdit(
              transaction,
              assignment,
              managerAccountId,
              now,
              "SHIFT_EDIT_CREATED_OVERLAP",
            );
            notificationAccountIds.push(
              assignment.staffProfile.account.id,
            );
            continue;
          }

          await transaction.assignment.update({
            where: { id: assignment.id },
            data: {
              assignmentEndsAt: normalized.endsAt,
              assignmentStartsAt: normalized.startsAt,
            },
          });
          retainedByProfession.set(profession, retained + 1);
        }

        return {
          affectedAccountIds: activeAssignments.map(
            assignment => assignment.staffProfile.account.id,
          ),
          notificationAccountIds,
          shift: updated,
        };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    this.publishShiftChange(
      result.shift.id,
      result.affectedAccountIds,
      result.notificationAccountIds,
    );
    return result.shift;
  }

  async cancel(shiftId: string, managerAccountId: string) {
    return this.endShift(
      shiftId,
      managerAccountId,
      ShiftStatus.CANCELLED,
      NotificationType.SHIFT_CANCELLED,
    );
  }

  async archive(shiftId: string, managerAccountId: string) {
    return this.endShift(
      shiftId,
      managerAccountId,
      ShiftStatus.ARCHIVED,
      NotificationType.SHIFT_ARCHIVED,
    );
  }

  async findById(shiftId: string) {
    const shift = await this.database.shift.findUnique({
      where: { id: shiftId },
      include: {
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: {
            staffProfile: {
              include: { account: true },
            },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundError("SHIFT_NOT_FOUND", "Shift not found");
    }

    return shift;
  }

  private async endShift(
    shiftId: string,
    managerAccountId: string,
    targetStatus: ShiftStatus,
    notificationType: NotificationType,
  ) {
    const result = await this.database.$transaction(
      async transaction => {
        const now = await this.databaseNow(transaction);
        const shift = await this.lockMutableShift(transaction, shiftId, now);
        const assignments = await transaction.assignment.findMany({
          where: { shiftId, status: AssignmentStatus.ACTIVE },
          include: {
            staffProfile: {
              select: { accountId: true },
            },
          },
        });

        const updated = await transaction.shift.update({
          where: { id: shift.id },
          data:
            targetStatus === ShiftStatus.CANCELLED
              ? {
                  cancelledAt: now,
                  cancelledByAccountId: managerAccountId,
                  status: targetStatus,
                }
              : {
                  archivedAt: now,
                  archivedByAccountId: managerAccountId,
                  status: targetStatus,
                },
        });

        for (const assignment of assignments) {
          await transaction.assignment.update({
            where: { id: assignment.id },
            data: {
              endedAt: now,
              endedByAccountId: managerAccountId,
              endReason: `SHIFT_${targetStatus}`,
              status: AssignmentStatus.CANCELLED,
            },
          });
          await this.notifications.create(transaction, {
            eventKey: `assignment:${assignment.id}:shift:${targetStatus}`,
            messageData: {
              ...(shift.externalShiftId
                ? { externalShiftId: shift.externalShiftId }
                : {}),
              endsAt: shift.endsAt.toISOString(),
              shiftId,
              startsAt: shift.startsAt.toISOString(),
              status: targetStatus,
            },
            recipientAccountId: assignment.staffProfile.accountId,
            relatedEntity: "Shift",
            relatedRecordId: shiftId,
            type: notificationType,
          });
        }

        return {
          affectedAccountIds: assignments.map(
            assignment => assignment.staffProfile.accountId,
          ),
          shift: updated,
        };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    this.publishShiftChange(
      result.shift.id,
      result.affectedAccountIds,
      result.affectedAccountIds,
    );
    return result.shift;
  }

  private async cancelAssignmentForEdit(
    transaction: Prisma.TransactionClient,
    assignment: {
      id: string;
      staffProfile: { account: { id: string } };
    },
    managerAccountId: string,
    now: Date,
    reason: string,
  ): Promise<void> {
    await transaction.assignment.update({
      where: { id: assignment.id },
      data: {
        endedAt: now,
        endedByAccountId: managerAccountId,
        endReason: reason,
        status: AssignmentStatus.CANCELLED,
      },
    });
    await this.notifications.create(transaction, {
      eventKey: `assignment:${assignment.id}:edit-removed`,
      messageData: { reason },
      recipientAccountId: assignment.staffProfile.account.id,
      relatedEntity: "Assignment",
      relatedRecordId: assignment.id,
      type: NotificationType.ASSIGNMENT_REMOVED_BY_EDIT,
    });
  }

  private async lockMutableShift(
    transaction: Prisma.TransactionClient,
    shiftId: string,
    now: Date,
  ) {
    await transaction.$queryRaw`
      SELECT "id"
      FROM "shifts"
      WHERE "id" = ${shiftId}::uuid
      FOR UPDATE
    `;
    const shift = await transaction.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundError("SHIFT_NOT_FOUND", "Shift not found");
    }
    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new ConflictError(
        "SHIFT_NOT_ACTIVE",
        "Only active future shifts can be changed",
      );
    }
    if (shift.startsAt.getTime() <= now.getTime()) {
      throw new ConflictError(
        "SHIFT_IMMUTABLE",
        "Ongoing and completed shifts cannot be changed",
      );
    }

    return shift;
  }

  private async databaseNow(
    transaction: Prisma.TransactionClient,
  ): Promise<Date> {
    const [result] = await transaction.$queryRaw<Array<{ now: Date }>>`
      SELECT CURRENT_TIMESTAMP AS "now"
    `;
    if (!result) {
      throw new Error("Database did not return its current timestamp");
    }

    return result.now;
  }

  private normalizeInput(input: ShiftMutationInput): NormalizedMutation {
    const requirementsText = [
      `doctors=${input.requirements.doctor}`,
      `nurses=${input.requirements.nurse}`,
      `receptionists=${input.requirements.receptionist}`,
    ].join(";");
    const normalized = normalizeShiftRow(
      {
        date: input.date,
        end_time: input.endTime,
        requirements: requirementsText,
        shift_id: "manager-input",
        start_time: input.startTime,
      },
      this.timezone,
    );

    if (!normalized.ok) {
      throw new BadRequestError(
        normalized.reasonCode,
        normalized.message,
      );
    }

    return {
      endsAt: normalized.value.endsAt,
      requirements: {
        doctor: normalized.value.requirements.doctor,
        nurse: normalized.value.requirements.nurse,
        receptionist: normalized.value.requirements.receptionist,
      },
      requirementsByProfession: {
        [Profession.DOCTOR]: normalized.value.requirements.doctor,
        [Profession.NURSE]: normalized.value.requirements.nurse,
        [Profession.RECEPTIONIST]:
          normalized.value.requirements.receptionist,
      },
      startsAt: normalized.value.startsAt,
    };
  }

  private assertFutureStart(startsAt: Date, now: Date): void {
    if (startsAt.getTime() <= now.getTime()) {
      throw new ConflictError(
        "SHIFT_START_NOT_FUTURE",
        "A shift must start after the current clinic time",
      );
    }
  }

  private publishShiftChange(
    shiftId: string,
    affectedAccountIds: string[],
    notificationAccountIds: string[],
  ): void {
    this.events.publishToRole(AccountRole.MANAGER, {
      name: "coverage.changed",
      resourceId: shiftId,
    });

    for (const accountId of new Set(affectedAccountIds)) {
      this.events.publishToAccount(accountId, {
        name: "schedule.changed",
        resourceId: shiftId,
      });
    }

    for (const accountId of new Set(notificationAccountIds)) {
      this.events.publishToAccount(accountId, {
        name: "notification.created",
        resourceId: shiftId,
      });
    }
  }
}
