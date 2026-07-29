import type { RequestHandler } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { DiscoveryService } from "./discovery.service.js";

export class DiscoveryController {
  readonly dashboard: RequestHandler;

  constructor(private readonly discovery: DiscoveryService) {
    this.dashboard = asyncHandler(async (request, response) => {
      if (!request.auth) {
        throw new UnauthorizedError();
      }

      const dashboard = await this.discovery.getStaffDashboard(request.auth);
      response.status(200).json({ data: dashboard });
    });
  }
}
