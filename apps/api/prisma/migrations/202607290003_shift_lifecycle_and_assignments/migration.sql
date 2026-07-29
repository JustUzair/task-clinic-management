CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "AssignmentOrigin" AS ENUM ('SELF_CLAIMED', 'MANAGER_ASSIGNED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'UNCLAIMED', 'UNASSIGNED', 'CANCELLED');

ALTER TABLE "shifts"
ADD COLUMN "created_by_account_id" UUID,
ADD COLUMN "cancelled_by_account_id" UUID,
ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
ADD COLUMN "archived_by_account_id" UUID,
ADD COLUMN "archived_at" TIMESTAMPTZ(3);

CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shift_id" UUID NOT NULL,
    "staff_profile_id" UUID NOT NULL,
    "origin" "AssignmentOrigin" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignment_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "assignment_ends_at" TIMESTAMPTZ(3) NOT NULL,
    "effective_range" TSTZRANGE GENERATED ALWAYS AS
      (tstzrange("assignment_starts_at", "assignment_ends_at", '[)')) STORED,
    "created_by_account_id" UUID NOT NULL,
    "ended_by_account_id" UUID,
    "ended_at" TIMESTAMPTZ(3),
    "end_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assignments_positive_duration"
      CHECK ("assignment_ends_at" > "assignment_starts_at")
);

CREATE INDEX "assignments_shift_id_status_idx"
ON "assignments"("shift_id", "status");
CREATE INDEX "assignments_staff_profile_id_status_idx"
ON "assignments"("staff_profile_id", "status");
CREATE UNIQUE INDEX "assignments_active_shift_staff_key"
ON "assignments"("shift_id", "staff_profile_id")
WHERE "status" = 'ACTIVE';

ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_no_active_staff_overlap"
EXCLUDE USING GIST (
  "staff_profile_id" WITH =,
  "effective_range" WITH &&
)
WHERE ("status" = 'ACTIVE');

ALTER TABLE "shifts"
ADD CONSTRAINT "shifts_created_by_account_id_fkey"
FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts"
ADD CONSTRAINT "shifts_cancelled_by_account_id_fkey"
FOREIGN KEY ("cancelled_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts"
ADD CONSTRAINT "shifts_archived_by_account_id_fkey"
FOREIGN KEY ("archived_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_shift_id_fkey"
FOREIGN KEY ("shift_id") REFERENCES "shifts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_staff_profile_id_fkey"
FOREIGN KEY ("staff_profile_id") REFERENCES "staff_profiles"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_created_by_account_id_fkey"
FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_ended_by_account_id_fkey"
FOREIGN KEY ("ended_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
