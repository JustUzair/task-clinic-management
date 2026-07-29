CREATE TYPE "AccountRole" AS ENUM ('MANAGER', 'STAFF');
CREATE TYPE "Profession" AS ENUM ('DOCTOR', 'NURSE', 'RECEPTIONIST');

CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "role" "AccountRole" NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "staff_id" VARCHAR(100) NOT NULL,
    "profession" "Profession" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");
CREATE UNIQUE INDEX "staff_profiles_account_id_key" ON "staff_profiles"("account_id");
CREATE UNIQUE INDEX "staff_profiles_staff_id_key" ON "staff_profiles"("staff_id");
CREATE INDEX "staff_profiles_profession_idx" ON "staff_profiles"("profession");

ALTER TABLE "staff_profiles"
ADD CONSTRAINT "staff_profiles_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
