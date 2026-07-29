import type { LocalShiftTime } from "../../features/staff/types";

export function ShiftTime({ time }: { time: LocalShiftTime }) {
  return (
    <span>
      {time.date}, {time.startTime}–{time.endTime}
      {time.overnight ? " (+1 day)" : ""}
    </span>
  );
}
