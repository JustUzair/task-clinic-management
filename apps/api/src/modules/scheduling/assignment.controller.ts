import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { AssignmentService } from "./assignment.service.js";
import { shiftIdSchema } from "./shift.schemas.js";

const assignmentIdSchema = z.uuid();
const managerAssignmentSchema = z.object({
  staffProfileId: z.uuid(),
});

function actor(request: Request) {
  if (!request.auth) {
    throw new UnauthorizedError();
  }

  return request.auth;
}

export class AssignmentController {
  readonly selfClaim: RequestHandler;
  readonly managerAssign: RequestHandler;
  readonly remove: RequestHandler;

  constructor(private readonly assignments: AssignmentService) {
    this.selfClaim = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      const assignment = await this.assignments.selfClaim(
        shiftId,
        actor(request),
      );
      response.status(201).json({ data: { assignment } });
    });

    this.managerAssign = asyncHandler(async (request, response) => {
      const shiftId = shiftIdSchema.parse(request.params.id);
      const input = managerAssignmentSchema.parse(request.body);
      const assignment = await this.assignments.managerAssign(
        shiftId,
        input.staffProfileId,
        actor(request),
      );
      response.status(201).json({ data: { assignment } });
    });

    this.remove = asyncHandler(async (request, response) => {
      const assignmentId = assignmentIdSchema.parse(request.params.id);
      await this.assignments.remove(assignmentId, actor(request));
      response.status(204).send();
    });
  }
}
