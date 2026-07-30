import { DateTime } from "luxon";
import type { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import {
  AssignmentStatus,
  Profession,
  ShiftStatus,
} from "../../generated/prisma/enums.js";
import { BadRequestError } from "../../lib/app-error.js";
import { getProfessionRequirement } from "./requirements.js";
import { withPresentedTime } from "./time-presentation.js";

const professions = [
  Profession.DOCTOR,
  Profession.NURSE,
  Profession.RECEPTIONIST,
] as const;

const professionResponseKey: Record<Profession, string> = {
  [Profession.DOCTOR]: "doctor",
  [Profession.NURSE]: "nurse",
  [Profession.RECEPTIONIST]: "receptionist",
};

export class CoverageService {
  constructor(
    private readonly database: PrismaClient,
    private readonly timezone: string,
  ) {}

  async getWeek(dateInput?: string) {
    const anchor = dateInput
      ? DateTime.fromFormat(dateInput, "yyyy-MM-dd", {
          locale: "en",
          setZone: true,
          zone: this.timezone,
        })
      : DateTime.now().setZone(this.timezone);

    if (
      !anchor.isValid ||
      (dateInput && anchor.toFormat("yyyy-MM-dd") !== dateInput)
    ) {
      throw new BadRequestError(
        "WEEK_DATE_INVALID",
        "week must be a real date in YYYY-MM-DD format",
      );
    }

    const weekStart = anchor.startOf("week");
    const weekEnd = weekStart.plus({ weeks: 1 });
    const shifts = await this.database.shift.findMany({
      where: {
        startsAt: {
          gte: weekStart.toUTC().toJSDate(),
          lt: weekEnd.toUTC().toJSDate(),
        },
        status: ShiftStatus.ACTIVE,
      },
      include: {
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: {
            staffProfile: {
              select: {
                account: {
                  select: { fullName: true },
                },
                id: true,
                profession: true,
                staffId: true,
              },
            },
          },
        },
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });

    return {
      shifts: shifts.map(shift => this.coverageForShift(shift)),
      weekEnd: weekEnd.minus({ days: 1 }).toFormat("yyyy-MM-dd"),
      weekStart: weekStart.toFormat("yyyy-MM-dd"),
    };
  }

  private coverageForShift(shift: {
    assignments: Array<{
      id: string;
      origin: string;
      staffProfile: {
        account: { fullName: string };
        id: string;
        profession: Profession;
        staffId: string;
      };
    }>;
    endsAt: Date;
    id: string;
    requirements: Prisma.JsonValue;
    startsAt: Date;
    [key: string]: unknown;
  }) {
    const roles = Object.fromEntries(
      professions.map(profession => {
        const required = getProfessionRequirement(
          shift.requirements,
          profession,
        );
        const claimed = shift.assignments.filter(
          assignment =>
            assignment.staffProfile.profession === profession,
        ).length;

        return [
          professionResponseKey[profession],
          {
            claimed,
            missing: Math.max(required - claimed, 0),
            required,
          },
        ];
      }),
    );
    const roleValues = Object.values(roles) as Array<{
      claimed: number;
      missing: number;
      required: number;
    }>;
    const claimedTotal = roleValues.reduce(
      (total, role) => total + role.claimed,
      0,
    );
    const fullyStaffed = roleValues.every(role => role.missing === 0);

    return {
      ...withPresentedTime(shift, this.timezone),
      assignments: shift.assignments.map(assignment => ({
        id: assignment.id,
        origin: assignment.origin,
        staffProfile: assignment.staffProfile,
      })),
      coverageStatus:
        claimedTotal === 0 ? "empty" : fullyStaffed ? "full" : "partial",
      externalShiftId:
        typeof shift.externalShiftId === "string"
          ? shift.externalShiftId
          : null,
      roles,
    };
  }
}
