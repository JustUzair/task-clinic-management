import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Expected 24-hour HH:mm");

export const shiftRequirementsSchema = z
  .object({
    doctor: z.number().int().nonnegative().default(0),
    nurse: z.number().int().nonnegative().default(0),
    receptionist: z.number().int().nonnegative().default(0),
  })
  .strict()
  .refine(value => Object.values(value).some(required => required > 0), {
    message: "At least one profession must have a positive requirement",
  });

export const createShiftSchema = z.object({
  date: z.string(),
  endTime: timeSchema,
  requirements: shiftRequirementsSchema,
  startTime: timeSchema,
});

export const updateShiftSchema = createShiftSchema;

export const shiftIdSchema = z.uuid();

export type ShiftMutationInput = z.infer<typeof createShiftSchema>;
