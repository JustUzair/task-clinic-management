import { z } from "zod";
import { Profession } from "../../generated/prisma/enums.js";

const professionAliases: Readonly<Record<string, Profession>> = {
  doctor: Profession.DOCTOR,
  md: Profession.DOCTOR,
  physician: Profession.DOCTOR,
  nurse: Profession.NURSE,
  rn: Profession.NURSE,
  "registered nurse": Profession.NURSE,
  reception: Profession.RECEPTIONIST,
  receptionist: Profession.RECEPTIONIST,
  "recep.": Profession.RECEPTIONIST,
};

const emailSchema = z.string().trim().toLowerCase().email().max(320);

export interface RawStaffRow {
  staff_id: string;
  full_name: string;
  role: string;
  email: string;
}

export type StaffNormalizationResult =
  | {
      ok: true;
      value: {
        staff_id: string;
        full_name: string;
        role: Profession;
        email: string;
      };
    }
  | {
      ok: false;
      reasonCode:
        | "INVALID_EMAIL"
        | "MISSING_FULL_NAME"
        | "MISSING_STAFF_ID"
        | "UNKNOWN_PROFESSION";
      message: string;
    };

function normalizeSpacing(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeProfession(value: string): Profession | null {
  return professionAliases[normalizeSpacing(value).toLowerCase()] ?? null;
}

export function normalizeStaffRow(
  row: RawStaffRow,
): StaffNormalizationResult {
  const staffId = normalizeSpacing(row.staff_id);
  if (!staffId) {
    return {
      ok: false,
      reasonCode: "MISSING_STAFF_ID",
      message: "staff_id is required",
    };
  }

  const fullName = normalizeSpacing(row.full_name);
  if (!fullName) {
    return {
      ok: false,
      reasonCode: "MISSING_FULL_NAME",
      message: "full_name is required",
    };
  }

  const profession = normalizeProfession(row.role);
  if (!profession) {
    return {
      ok: false,
      reasonCode: "UNKNOWN_PROFESSION",
      message: `Unsupported staff role: ${row.role}`,
    };
  }

  const emailResult = emailSchema.safeParse(row.email);
  if (!emailResult.success) {
    return {
      ok: false,
      reasonCode: "INVALID_EMAIL",
      message: `Invalid email address: ${row.email}`,
    };
  }

  return {
    ok: true,
    value: {
      email: emailResult.data,
      full_name: fullName,
      role: profession,
      staff_id: staffId,
    },
  };
}
