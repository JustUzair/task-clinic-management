import { DateTime } from "luxon";

export interface ShiftTimePresentation {
  date: string;
  endDate: string;
  endTime: string;
  overnight: boolean;
  startTime: string;
}

export function presentShiftTime(
  startsAt: Date,
  endsAt: Date,
  timezone: string,
): ShiftTimePresentation {
  const start = DateTime.fromJSDate(startsAt, { zone: "utc" }).setZone(
    timezone,
  );
  const end = DateTime.fromJSDate(endsAt, { zone: "utc" }).setZone(timezone);
  const date = start.toFormat("yyyy-MM-dd");
  const endDate = end.toFormat("yyyy-MM-dd");

  return {
    date,
    endDate,
    endTime: end.toFormat("HH:mm"),
    overnight: date !== endDate,
    startTime: start.toFormat("HH:mm"),
  };
}

export function withPresentedTime<T extends { endsAt: Date; startsAt: Date }>(
  value: T,
  timezone: string,
): T & { localTime: ShiftTimePresentation } {
  return {
    ...value,
    localTime: presentShiftTime(value.startsAt, value.endsAt, timezone),
  };
}
