# Expected results — CSV import test files

Upload each through the manager Import panel (not the seed) and compare the
Import Report against this. All six files are new IDs — none collide with
`data/staff.csv` / `data/shifts.csv`, so they're safe to run against your
already-seeded database.

## test-1-happy-staff.csv → expect 5 accepted, 0 merged, 0 rejected
Confirms plain inserts work. `RN` and `MD` are aliases exercised on the happy
path too, so this alone tells you normalization runs even when nothing's wrong.

## test-2-happy-shifts.csv → expect 5 accepted, 0 merged, 0 rejected
Row `9104` is dated 2026-01-15 — in the past relative to today. Import has no
future-only check (that's a `ShiftService.create` rule, not an import rule),
so this should still be **accepted**. If it's rejected, the two code paths
have drifted apart.

## test-3-constraints-staff.csv → expect 4 accepted, 1 merged, 7 rejected

| Row (staff_id) | Expected outcome | Reason code |
|---|---|---|
| 9200 (1st) | Accepted | — |
| 9200 (2nd, identical) | Merged | `EXACT_DUPLICATE` |
| 9200 (3rd, different role/email) | Rejected | `STAFF_ID_CONFLICT` |
| 9202 (reuses 9200's email) | Rejected | `EMAIL_CONFLICT` |
| blank staff_id | Rejected | `MISSING_STAFF_ID` |
| 9203 (blank name) | Rejected | `MISSING_FULL_NAME` |
| 9204 ("Janitor") | Rejected | `UNKNOWN_PROFESSION` |
| 9205 ("not-an-email") | Rejected | `INVALID_EMAIL` |
| 9206 (blank email) | Rejected | `INVALID_EMAIL` |
| 9207 ("  Karan   Patel  ") | **Accepted**, stored as `Karan Patel` | — (whitespace collapsed) |
| 9208 ("  registered nurse ") | **Accepted**, stored as NURSE | — (alias + case + spacing) |
| 9209 (uppercase email) | **Accepted**, stored lowercase | — |
| 9210 (5 columns, not 4) | Rejected | `COLUMN_COUNT_MISMATCH` |

## test-4-constraints-shifts.csv → expect 3 accepted, 1 merged, 10 rejected

| Row (shift_id) | Expected outcome | Reason code |
|---|---|---|
| 9300 (1st) | Accepted | — |
| 9300 (2nd, identical) | Merged | `EXACT_DUPLICATE` |
| 9300 (3rd, different time) | Rejected | `SHIFT_ID_CONFLICT` |
| blank shift_id | Rejected | `MISSING_SHIFT_ID` |
| 9301 ("10/09/2026") | Rejected | `INVALID_DATE` (wrong format) |
| 9302 ("2026-02-30") | Rejected | `INVALID_DATE` (not a real day) |
| 9303 (blank start_time) | Rejected | `INVALID_START_TIME` |
| 9304 ("9pm") | Rejected | `INVALID_END_TIME` |
| 9305 (09:00–09:00) | Rejected | `ZERO_DURATION` |
| 9306 ("two nurses") | Rejected | `INVALID_REQUIREMENTS` |
| 9307 ("nurses=1;nurses=2") | Rejected | `INVALID_REQUIREMENTS` (repeated key) |
| 9308 (22:00→06:00) | **Accepted**, end date rolled +1 day | — (overnight shift) |
| 9309 (2026-01-01, past) | **Accepted** | — (import allows past dates) |
| 9310 (6 columns, not 5) | Rejected | `COLUMN_COUNT_MISMATCH` |

## test-5-bad-headers-staff.csv and test-6-bad-headers-shifts.csv
Expect the **upload itself to fail** with a 400 (`IMPORT_HEADERS_INVALID`)
before any row is processed — no Import Report batch should be created at
all for these two. This checks the "reject the whole file" path, which is a
different code path from every rejection above (those all still produce a
successful batch with per-row evidence).

---

### What this does *not* test
Profession-capacity and staff-overlap enforcement (the `EXCLUDE` constraint
and row-locking) never run during CSV import — shifts are created with no
one claimed yet. To exercise those, you need two real claim attempts against
the same shift/staff through the UI or API (e.g. two browser sessions, or
`pnpm test:database`, which already does this under real concurrency).
