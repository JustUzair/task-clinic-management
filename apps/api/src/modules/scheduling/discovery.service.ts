import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { AssignmentStatus, ShiftStatus } from "../../generated/prisma/enums.js";
import type { AuthenticatedAccount } from "../identity/identity.types.js";
import { ForbiddenError } from "../../lib/app-error.js";
import {
  getProfessionRequirement,
  getProfessionRequirementKey,
} from "./requirements.js";
import { withPresentedTime } from "./time-presentation.js";

interface StaffDashboardOptions {
  availablePage: number;
  availablePageSize: number;
  historyLimit: number;
}

export class DiscoveryService {
  constructor(
    private readonly database: PrismaClient,
    private readonly timezone: string,
  ) {}

  async getStaffDashboard(
    account: AuthenticatedAccount,
    options: StaffDashboardOptions,
  ) {
    if (!account.staffProfile) {
      throw new ForbiddenError(
        "STAFF_PROFILE_REQUIRED",
        "A staff profile is required to view staff shifts",
      );
    }
    const staffProfile = account.staffProfile;

    const now = await this.databaseNow();
    const requirementKey = getProfessionRequirementKey(
      staffProfile.profession,
    );
    const candidateWhere = {
      startsAt: { gt: now },
      status: ShiftStatus.ACTIVE,
      requirements: {
        path: [requirementKey],
        gt: 0,
      },
    } satisfies Prisma.ShiftWhereInput;
    const [
      candidateShifts,
      availableTotal,
      currentAssignments,
      historicalAssignments,
    ] = await Promise.all([
      this.database.shift.findMany({
        where: candidateWhere,
        include: {
          assignments: {
            where: { status: AssignmentStatus.ACTIVE },
            include: {
              staffProfile: {
                select: { profession: true },
              },
            },
          },
        },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip: (options.availablePage - 1) * options.availablePageSize,
        take: options.availablePageSize,
      }),
      this.database.shift.count({ where: candidateWhere }),
      this.database.assignment.findMany({
        where: {
          staffProfileId: staffProfile.id,
          status: AssignmentStatus.ACTIVE,
          shift: {
            endsAt: { gt: now },
            status: ShiftStatus.ACTIVE,
          },
        },
        include: { shift: true },
        orderBy: [{ assignmentStartsAt: "asc" }, { id: "asc" }],
      }),
      this.database.assignment.findMany({
        where: {
          staffProfileId: staffProfile.id,
          OR: [
            { status: { not: AssignmentStatus.ACTIVE } },
            { shift: { status: { not: ShiftStatus.ACTIVE } } },
            {
              status: AssignmentStatus.ACTIVE,
              shift: {
                endsAt: { lte: now },
                status: ShiftStatus.ACTIVE,
              },
            },
          ],
        },
        include: { shift: true },
        orderBy: [{ assignmentStartsAt: "desc" }, { id: "desc" }],
        take: options.historyLimit,
      }),
    ]);
    const personalAssignments = [
      ...currentAssignments,
      ...historicalAssignments,
    ];
    const activePersonalAssignments = currentAssignments;

    const available = candidateShifts.map(shift => {
      const required = getProfessionRequirement(
        shift.requirements,
        staffProfile.profession,
      );
      const claimed = shift.assignments.filter(
        assignment =>
          assignment.staffProfile.profession ===
          staffProfile.profession,
      ).length;
      const alreadyClaimed = shift.assignments.some(
        assignment =>
          assignment.staffProfileId === staffProfile.id,
      );
      const overlaps = activePersonalAssignments.some(
        assignment =>
          assignment.shiftId !== shift.id &&
          assignment.assignmentStartsAt < shift.endsAt &&
          assignment.assignmentEndsAt > shift.startsAt,
      );
      const disabledReason = alreadyClaimed
        ? "ALREADY_CLAIMED"
        : claimed >= required
          ? "PROFESSION_FULL"
          : overlaps
            ? "OVERLAPPING_ASSIGNMENT"
            : null;

      return {
        claimed,
        disabledReason,
        remaining: Math.max(required - claimed, 0),
        required,
        shift: {
          ...withPresentedTime(shift, this.timezone),
          externalShiftId: shift.externalShiftId,
        },
      };
    });

    const presentAssignment = <T extends {
      shift: { endsAt: Date; externalShiftId: string | null; startsAt: Date };
    }>(
      assignment: T,
    ) => ({
      ...assignment,
      shift: {
        ...withPresentedTime(assignment.shift, this.timezone),
        externalShiftId: assignment.shift.externalShiftId,
      },
    });

    return {
      available,
      availablePagination: {
        page: options.availablePage,
        pageSize: options.availablePageSize,
        total: availableTotal,
        totalPages: Math.max(
          Math.ceil(availableTotal / options.availablePageSize),
          1,
        ),
      },
      cancelled: personalAssignments.filter(
        assignment =>
          assignment.status === AssignmentStatus.CANCELLED ||
          assignment.shift.status !== ShiftStatus.ACTIVE,
      ).map(presentAssignment),
      completed: personalAssignments.filter(
        assignment =>
          assignment.status === AssignmentStatus.ACTIVE &&
          assignment.shift.status === ShiftStatus.ACTIVE &&
          assignment.shift.endsAt <= now,
      ).map(presentAssignment),
      ongoing: personalAssignments.filter(
        assignment =>
          assignment.status === AssignmentStatus.ACTIVE &&
          assignment.shift.status === ShiftStatus.ACTIVE &&
          assignment.shift.startsAt <= now &&
          assignment.shift.endsAt > now,
      ).map(presentAssignment),
      upcoming: personalAssignments.filter(
        assignment =>
          assignment.status === AssignmentStatus.ACTIVE &&
          assignment.shift.status === ShiftStatus.ACTIVE &&
          assignment.shift.startsAt > now,
      ).map(presentAssignment),
    };
  }

  private async databaseNow(): Promise<Date> {
    const [result] = await this.database.$queryRaw<Array<{ now: Date }>>`
      SELECT CURRENT_TIMESTAMP AS "now"
    `;
    if (!result) {
      throw new Error("Database did not return its current timestamp");
    }

    return result.now;
  }
}
