CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "ImportType" AS ENUM ('STAFF', 'SHIFT');
CREATE TYPE "ImportSource" AS ENUM ('SEED', 'UPLOAD');
CREATE TYPE "ImportBatchStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "ImportRowStatus" AS ENUM ('ACCEPTED', 'MERGED', 'REJECTED');

CREATE TABLE "shifts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_shift_id" VARCHAR(100),
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "requirements" JSONB NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shifts_positive_duration" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE "import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ImportType" NOT NULL,
    "source" "ImportSource" NOT NULL,
    "source_filename" TEXT NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "seed_fingerprint" TEXT,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'RUNNING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "accepted_rows" INTEGER NOT NULL DEFAULT 0,
    "merged_rows" INTEGER NOT NULL DEFAULT 0,
    "rejected_rows" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "created_by_account_id" UUID,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "source_row_number" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "normalized_data" JSONB,
    "status" "ImportRowStatus" NOT NULL,
    "reason_code" TEXT,
    "explanation" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "linked_entity" TEXT,
    "linked_record_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shifts_external_shift_id_key"
ON "shifts"("external_shift_id");
CREATE INDEX "shifts_starts_at_idx" ON "shifts"("starts_at");
CREATE INDEX "shifts_status_starts_at_idx" ON "shifts"("status", "starts_at");
CREATE UNIQUE INDEX "import_batches_seed_fingerprint_key"
ON "import_batches"("seed_fingerprint");
CREATE INDEX "import_batches_source_checksum_idx"
ON "import_batches"("source", "checksum");
CREATE INDEX "import_batches_created_by_account_id_started_at_idx"
ON "import_batches"("created_by_account_id", "started_at");
CREATE UNIQUE INDEX "import_rows_batch_id_source_row_number_key"
ON "import_rows"("batch_id", "source_row_number");
CREATE INDEX "import_rows_batch_id_status_idx"
ON "import_rows"("batch_id", "status");

ALTER TABLE "import_batches"
ADD CONSTRAINT "import_batches_created_by_account_id_fkey"
FOREIGN KEY ("created_by_account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "import_rows"
ADD CONSTRAINT "import_rows_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
