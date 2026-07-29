# Decisions

## Architecture

Use a modular monolith with one backend and PostgreSQL database, separated into
Identity, Scheduling, Import, and Notification modules. Separate Identity and
Scheduling REST microservices were rejected because their deployments, data
synchronization, and failure modes add risk without a current scaling or team
boundary. Scale the monolith first; extract Identity behind a versioned API and
staff projection only when independent ownership or load justifies it.

The implementation uses one pnpm workspace with a Next.js TypeScript frontend
in `apps/web` and an Express TypeScript API in `apps/api`. The frontend uses
Material UI with one shared theme and the Next.js App Router cache provider.

## Domain rules

- `Account` owns identity and access role (`manager` or `staff`);
  `StaffProfile` owns imported `staff_id` and profession (`doctor`, `nurse`, or
  `receptionist`). Managers are seeded and cannot create other managers.
- Requirements are exact profession targets and capacity limits. Coverage is
  derived from active assignments.
- All times are India Standard Time (`Asia/Kolkata`) and use a 24-hour clock.
  Store absolute instants, use half-open intervals `[start, end)`, treat an
  earlier end as next-day, reject equal times, and impose no duration limit.
- Claims become active immediately without approval. Staff claims and manager
  assignments share one model with their origin and actors retained.
- Staff may unclaim only future self-claims. Only managers may remove
  manager-created assignments.
- Editing a claimed future shift atomically revalidates its claims. Keep valid
  claims, retain the oldest claims when capacity falls, and cancel conflicting
  claims with staff notification.
- At `starts_at`, shifts and assignments become immutable for everyone. Future
  cancellation or deletion uses retained cancelled/archived records, atomically
  cancels active claims, and notifies affected staff.
- Creating or editing a shift to a start instant at or before the current
  database time is rejected; the UI also disables already-passed IST choices.
- As an extension beyond the brief, staff can view available, upcoming,
  completed, and cancelled shifts. Available shifts include full or conflicting
  options with clear disabled reasons; the server remains authoritative.

## Authentication and infrastructure

Use Supabase PostgreSQL, Prisma, and Upstash Redis. Staff use passwordless email
OTP; Redis stores only an HMAC of each short-lived, one-time, attempt-limited
OTP plus rate limits. A secure `HttpOnly` session has an absolute 24-hour
maximum. Remember-me requests browser persistence for up to 24 hours; unchecked
sessions use session-only browser state.

After OTP verification, the cookie contains a signed JWT with standard issuer,
audience, issued-at, expiry, and subject claims. It carries only the account ID;
authorization still reloads the account and staff profile from PostgreSQL on
every protected request. Redis is not used for session storage. Logout clears
the cookie; an issued token is otherwise valid only until its 24-hour expiry.
The web client records remember-me intent in non-authoritative browser storage;
full browser session restoration may also restore session storage.

OTP is deliberate: `staff.csv` has no password field, so seeded passwords would
invent source data rather than import it.

Every OTP request creates a fresh Redis-backed `otpSessionId`. Demo mode lets
every valid stored account, including later staff imports, use a documented
fixed six-digit OTP while keeping the same HMAC, expiry, consumption, and
throttling flow. Otherwise Mailtrap sends a random OTP. OTP requests do not
reveal whether an account exists.

## Consistency and notifications

PostgreSQL is authoritative. Claim and assignment transactions lock the
affected shift and staff records and recheck every invariant. Active
assignments must also be protected by a PostgreSQL `EXCLUDE USING GIST`
constraint over staff and time range; row locking is complementary, not its
replacement. Under contention or database uncertainty, prefer waiting,
retrying, or rejection over confirming an unsafe claim. Redis is never required
for scheduling correctness.

Durable notification rows are created with their domain mutation and remain
visible until the recipient acknowledges them. Manager assignment,
unassignment, cancellation, and forced claim removal notify affected staff;
routine staff claims only refresh manager coverage.

REST handles client commands. Authenticated SSE handles live, unidirectional
server-to-dashboard invalidations; reconnecting clients refetch PostgreSQL state.

## Imports

Seed and manager uploads use the same deterministic pipeline:
`parse -> normalize -> validate -> deduplicate/merge -> persist -> report`.
The manager page has separate Staff CSV and Shift CSV handlers with exact
headers; type is never inferred.

Normalize known profession aliases, emails, whitespace, and requirement keys.
Accept only `YYYY-MM-DD` dates, convert valid IST values to timestamps, and
store validated requirements as JSONB. Exact duplicates merge idempotently;
conflicts and invalid rows are rejected without overwriting existing records.
Every merged or rejected row retains its input, reason, action, and linked
record.

First boot runs migrations and checksum-guarded fixture imports under a database
bootstrap guard. Later boots skip completed checksums, and systemic migration or
seed failure prevents readiness. Indexes target actual account, week, claim,
overlap, and import-report access paths.

## With more time

Add recurring-shift exceptions; reasoned, manager-approved release requests for
manager assignments; and audited active-shift replacement. At higher volume or
with independent consumers, publish a transactional outbox to Kafka for replay,
consumer isolation, and decoupled notification, email, analytics, and audit
processing.
