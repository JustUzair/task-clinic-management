CREATE TYPE "NotificationType" AS ENUM (
  'MANAGER_ASSIGNED',
  'MANAGER_UNASSIGNED',
  'SHIFT_CANCELLED',
  'SHIFT_ARCHIVED',
  'ASSIGNMENT_REMOVED_BY_EDIT',
  'IMPORT_FAILED'
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_account_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message_data" JSONB NOT NULL,
    "related_entity" TEXT,
    "related_record_id" TEXT,
    "event_key" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_event_key_key"
ON "notifications"("event_key");
CREATE INDEX "notifications_recipient_ack_created_idx"
ON "notifications"("recipient_account_id", "acknowledged_at", "created_at");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipient_account_id_fkey"
FOREIGN KEY ("recipient_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
