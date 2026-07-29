# Plan 009: Unclaim and unassignment authorization

Status: implemented and covered by database integration tests.

## Current behavior

- Staff may unclaim only their own future assignment when its origin is
  `self_claimed`.
- Staff cannot unclaim an assignment whose origin is `manager_assigned`.
- Managers may unassign staff from either kind of future assignment.
- At `starts_at`, the existing lifecycle lock prevents both unclaim and
  unassignment for everyone.
- Authorization is enforced from persisted assignment origin and ownership;
  hiding the Unclaim control is not sufficient.

## Persistence

The assignment record retains:

- `origin`: `self_claimed` or `manager_assigned`;
- the staff account and shift;
- `created_by_account_id` and `created_at`;
- lifecycle status;
- `ended_by_account_id` and `ended_at` when unclaimed, unassigned, or cancelled.

Removing an assignment transitions its status instead of erasing the row.
Capacity and overlap calculations include active assignments only, and database
uniqueness prevents multiple active rows for the same staff member and shift.

## Transaction and realtime behavior

- Unclaim and unassignment lock the affected shift and staff records in the
  same order as claim operations.
- The transaction rechecks ownership, origin, active status, and the
  `starts_at` cutoff before changing status.
- After commit, manager coverage and the affected staff schedule are invalidated
  through their respective SSE events.
- Manager unassignment creates a durable notice for the affected staff member.
  It is shown through the existing notification flow until that staff member
  explicitly acknowledges it.

## Future improvement

Staff could request release from a manager-assigned shift with a reason. That
request would remain pending until a manager approved or rejected it, with an
audit trail and notifications. This approval workflow is intentionally out of
scope for the take-home.

## Planned verification

- Staff can unclaim their own future self-claims.
- Staff cannot unclaim manager-created, ongoing, completed, or another staff
  member's assignments.
- Managers can unassign either assignment origin only before the shift starts.
- Manager unassignment cannot complete without atomically creating the affected
  staff member's acknowledgement-required notice.
- Concurrent unclaim, assignment, cancellation, and shift-start races cannot
  leave contradictory active state.
