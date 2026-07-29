import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import type { CoverageService } from "./coverage.service.js";

const querySchema = z.object({
  week: z.string().optional(),
});

export class CoverageController {
  readonly week: RequestHandler;

  constructor(private readonly coverage: CoverageService) {
    this.week = asyncHandler(async (request, response) => {
      const query = querySchema.parse(request.query);
      const week = await this.coverage.getWeek(query.week);
      response.status(200).json({ data: week });
    });
  }
}
