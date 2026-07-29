# Plan 006: Durable notifications and live dashboards

Status: implemented for durable acknowledgement and single-instance SSE; the
documented cross-instance scaling route remains deferred.

## Notification model

- A shared server-side Notification module is used by every domain rather than
  embedding notification behavior in controllers or UI code.
- PostgreSQL stores recipient, type, message data, related entity, creation
  time, and `acknowledged_at`. Domain mutations create their notifications in
  the same transaction as the underlying change.
- Unacknowledged notices are returned on every dashboard load. The popup does
  not disappear on timeout, navigation, or reload; an explicit OK/tick request
  records acknowledgement on the server.
- Manager-assignment, shift-cancellation, and archival notices identify the
  shift and its IST date and time range before asking the staff member to
  acknowledge the change.
- Acknowledgement only sets `acknowledged_at` and dismisses the popup. The row
  remains for integrity, but a separate notification-history UI is out of scope.
- Notification creation is idempotent per recipient and domain event.

Initial notification events are:

- a manager assigns a staff member to a shift;
- a manager unassigns a staff member from a shift;
- a future claimed shift is cancelled or archived;
- a shift edit invalidates or removes an existing claim.

## Dashboard behavior

- Staff can view upcoming claimed or assigned shifts, completed shifts, and
  cancelled or archived shifts in a compact scrollable schedule above shift
  discovery. Future self-claims can be unclaimed there, then both sections
  refetch the same authoritative dashboard response.
- Managers keep the weekly coverage dashboard from the brief.
- Initial loads, mutations, and SSE refetches expose local progress and disable
  affected actions until the authoritative response is applied.
- Each open dashboard establishes one authenticated SSE connection and responds
  only to events authorized for that account.
- SSE events contain an event ID, reconnect guidance, and no sensitive payload.
  The server sends heartbeats, and reconnect or page load always recovers state
  from PostgreSQL.

The initial event contract is:

| SSE event | Audience | Trigger | Client response |
| --- | --- | --- | --- |
| `coverage.changed` | Managers | Claim, unclaim, assignment, unassignment, or shift lifecycle change | Refetch the affected week |
| `schedule.changed` | Affected staff | Their claim or shift changes | Refetch their schedule sections |
| `notification.created` | Recipient only | A durable notice is committed | Refetch the unacknowledged inbox and show the popup |
| `import.status_changed` | Initiating manager | Import status or report changes | Refetch import progress/report |

SSE events are context-specific invalidations, not copies of complete shift,
claim, import, or notification records. One committed mutation may emit both a
manager-facing `coverage.changed` event and staff-targeted schedule/notification
events.

## Manager notification policy

- Ordinary staff claims and unclaims refresh manager coverage through SSE but
  do not create persistent manager popups.
- Successful imports update their report through SSE without adding inbox
  noise.
- Actionable failures, initially failed imports and exhausted important-email
  delivery retries, create a durable notice for the relevant manager.

## Delivery without Kafka

- PostgreSQL is the durable notification inbox; SSE is only the low-latency
  online delivery path.
- A long-running Node API can use a dedicated PostgreSQL session for
  `LISTEN/NOTIFY` to wake each API instance after committed notification writes,
  then fan out to its connected SSE clients.
- Important notices can also enqueue an email delivery record transactionally.
  A bounded background poller sends it through the existing Mailtrap-backed
  email adapter with retry and idempotency. Sandbox mode captures evaluator
  emails; real delivery requires configured sending credentials.
- Browser Push is deferred because it requires service workers, notification
  permission, and push-subscription lifecycle management.

## Scaling route

Kafka is intentionally absent from the take-home. If notification volume grows
or scheduling, notification, email, analytics, and audit consumers become
independently deployed, a transactional outbox can publish committed domain
events to Kafka. Consumer groups then provide independent scaling and replay,
while PostgreSQL remains authoritative for notification acknowledgement.

## Planned verification

- Transaction rollback cannot leave behind a notification for a failed change.
- Reloading or reconnecting cannot dismiss an unacknowledged notice.
- Replayed events do not create duplicate notices or duplicate emails.
- Users can only read and acknowledge their own notifications.
- Managers cannot subscribe to staff-private schedule or notification events,
  and staff cannot subscribe to manager coverage or import events.
- SSE interruption does not lose state, and each open client uses one stream
  for all dashboard event types.

## Time-box fallback

If auth, CRUD, claims, imports, and coverage are not deployed and stable by the
end of implementation day 3, omit the acknowledgement-inbox UI. Keep durable
notification rows and SSE-triggered refetches, and defer the remaining Plan 006
UI and verification until after the graded core is proven.
