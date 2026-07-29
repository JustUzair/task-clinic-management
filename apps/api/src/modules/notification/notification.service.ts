import type {
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client.js";
import type { NotificationType } from "../../generated/prisma/enums.js";
import { NotFoundError } from "../../lib/app-error.js";

export interface CreateNotificationInput {
  eventKey: string;
  messageData: Prisma.InputJsonObject;
  recipientAccountId: string;
  relatedEntity?: string;
  relatedRecordId?: string;
  type: NotificationType;
}

export class NotificationService {
  constructor(private readonly database: PrismaClient) {}

  async create(
    transaction: Prisma.TransactionClient,
    input: CreateNotificationInput,
  ): Promise<void> {
    await transaction.notification.upsert({
      where: { eventKey: input.eventKey },
      create: input,
      update: {},
    });
  }

  async listUnacknowledged(recipientAccountId: string) {
    return this.database.notification.findMany({
      where: {
        acknowledgedAt: null,
        recipientAccountId,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  async acknowledge(
    notificationId: string,
    recipientAccountId: string,
  ): Promise<void> {
    const result = await this.database.notification.updateMany({
      where: {
        acknowledgedAt: null,
        id: notificationId,
        recipientAccountId,
      },
      data: { acknowledgedAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundError(
        "NOTIFICATION_NOT_FOUND",
        "Unacknowledged notification not found",
      );
    }
  }
}
