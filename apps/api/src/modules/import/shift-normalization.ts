import { DateTime } from "luxon";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const requirementAliases: Readonly<Record<string, keyof ShiftRequirements>> = {
  doctor: "doctor",
  doctors: "doctor",
  nurse: "nurse",
  nurses: "nurse",
  receptionist: "receptionist",
  receptionists: "receptionist",
};

export interface RawShiftRow {
  shift_id: string;
  date: string;
  start_time: string;
  end_time: string;
  requirements: string;
}

export interface ShiftRequirements {
  doctor: number;
  nurse: number;
  receptionist: number;
}

export interface NormalizedShift {
  endsAt: Date;
  externalShiftId: string;
  requirements: ShiftRequirements;
  startsAt: Date;
}

export type ShiftNormalizationResult =
  | { ok: true; value: NormalizedShift }
  | {
      ok: false;
      reasonCode:
        | "INVALID_DATE"
        | "INVALID_END_TIME"
        | "INVALID_REQUIREMENTS"
        | "INVALID_START_TIME"
        | "MISSING_SHIFT_ID"
        | "ZERO_DURATION";
      message: string;
    };

function invalid(
  reasonCode: Exclude<ShiftNormalizationResult, { ok: true }>["reasonCode"],
  message: string,
): ShiftNormalizationResult {
  return { ok: false, reasonCode, message };
}

function parseRequirements(raw: string): ShiftRequirements | null {
  const requirements: ShiftRequirements = {
    doctor: 0,
    nurse: 0,
    receptionist: 0,
  };
  const seen = new Set<keyof ShiftRequirements>();
  const parts = raw.split(";").map(part => part.trim());

  if (parts.length === 0 || parts.some(part => !part)) {
    return null;
  }

  for (const part of parts) {
    const match = /^([^=]+)=(\d+)$/.exec(part);
    if (!match) {
      return null;
    }

    const rawKey = match[1]?.trim().toLowerCase();
    const rawValue = match[2];
    const key = rawKey ? requirementAliases[rawKey] : undefined;
    if (!key || !rawValue || seen.has(key)) {
      return null;
    }

    const value = Number(rawValue);
    if (!Number.isSafeInteger(value) || value < 0) {
      return null;
    }

    requirements[key] = value;
    seen.add(key);
  }

  return Object.values(requirements).some(value => value > 0)
    ? requirements
    : null;
}

export function normalizeShiftRow(
  row: RawShiftRow,
  timezone = "Asia/Kolkata",
): ShiftNormalizationResult {
  const externalShiftId = row.shift_id.trim();
  if (!externalShiftId) {
    return invalid("MISSING_SHIFT_ID", "shift_id is required");
  }

  const date = row.date.trim();
  const parsedDate = DateTime.fromFormat(date, "yyyy-MM-dd", {
    locale: "en",
    setZone: true,
    zone: timezone,
  });
  if (
    !datePattern.test(date) ||
    !parsedDate.isValid ||
    parsedDate.toFormat("yyyy-MM-dd") !== date
  ) {
    return invalid(
      "INVALID_DATE",
      "date must be a real calendar date in YYYY-MM-DD format",
    );
  }

  const startTime = row.start_time.trim();
  if (!timePattern.test(startTime)) {
    return invalid(
      "INVALID_START_TIME",
      "start_time must use 24-hour HH:mm format",
    );
  }

  const endTime = row.end_time.trim();
  if (!timePattern.test(endTime)) {
    return invalid(
      "INVALID_END_TIME",
      "end_time must use 24-hour HH:mm format",
    );
  }

  if (startTime === endTime) {
    return invalid(
      "ZERO_DURATION",
      "start_time and end_time cannot be equal",
    );
  }

  const requirements = parseRequirements(row.requirements.trim());
  if (!requirements) {
    return invalid(
      "INVALID_REQUIREMENTS",
      "requirements must contain supported profession=count pairs separated by semicolons",
    );
  }

  const startsAt = DateTime.fromFormat(
    `${date} ${startTime}`,
    "yyyy-MM-dd HH:mm",
    { locale: "en", setZone: true, zone: timezone },
  );
  let endsAt = DateTime.fromFormat(
    `${date} ${endTime}`,
    "yyyy-MM-dd HH:mm",
    { locale: "en", setZone: true, zone: timezone },
  );

  if (endsAt < startsAt) {
    endsAt = endsAt.plus({ days: 1 });
  }

  return {
    ok: true,
    value: {
      endsAt: endsAt.toUTC().toJSDate(),
      externalShiftId,
      requirements,
      startsAt: startsAt.toUTC().toJSDate(),
    },
  };
}
