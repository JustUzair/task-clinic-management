# Plan 011: Non-overwriting imports

Status: implemented and verified for exact duplicates, conflicts, and evidence.

## Duplicate policy

- A new normalized identifier and otherwise valid row is inserted.
- The same identifier with the same normalized data is recorded as an
  idempotent merge and does not create another record.
- The same identifier with conflicting identity or shift data is rejected.
- A new `staff_id` whose normalized email belongs to another account is
  rejected.
- CSV uploads never silently change an existing staff email or profession, or
  an existing shift's timestamps or requirements.
- Corrections to persisted records use explicit manager edit functionality.

## Reporting

- Every merged or rejected row retains its source row and normalized comparison.
- The report identifies the existing record, reason code, conflicting fields,
  and action taken.
- Repeating the same file produces the same domain state and explainable report
  results.

## Planned verification

- Exact duplicate imports are idempotent.
- Conflicting `staff_id`, email, and `shift_id` cases are rejected without
  modifying the existing record.
- Valid rows in a row-level mixed file can persist while rejected rows remain
  fully explained.
