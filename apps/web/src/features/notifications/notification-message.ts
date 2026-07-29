export interface NotificationItem {
  id: string;
  messageData: Record<string, unknown>;
  type: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
  weekday: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export function notificationMessage(notification: NotificationItem): string {
  if (notification.type === "MANAGER_ASSIGNED") {
    return managerAssignmentMessage(notification);
  }

  if (
    notification.type === "SHIFT_CANCELLED" ||
    notification.type === "SHIFT_ARCHIVED"
  ) {
    return shiftLifecycleMessage(notification);
  }

  return notification.type.replaceAll("_", " ").toLowerCase();
}

function managerAssignmentMessage(notification: NotificationItem): string {
  const startsAt = dateFrom(notification.messageData.startsAt);
  const endsAt = dateFrom(notification.messageData.endsAt);
  const externalShiftId = stringFrom(
    notification.messageData.externalShiftId,
  );
  const subject = externalShiftId
    ? `shift ${externalShiftId}`
    : "a shift";

  if (!startsAt || !endsAt) {
    return `Your manager assigned you to ${subject}.`;
  }

  return `Your manager assigned you to ${subject} on ${formatRange(
    startsAt,
    endsAt,
  )}.`;
}

function shiftLifecycleMessage(notification: NotificationItem): string {
  const startsAt = dateFrom(notification.messageData.startsAt);
  const endsAt = dateFrom(notification.messageData.endsAt);
  const externalShiftId = stringFrom(
    notification.messageData.externalShiftId,
  );
  const subject = externalShiftId ? `Shift ${externalShiftId}` : "Your shift";
  const action =
    notification.type === "SHIFT_CANCELLED" ? "cancelled" : "archived";

  if (!startsAt || !endsAt) {
    return `${subject} was ${action}.`;
  }

  return `${subject}, scheduled for ${formatRange(
    startsAt,
    endsAt,
  )}, was ${action}.`;
}

function formatRange(startsAt: Date, endsAt: Date): string {
  const startDate = dateFormatter.format(startsAt);
  const endDate = dateFormatter.format(endsAt);
  const startTime = timeFormatter.format(startsAt);
  const endTime = timeFormatter.format(endsAt);
  const end = startDate === endDate ? endTime : `${endDate}, ${endTime}`;

  return `${startDate}, ${startTime}–${end} IST`;
}

function dateFrom(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
