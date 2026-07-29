import type { Prisma } from "../../generated/prisma/client.js";
import { Profession } from "../../generated/prisma/enums.js";

const professionRequirementKey: Record<Profession, string> = {
  [Profession.DOCTOR]: "doctor",
  [Profession.NURSE]: "nurse",
  [Profession.RECEPTIONIST]: "receptionist",
};

export function getProfessionRequirement(
  requirements: Prisma.JsonValue,
  profession: Profession,
): number {
  if (
    !requirements ||
    Array.isArray(requirements) ||
    typeof requirements !== "object"
  ) {
    return 0;
  }

  const value = requirements[professionRequirementKey[profession]];
  return typeof value === "number" ? value : 0;
}

export function getProfessionRequirementKey(
  profession: Profession,
): string {
  return professionRequirementKey[profession];
}
