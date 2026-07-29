# Plan 010: Manager import entry points

Status: implemented with separate manager UI controls and authorized handlers.

## Manager flow

- One manager-only Import page exposes two explicit actions: Import Staff CSV
  and Import Shifts CSV.
- Each action has its own file control, expected-header guidance, handler, and
  endpoint contract.
- The server does not infer import type from a filename or partial headers.
- Staff uploads require `staff_id,full_name,role,email`.
- Shift uploads require `shift_id,date,start_time,end_time,requirements`.

## Shared pipeline

- Each upload handler passes the file to the same domain-specific pipeline used
  by initial seeding:
  `parse -> normalize -> validate -> deduplicate/merge -> persist -> report`.
- Seed and upload entry points may provide different source metadata, but they
  cannot apply different normalization or validation rules.
- A file with the wrong, missing, duplicated, or additional unsupported headers
  is rejected as a file-level error rather than routed to another importer.
- Authentication and manager authorization are checked before reading the
  uploaded body.

## Planned verification

- Staff and shift fixtures produce the same normalized results through seed and
  upload entry points.
- A staff file sent to the shift handler, and vice versa, is rejected clearly.
- Staff cannot access either import handler or its reports.
- File-level failures do not create a successful import batch or partial domain
  records.
