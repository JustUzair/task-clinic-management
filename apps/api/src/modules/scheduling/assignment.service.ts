import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import {
  AccountRole,
  AssignmentOrigin,
  AssignmentStatus,
  NotificationType,
  ShiftStatus,
} from "../../generated/prisma/enums.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/app-error.js";
import type { AuthenticatedAccount } from "../identity/identity.types.js";
import type { NotificationService } from "../notification/notification.service.js";
import type { SseHub } from "../realtime/sse-hub.js";
import { getProfessionRequirement } from "./requirements.js";

export class AssignmentService {
  constructor(
    private readonly database: PrismaClient,
    private readonly notifications: NotificationService,
    private readonly events: SseHub,
  ) {}

  async selfClaim(shiftId: string, actor: AuthenticatedAccount) {
    if (!actor.staffProfile) {
      throw new ForbiddenError(
        "STAFF_PROFILE_REQUIRED",
        "A staff profile is required to claim a shift",
      );
    }

    return this.assign(
      shiftId,
      actor.staffProfile.id,
      actor.id,
      AssignmentOrigin.SELF_CLAIMED,
    );
  }

  async managerAssign(
    shiftId: string,
    staffProfileId: string,
    actor: AuthenticatedAccount,
  ) {
    if (actor.role !== AccountRole.MANAGER) {
      throw new ForbiddenError(
        "ROLE_FORBIDDEN",
        "Only managers can assign another staff member",
      );
    }

    return this.assign(
      shiftId,
      staffProfileId,
      actor.id,
      AssignmentOrigin.MANAGER_ASSIGNED,
    );
  }

  async remove(assignmentId: string, actor: AuthenticatedAccount) {
    const candidate = await this.database.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        shiftId: true,
        staffProfileId: true,
      },
    });
    if (!candidate) {
      throw new NotFoundError(
        "ASSIGNMENT_NOT_FOUND",
        "Assignment not found",
      );
    }

    const result = await this.database.$transaction(
      async transaction => {
        await this.lockShift(transaction, candidate.shiftId);
        await this.lockStaff(transaction, candidate.staffProfileId);
        await transaction.$queryRaw`
          SELECT "id"
          FROM "assignments"
          WHERE "id" = ${assignmentId}::uuid
          FOR UPDATE
        `;

        const now = await this.databaseNow(transaction);
        const assignment = await transaction.assignment.findUnique({
          where: { id: assignmentId },
          include: {
            shift: true,
            staffProfile: true,
          },
        });
        if (!assignment) {
          throw new NotFoundError(
            "ASSIGNMENT_NOT_FOUND",
            "Assignment not found",
          );
        }
        if (assignment.status !== AssignmentStatus.ACTIVE) {
          throw new ConflictError(
            "ASSIGNMENT_NOT_ACTIVE",
            "Only an active assignment can be removed",
          );
        }
        if (assignment.shift.startsAt <= now) {
          throw new ConflictError(
            "SHIFT_IMMUTABLE",
            "Assignments cannot change after the shift starts",
          );
        }

        const managerAction = actor.role === AccountRole.MANAGER;
        if (!managerAction) {
          if (
            !actor.staffProfile ||
            actor.staffProfile.id !== assignment.staffProfileId
          ) {
            throw new ForbiddenError(
              "ASSIGNMENT_NOT_OWNED",
              "Staff can only unclaim their own assignment",
            );
          }
          if (assignment.origin !== AssignmentOrigin.SELF_CLAIMED) {
            throw new ForbiddenError(
              "MANAGER_ASSIGNMENT_LOCKED",
              "Staff cannot unclaim a manager-created assignment",
            );
          }
        }

        const updated = await transaction.assignment.update({
          where: { id: assignment.id },
          data: {
            endedAt: now,
            endedByAccountId: actor.id,
            endReason: managerAction
              ? "MANAGER_UNASSIGNED"
              : "STAFF_UNCLAIMED",
            status: managerAction
              ? AssignmentStatus.UNASSIGNED
              : AssignmentStatus.UNCLAIMED,
          },
        });

        if (managerAction) {
          await this.notifications.create(transaction, {
            eventKey: `assignment:${assignment.id}:manager-unassigned`,
            messageData: {
              assignmentId: assignment.id,
              shiftId: assignment.shiftId,
            },
            recipientAccountId: assignment.staffProfile.accountId,
            relatedEntity: "Assignment",
            relatedRecordId: assignment.id,
            type: NotificationType.MANAGER_UNASSIGNED,
          });
        }

        return {
          assignment: updated,
          managerAction,
          recipientAccountId: assignment.staffProfile.accountId,
          shiftId: assignment.shiftId,
        };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    this.publishAssignmentChange(
      result.shiftId,
      result.recipientAccountId,
      result.managerAction,
    );
    return result.assignment;
  }

  private async assign(
    shiftId: string,
    staffProfileId: string,
    createdByAccountId: string,
    origin: AssignmentOrigin,
  ) {
    try {
      const result = await this.database.$transaction(
        async transaction => {
          await this.lockShift(transaction, shiftId);
          await this.lockStaff(transaction, staffProfileId);
          const now = await this.databaseNow(transaction);
          const [shift, staffProfile] = await Promise.all([
            transaction.shift.findUnique({ where: { id: shiftId } }),
            transaction.staffProfile.findUnique({
              where: { id: staffProfileId },
            }),
          ]);

          if (!shift) {
            throw new NotFoundError("SHIFT_NOT_FOUND", "Shift not found");
          }
          if (!staffProfile) {
            throw new NotFoundError(
              "STAFF_PROFILE_NOT_FOUND",
              "Staff profile not found",
            );
          }
          if (
            shift.status !== ShiftStatus.ACTIVE ||
            shift.startsAt <= now
          ) {
            throw new ConflictError(
              "SHIFT_NOT_CLAIMABLE",
              "Only active future shifts can be claimed",
            );
          }

          const required = getProfessionRequirement(
            shift.requirements,
            staffProfile.profession,
          );
          if (required <= 0) {
            throw new ConflictError(
              "PROFESSION_NOT_REQUIRED",
              "This shift does not require the staff member's profession",
            );
          }

          const duplicate = await transaction.assignment.findFirst({
            where: {
              shiftId,
              staffProfileId,
              status: AssignmentStatus.ACTIVE,
            },
            select: { id: true },
          });
          if (duplicate) {
            throw new ConflictError(
              "ASSIGNMENT_DUPLICATE",
              "This staff member already has the shift",
            );
          }

          const claimed = await transaction.assignment.count({
            where: {
              shiftId,
              status: AssignmentStatus.ACTIVE,
              staffProfile: {
                profession: staffProfile.profession,
              },
            },
          });
          if (claimed >= required) {
            throw new ConflictError(
              "PROFESSION_CAPACITY_FULL",
              "This shift already has enough staff for that profession",
            );
          }

          const overlap = await transaction.assignment.findFirst({
            where: {
              staffProfileId,
              status: AssignmentStatus.ACTIVE,
              assignmentStartsAt: { lt: shift.endsAt },
              assignmentEndsAt: { gt: shift.startsAt },
            },
            select: { id: true, shiftId: true },
          });
          if (overlap) {
            throw new ConflictError(
              "ASSIGNMENT_OVERLAP",
              "This staff member already has an overlapping shift",
              { conflictingShiftId: overlap.shiftId },
            );
          }

          const assignment = await transaction.assignment.create({
            data: {
              assignmentEndsAt: shift.endsAt,
              assignmentStartsAt: shift.startsAt,
              createdByAccountId,
              origin,
              shiftId,
              staffProfileId,
            },
          });

          if (origin === AssignmentOrigin.MANAGER_ASSIGNED) {
            await this.notifications.create(transaction, {
              eventKey: `assignment:${assignment.id}:manager-assigned`,
              messageData: {
                assignmentId: assignment.id,
                shiftId,
              },
              recipientAccountId: staffProfile.accountId,
              relatedEntity: "Assignment",
              relatedRecordId: assignment.id,
              type: NotificationType.MANAGER_ASSIGNED,
            });
          }

          return {
            assignment,
            recipientAccountId: staffProfile.accountId,
          };
        },
        { maxWait: 10_000, timeout: 30_000 },
      );

      this.publishAssignmentChange(
        shiftId,
        result.recipientAccountId,
        origin === AssignmentOrigin.MANAGER_ASSIGNED,
      );
      return result.assignment;
    } catch (error) {
      if (this.isConstraintConflict(error)) {
        throw new ConflictError(
          "ASSIGNMENT_CONFLICT",
          "The assignment conflicts with current capacity, overlap, or duplicate rules",
        );
      }
      throw error;
    }
  }

  private publishAssignmentChange(
    shiftId: string,
    recipientAccountId: string,
    notificationCreated: boolean,
  ): void {
    this.events.publishToRole(AccountRole.MANAGER, {
      name: "coverage.changed",
      resourceId: shiftId,
    });
    this.events.publishToAccount(recipientAccountId, {
      name: "schedule.changed",
      resourceId: shiftId,
    });
    if (notificationCreated) {
      this.events.publishToAccount(recipientAccountId, {
        name: "notification.created",
        resourceId: shiftId,
      });
    }
  }

  private async lockShift(
    transaction: Prisma.TransactionClient,
    shiftId: string,
  ): Promise<void> {
    await transaction.$queryRaw`
      SELECT "id" FROM "shifts"
      WHERE "id" = ${shiftId}::uuid
      FOR UPDATE
    `;
  }

  private async lockStaff(
    transaction: Prisma.TransactionClient,
    staffProfileId: string,
  ): Promise<void> {
    await transaction.$queryRaw`
      SELECT "id" FROM "staff_profiles"
      WHERE "id" = ${staffProfileId}::uuid
      FOR UPDATE
    `;
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

  private isConstraintConflict(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "P2002" || error.code === "P2004")
    );
  }
}
