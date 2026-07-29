import type {
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client.js";
import { NotificationType } from "../../generated/prisma/enums.js";
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
    const notifications = await this.database.notification.findMany({
      where: {
        acknowledgedAt: null,
        recipientAccountId,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const shiftIds = notifications.flatMap(notification =>
      this.isShiftLifecycleNotification(notification) &&
      notification.relatedRecordId
        ? [notification.relatedRecordId]
        : [],
    );
    const assignmentIds = notifications.flatMap(notification =>
      notification.type === NotificationType.MANAGER_ASSIGNED &&
      notification.relatedEntity === "Assignment" &&
      notification.relatedRecordId
        ? [notification.relatedRecordId]
        : [],
    );
    if (shiftIds.length === 0 && assignmentIds.length === 0) {
      return notifications;
    }

    const shiftSelection = {
      endsAt: true,
      externalShiftId: true,
      id: true,
      startsAt: true,
    } satisfies Prisma.ShiftSelect;
    const [shifts, assignments] = await Promise.all([
      this.database.shift.findMany({
        where: { id: { in: shiftIds } },
        select: shiftSelection,
      }),
      this.database.assignment.findMany({
        where: { id: { in: assignmentIds } },
        select: {
          id: true,
          shift: { select: shiftSelection },
        },
      }),
    ]);
    const shiftsById = new Map(shifts.map(shift => [shift.id, shift]));
    const shiftsByAssignmentId = new Map(
      assignments.map(assignment => [assignment.id, assignment.shift]),
    );

    return notifications.map(notification => {
      const shift = notification.relatedRecordId
        ? this.isShiftLifecycleNotification(notification)
          ? shiftsById.get(notification.relatedRecordId)
          : shiftsByAssignmentId.get(notification.relatedRecordId)
        : undefined;
      if (!shift) return notification;

      const existingData =
        typeof notification.messageData === "object" &&
        notification.messageData !== null &&
        !Array.isArray(notification.messageData)
          ? notification.messageData
          : {};

      return {
        ...notification,
        messageData: {
          ...existingData,
          ...(shift.externalShiftId
            ? { externalShiftId: shift.externalShiftId }
            : {}),
          endsAt: shift.endsAt.toISOString(),
          shiftId: shift.id,
          startsAt: shift.startsAt.toISOString(),
        },
      };
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

  private isShiftLifecycleNotification(notification: {
    relatedEntity: string | null;
    type: NotificationType;
  }): boolean {
    return (
      notification.relatedEntity === "Shift" &&
      (notification.type === NotificationType.SHIFT_CANCELLED ||
        notification.type === NotificationType.SHIFT_ARCHIVED)
    );
  }
}
