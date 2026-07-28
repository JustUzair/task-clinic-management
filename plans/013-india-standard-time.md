# Plan 013: India Standard Time

Status: accepted during the system-rules grilling; implementation has not
started.

## Timezone contract

- The clinic timezone is fixed to India Standard Time using the IANA identifier
  `Asia/Kolkata`.
- Existing and uploaded CSV date/time values are interpreted as IST.
- Every shift time displayed or entered by managers and staff is in IST using a
  24-hour clock; the product does not offer per-user timezone conversion.
- PostgreSQL stores absolute start and end instants. Conversion to an absolute
  instant at persistence and back to IST at presentation boundaries must not
  change the wall-clock values users supplied.
- The fixed IANA zone, rather than an ambiguous `IST` abbreviation or a manually
  coded offset, is used throughout validation and date handling.

## Planned verification

- Seeded values display with the same date and `HH:mm` values as their valid CSV
  inputs.
- Overnight shifts retain their IST starting day and next-day ending behavior.
- Week boundaries and lifecycle cutoffs are calculated in `Asia/Kolkata`.
- Database/session timezone differences cannot change API or UI results.
