CREATE SEQUENCE "shifts_external_shift_id_seq"
AS BIGINT
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

SELECT setval(
  'shifts_external_shift_id_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(("external_shift_id")::bigint)
        FROM "shifts"
        WHERE "external_shift_id" ~ '^[0-9]+$'
      ),
      1
    ),
    1
  ),
  EXISTS (
    SELECT 1
    FROM "shifts"
    WHERE "external_shift_id" ~ '^[0-9]+$'
  )
);

UPDATE "shifts"
SET "external_shift_id" = nextval('shifts_external_shift_id_seq')::text
WHERE "external_shift_id" IS NULL;

ALTER TABLE "shifts"
ALTER COLUMN "external_shift_id"
SET DEFAULT (nextval('shifts_external_shift_id_seq'::regclass))::text;

ALTER TABLE "shifts"
ALTER COLUMN "external_shift_id" SET NOT NULL;
