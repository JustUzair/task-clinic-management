# Plan 004: Shift business rules

Status: implemented; API validation and database-backed claim rules are active.

## Shift definition

- A manager supplies a date, `HH:mm` start and end times, and profession
  requirements.
- The API interprets those values in `Asia/Kolkata` and stores absolute
  `starts_at` and `ends_at` timestamps.
- An end time earlier than the start is an overnight shift ending the following
  day.
- Equal start and end times are invalid zero-duration shifts.
- A create or edit whose resolved start instant is not in the future is
  rejected using database time; the form disables already-passed IST choices.
- The system does not enforce minimum or maximum working hours. Managers and
  staff decide whether a shift's duration is appropriate.
- The UI uses a 24-hour clock and visibly marks an overnight end as next-day.
- Intervals are half-open, `[start, end)`, so adjacent shifts do not overlap.

## Claim and assignment rules

A staff claim or manager assignment succeeds only when:

- the account represents staff with a supported profession;
- that profession still has capacity in the shift requirements;
- the staff member has no overlapping active claim;
- the same staff member has not already claimed the shift.

These rules are enforced on the server in a PostgreSQL transaction and apply
equally to staff claims and manager assignments. The system does not decide
whether the shift is desirable or enforce labor-duration policy.

## Presentation

Week views are selected by the shift's starting timestamp in India Standard
Time.
An overnight shift appears on its starting day and displays its next-day ending
time. The stored timestamps, not reconstructed display strings, are used for
overlap checks.

Claim handling for cancellation and archival is defined in Plan 005.
