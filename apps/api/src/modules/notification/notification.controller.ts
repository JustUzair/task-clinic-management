import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler.js";
import { UnauthorizedError } from "../../lib/app-error.js";
import type { NotificationService } from "./notification.service.js";

const notificationIdSchema = z.uuid();

function accountId(request: Request): string {
  if (!request.auth) {
    throw new UnauthorizedError();
  }

  return request.auth.id;
}

export class NotificationController {
  readonly listUnacknowledged: RequestHandler;
  readonly acknowledge: RequestHandler;

  constructor(private readonly notifications: NotificationService) {
    this.listUnacknowledged = asyncHandler(async (request, response) => {
      const items = await this.notifications.listUnacknowledged(
        accountId(request),
      );
      response.status(200).json({ data: { notifications: items } });
    });

    this.acknowledge = asyncHandler(async (request, response) => {
      const notificationId = notificationIdSchema.parse(request.params.id);
      await this.notifications.acknowledge(
        notificationId,
        accountId(request),
      );
      response.status(204).send();
    });
  }
}
