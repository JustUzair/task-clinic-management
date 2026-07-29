import type { RequestHandler } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { ShiftService } from "./shift.service.js";
import {
  createShiftSchema,
  shiftIdSchema,
  updateShiftSchema,
} from "./shift.schemas.js";
import { withPresentedTime } from "./time-presentation.js";

function managerId(request: Parameters<RequestHandler>[0]): string {
  if (!request.auth) {
    throw new UnauthorizedError();
  }

  return request.auth.id;
}

export class ShiftController {
  readonly create: RequestHandler;
  readonly update: RequestHandler;
  readonly cancel: RequestHandler;
  readonly archive: RequestHandler;
  readonly getById: RequestHandler;

  constructor(
    private readonly shifts: ShiftService,
    private readonly timezone: string,
  ) {
    this.create = asyncHandler(async (request, response) => {
      const input = createShiftSchema.parse(request.body);
      const shift = await this.shifts.create(input, managerId(request));
      response.status(201).json({
        data: { shift: withPresentedTime(shift, this.timezone) },
      });
    });

    this.update = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      const input = updateShiftSchema.parse(request.body);
      const shift = await this.shifts.update(
        shiftId,
        input,
        managerId(request),
      );
      response.status(200).json({
        data: { shift: withPresentedTime(shift, this.timezone) },
      });
    });

    this.cancel = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      const shift = await this.shifts.cancel(shiftId, managerId(request));
      response.status(200).json({
        data: { shift: withPresentedTime(shift, this.timezone) },
      });
    });

    this.archive = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      await this.shifts.archive(shiftId, managerId(request));
      response.status(204).send();
    });

    this.getById = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      const shift = await this.shifts.findById(shiftId);
      response.status(200).json({
        data: { shift: withPresentedTime(shift, this.timezone) },
      });
    });
  }
}
