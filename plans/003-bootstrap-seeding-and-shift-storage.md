# Plan 003: Bootstrap seeding and shift storage

Status: accepted during the system-rules grilling; implementation has not
started.

## Bootstrap behavior

1. Apply committed Prisma migrations before serving traffic.
2. Acquire a database-level bootstrap guard so concurrent instances cannot seed
   the same fixture together.
3. Hash `staff.csv` and `shifts.csv` and create one import batch per unseen
   source/checksum.
4. Run both files through the same importer used by manager uploads.
5. Persist accepted domain records and row-level accepted, merged, or rejected
   evidence.
6. Mark the seed version complete. Later boots skip completed checksums.

Malformed source rows are recorded and do not prevent valid rows from loading.
A database, migration, or importer-system failure must not be mistaken for a
successful seed. A systemic failure terminates startup or leaves the instance
not ready; it must not serve application traffic.

## Staff storage and normalization

- `Account`: internal UUID, normalized unique email, display name, and
  `MANAGER | STAFF` access role.
- `StaffProfile`: account relation, unique imported `staff_id`, and strict
  `DOCTOR | NURSE | RECEPTIONIST` profession.
- Managers are seeded Accounts without StaffProfiles, so `staff_id` is not
  nullable on StaffProfile. The earlier nullable comment applied only to the
  rejected single-table design.
- Trim whitespace and lowercase emails, profession aliases, and requirement
  keys. Preserve a cleaned display name instead of lowercasing a person's name.
- Preserve every raw row and raw role value in its ImportRow evidence.

## Shift storage

- Accept shift dates only as strict `YYYY-MM-DD`; alternate date shapes are
  rejected rather than normalized. Interpret valid dates and 24-hour times in
  India Standard Time (`Asia/Kolkata`).
- When `end_time` is earlier than `start_time`, set `ends_at` on the following
  day. Do not impose a maximum duration.
- Reject equal start and end times as zero-duration instead of assuming a
  24-hour shift.
- Store canonical `starts_at` and `ends_at` timestamps.
- Present shifts in IST as the same local date and 24-hour `HH:mm` values, with
  a next-day indicator for overnight shifts.
- Parse semicolon requirements into validated JSONB using canonical singular
  keys, for example:

  ```json
  {"nurse": 3, "doctor": 2, "receptionist": 1}
  ```

- Every value must be a non-negative integer, every key must be supported, and
  at least one value must be greater than zero.

## Planned indexes

- unique Account email;
- unique StaffProfile `staff_id`;
- Shift `starts_at` for week-range queries;
- Claim `shift_id` and `account_id`, plus unique `(shift_id, account_id)`;
- the database range index/constraint used for staff overlap protection;
- ImportRow `batch_id` and ImportBatch source/checksum.

A JSONB GIN index is not added by default because the core reads requirements
after locating shifts by ID or week; it will be added only if containment
queries become a measured access path.

## Prisma and Supabase

Use the PostgreSQL provider with Prisma 7 configuration in `prisma.config.ts`,
the generated Prisma client with an explicit output path, and the PostgreSQL
driver adapter. Reuse one Prisma client per process to protect Supabase
connection capacity.
