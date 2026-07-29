import { describe, expect, it } from "vitest";
import { Profession } from "../../generated/prisma/enums.js";
import {
  normalizeProfession,
  normalizeStaffRow,
} from "./staff-normalization.js";

describe("staff normalization", () => {
  it.each([
    ["Doctor", Profession.DOCTOR],
    [" Physician ", Profession.DOCTOR],
    ["MD", Profession.DOCTOR],
    ["NURSE", Profession.NURSE],
    ["RN", Profession.NURSE],
    ["Registered Nurse", Profession.NURSE],
    ["receptionist", Profession.RECEPTIONIST],
    ["Reception", Profession.RECEPTIONIST],
    ["recep.", Profession.RECEPTIONIST],
  ])("normalizes the known role alias %s", (raw, expected) => {
    expect(normalizeProfession(raw)).toBe(expected);
  });

  it("preserves name casing while trimming whitespace", () => {
    expect(
      normalizeStaffRow({
        email: "  Karan.Ali@ClinicMail.Test ",
        full_name: "  Karan   ALI ",
        role: "Reception",
        staff_id: " 133 ",
      }),
    ).toEqual({
      ok: true,
      value: {
        email: "karan.ali@clinicmail.test",
        full_name: "Karan ALI",
        role: Profession.RECEPTIONIST,
        staff_id: "133",
      },
    });
  });

  it.each([
    [
      {
        email: "priya.weber(at)clinicmail.test",
        full_name: "Priya Weber",
        role: "Doctor",
        staff_id: "122",
      },
      "INVALID_EMAIL",
    ],
    [
      {
        email: "casey.morgan@clinicmail.test",
        full_name: "Casey Morgan",
        role: "Janitor",
        staff_id: "997",
      },
      "UNKNOWN_PROFESSION",
    ],
    [
      {
        email: "noname@clinicmail.test",
        full_name: "",
        role: "Doctor",
        staff_id: "996",
      },
      "MISSING_FULL_NAME",
    ],
  ])("rejects invalid imported staff data", (row, reasonCode) => {
    expect(normalizeStaffRow(row)).toMatchObject({
      ok: false,
      reasonCode,
    });
  });
});
