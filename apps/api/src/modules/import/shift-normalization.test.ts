import { describe, expect, it } from "vitest";
import { normalizeShiftRow } from "./shift-normalization.js";

const baseRow = {
  date: "2026-08-07",
  end_time: "17:00",
  requirements: "nurses=3;doctors=2;receptionists=1",
  shift_id: "5017",
  start_time: "09:00",
};

describe("shift normalization", () => {
  it("interprets strict source values in Asia/Kolkata", () => {
    expect(normalizeShiftRow(baseRow)).toEqual({
      ok: true,
      value: {
        endsAt: new Date("2026-08-07T11:30:00.000Z"),
        externalShiftId: "5017",
        requirements: {
          doctor: 2,
          nurse: 3,
          receptionist: 1,
        },
        startsAt: new Date("2026-08-07T03:30:00.000Z"),
      },
    });
  });

  it("moves an earlier end time to the following day", () => {
    const result = normalizeShiftRow({
      ...baseRow,
      end_time: "06:00",
      start_time: "22:00",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        endsAt: new Date("2026-08-08T00:30:00.000Z"),
        startsAt: new Date("2026-08-07T16:30:00.000Z"),
      },
    });
  });

  it.each([
    [{ ...baseRow, date: "05/08/2026" }, "INVALID_DATE"],
    [{ ...baseRow, date: "2026-02-30" }, "INVALID_DATE"],
    [{ ...baseRow, start_time: "" }, "INVALID_START_TIME"],
    [{ ...baseRow, end_time: "10:00+1" }, "INVALID_END_TIME"],
    [
      { ...baseRow, start_time: "12:00", end_time: "12:00" },
      "ZERO_DURATION",
    ],
    [
      { ...baseRow, requirements: "two nurses and a doctor" },
      "INVALID_REQUIREMENTS",
    ],
    [
      { ...baseRow, requirements: "nurses=0;doctors=0" },
      "INVALID_REQUIREMENTS",
    ],
  ])("rejects malformed shift source data", (row, reasonCode) => {
    expect(normalizeShiftRow(row)).toMatchObject({
      ok: false,
      reasonCode,
    });
  });
});
