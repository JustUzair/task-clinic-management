import type { RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { DiscoveryService } from "./discovery.service.js";

const dashboardQuerySchema = z.object({
  availablePage: z.coerce.number().int().positive().default(1),
  availablePageSize: z.coerce.number().int().min(5).max(50).default(20),
  historyLimit: z.coerce.number().int().min(10).max(100).default(50),
});

export class DiscoveryController {
  readonly dashboard: RequestHandler;

  constructor(private readonly discovery: DiscoveryService) {
    this.dashboard = asyncHandler(async (request, response) => {
      if (!request.auth) {
        throw new UnauthorizedError();
      }

      const query = dashboardQuerySchema.parse(request.query);
      const dashboard = await this.discovery.getStaffDashboard(
        request.auth,
        query,
      );
      response.status(200).json({ data: dashboard });
    });
  }
}
