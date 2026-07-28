# Plan 005: Shift lifecycle and archival

Status: accepted during the system-rules grilling; implementation has not
started.

## Lifecycle rule

- A shift is mutable only while the current time is earlier than `starts_at`.
- At `starts_at`, the shift and its assignment set become immutable.
- Staff cannot claim or unclaim an ongoing or completed shift.
- Managers cannot assign, unassign, edit, cancel, delete, or archive an ongoing
  or completed shift.
- The API enforces the cutoff using server/database time; disabled UI controls
  are only a presentation aid.

## Cancellation and deletion

- These actions are accepted only for future shifts.
- Cancellation changes the shift to a cancelled state and preserves the shift,
  requirements, claims, actor, and timestamp.
- Deletion is implemented as archival/soft deletion and never physically
  removes the shift or its related evidence.
- In the same transaction, every active claim becomes cancelled while retaining
  its claimant and audit timestamps. These claims no longer consume capacity or
  block the staff member from claiming an overlapping active shift.
- Each affected staff account receives a durable cancellation notification.
- Cancelled or archived shifts do not accept claims and do not count as active
  coverage.
- Historical and demonstration views may include them with a clear status.

## Planned verification

- Requests racing with `starts_at` are decided by the timestamp observed inside
  the mutation transaction.
- Direct API requests cannot bypass the lifecycle lock.
- Archived and cancelled shifts disappear from active coverage without losing
  their claims or audit context.
- Cancelling a shift and all of its active claims is atomic, and affected staff
  receive one idempotent notice each.
