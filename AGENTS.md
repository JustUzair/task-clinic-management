# AGENTS.md

## Purpose

This repository contains a four-day full-stack take-home for a clinic shift
scheduler. The evaluated product must let managers manage shifts and imports,
let staff claim their own shifts, and keep staffing and overlap rules correct
under concurrent use.

The repository is in implementation and verification. Preserve the accepted
scope in `DECISIONS.md` and the numbered plans; do not add features that are not
required by those sources without an explicit user decision.

## Sources of truth

Use these sources in order:

1. `PROJECT_BRIEF.md` defines the required behavior and deliverables. Do not edit
   it unless the user explicitly asks.
2. `DECISIONS.md`, once created, records deliberate interpretations of the
   brief and accepted tradeoffs.
3. Checked-in architecture documents and diagrams describe the intended design,
   but their assumptions are not requirements unless promoted into
   `DECISIONS.md`.
4. Tests and executable schemas specify implemented behavior, but they must not
   silently contradict the brief or accepted decisions.

Treat `staff.csv` and `shifts.csv` as immutable input fixtures. Importers may
read them; tests may copy them into temporary locations; application code must
not rewrite them.

When sources conflict, stop and surface the conflict. Do not silently choose the
most convenient interpretation.

## Scope and delivery priorities

Implement in this order unless the user changes the priority:

1. Authentication, authorization, and seeded demo accounts.
2. Shift CRUD and the claim/unclaim invariants.
3. One deterministic import pipeline used by both seeding and manager uploads.
4. The manager-only import report.
5. The responsive weekly coverage dashboard and week navigation.
6. Deployment, documentation, and focused reliability/security hardening.
7. Recurring shifts and live updates only after the core is complete.

Prefer a modular monolith with clear domain boundaries over independently
deployed services. Names such as Auth Service, Claim Service, and Import Service
refer to application modules unless a separately deployable service is
explicitly approved.

The selected stack is a Next.js client, an Express Node.js API, PostgreSQL,
Redis-backed OTP challenges, and SSE. PostgreSQL is the system of record.
Correctness must not depend on an expiring cache lock. Database partitioning,
Kafka, and other infrastructure not required by the brief must be justified by
measured need before introduction.

## Domain language

- An account has one authorization role: `manager` or `staff`.
- A staff account has one profession: `doctor`, `nurse`, or `receptionist`.
- Authorization role and clinical profession are different concepts. Do not
  model them as one recursive role hierarchy.
- A shift has an absolute start and end instant plus required headcount per
  profession.
- A claim or assignment associates one staff member with one shift.
- A manager assignment is subject to the same capacity and overlap rules as a
  staff claim.
- Coverage status is derived from requirements and active claims. Do not persist
  `empty`, `partial`, or `full` as authoritative state.

Use half-open time intervals, `[start, end)`, so adjacent shifts do not overlap.
Define one clinic timezone and convert at application boundaries. Overnight
rows such as `22:00` to `06:00` end on the following day; do not infer that rule
for arbitrary malformed times without an explicit import policy.

## Non-negotiable invariants

All mutations must enforce these rules on the server:

- Staff can claim or unclaim only for themselves.
- Managers can create, edit, and delete shifts and can assign or unassign staff.
- A staff member's profession must have remaining capacity on the target shift.
- A staff member cannot hold overlapping active shifts.
- The same staff member cannot claim the same shift twice.
- Concurrent attempts cannot overfill a profession or double-book a staff
  member.
- Editing a claimed shift must revalidate affected claims atomically according
  to the policy recorded in `DECISIONS.md`.

Use database transactions, constraints, and deliberate row locking to make these
invariants race-safe. Application pre-checks exist to return clear errors; they
are not the final correctness boundary. Ensure the constrained assignment table
contains the time range it checks and that shift edits update and revalidate it
in the same transaction.

For this project, the overlap exclusion constraint is mandatory. The active
assignment table must contain the effective shift range and enforce
`EXCLUDE USING GIST` for equal staff and overlapping ranges. Enable
`btree_gist` in a reviewed SQL migration. Staff and shift row locks remain
required for clear errors and capacity serialization, but they do not replace
the constraint. Shift edits must update assignment ranges and revalidate them
atomically.

Return stable, actionable domain errors. Expected business conflicts should map
to a conflict response, not a generic internal error.

## Import contract

The seed import and manager-upload import must call the same normalization and
validation pipeline:

`parse -> normalize -> validate -> deduplicate/merge -> persist -> report`

The pipeline must be deterministic and safe to run repeatedly. Record an import
batch and enough row-level evidence to explain every accepted, rejected, or
merged result, including:

- source filename and source row number;
- raw input values;
- normalized values when applicable;
- final status and reason code;
- human-readable explanation;
- action taken and linked record identifier when applicable.

Keep normalization rules explicit and tested. Known aliases may map to the three
supported professions; unknown professions, invalid email addresses, impossible
dates, missing required values, ambiguous times, and conflicting duplicates
must never disappear silently. Avoid logging passwords, tokens, or unrelated
personal data.

Uploaded files are untrusted input. Enforce an explicit size limit, expected
headers, bounded row counts, safe CSV parsing, and transactional persistence.

## Security baseline

- Enforce authorization at every server boundary; hiding UI controls is not
  authorization.
- Store password hashes only. `confirmPassword` is request/UI validation and is
  never a persisted user field.
- If authentication uses cookies, use `HttpOnly`, `Secure` in production, an
  appropriate `SameSite` policy, and CSRF protection for state-changing
  requests.
- Validate all request payloads at the boundary and use parameterized database
  access.
- Demo credentials may be documented as required by the brief, but production
  secrets must come from environment variables and must not be committed.
- Do not claim healthcare compliance or production readiness beyond what has
  actually been implemented and verified.

## Local development and deployment

The eventual documented local setup should be reproducible from a clean clone
with one primary command. Prefer containerized local dependencies and migrations
over making development depend on a shared hosted database. Seed operations must
be explicit, repeatable, and safe.

Keep local and hosted environments aligned through pinned runtime/database
versions, migrations, and configuration validation. Do not point automated tests
at production or shared development data.

Supported root commands:

- `pnpm install`: install the shared workspace dependency graph.
- `pnpm dev`: start the API and frontend development processes.
- `pnpm db:generate`: regenerate the Prisma client.
- `pnpm db:migrate`: apply committed migrations.
- `pnpm test`: run unit and HTTP tests; database integration tests are skipped.
- `pnpm test:database`: run the complete isolated PostgreSQL verification suite.
- `pnpm typecheck`: type-check both applications.
- `pnpm build`: create both production builds.
- `docker compose up --build`: migrate, seed, and start the complete stack.

There is no lint script yet. Do not claim or invent one.

## Testing expectations

Prioritize tests around risk rather than broad shallow coverage:

- table-driven unit tests for CSV normalization, validation, and duplicate
  resolution;
- integration tests for role enforcement and claim/unclaim behavior;
- concurrent integration tests proving capacity cannot be exceeded;
- overlap tests, including adjacent and overnight shifts;
- shift-edit tests covering the documented claim revalidation policy;
- seed idempotency and import-report evidence tests;
- responsive dashboard and critical manager/staff flows at the browser level.

Tests must be deterministic, isolated, and runnable with the documented command.
Do not weaken an invariant or remove a test merely to make a build pass.

When the four-day verification budget is tight, spend it in this order:

1. concurrent claim, capacity, duplicate, and overlap tests;
2. import normalization, idempotency, and report-evidence tests;
3. coverage dashboard and critical browser-flow tests;
4. notification and acknowledgement tests.

Notifications must eventually meet Plan 006, but they must not consume time
needed to prove the claim and import correctness emphasized by the brief.

## Time-box fallbacks

- If OTP authentication and email delivery are not working end to end by the
  end of implementation day 1, switch to the documented seeded-password mode.
  Store hashes only and keep the OTP design and failure reason documented.
- If auth, shift CRUD, claims, imports, and the coverage dashboard are not
  deployed and stable by the end of implementation day 3, remove the
  notification acknowledgement-inbox UI from the delivery scope. Preserve the
  notification rows and SSE-driven authoritative refetch behavior.

## Change discipline

- Inspect the repository and this file before editing.
- Keep changes focused on the requested phase and preserve unrelated user work.
- Do not modify generated files by hand.
- Add dependencies only when their value is concrete; document non-obvious
  choices in `DECISIONS.md`.
- Update migrations, tests, fixtures, and documentation together when a data
  contract changes.
- Run the smallest relevant checks while iterating, then the complete documented
  verification suite before handoff.
- Report what was verified and what was not. Never describe planned behavior as
  implemented.
- Do not commit, push, deploy, upload data, or create external resources unless
  the user explicitly requests that action.

## Required documentation before submission

- `README.md`: stack, architecture summary, one-command local setup, migrations
  and seed behavior, test commands, demo credentials, deployed URL, and cold
  start notes.
- `DECISIONS.md`: ambiguous-requirement decisions, concurrency strategy, import
  policy, shift-edit policy, time handling, tradeoffs, and one improvement that
  more time would permit.
- API/schema documentation sufficient to explain authorization and domain error
  behavior.

## Definition of done

A feature is complete only when its server-side authorization and invariants are
implemented, important failure paths return clear errors, relevant tests pass,
the UI exposes the behavior accessibly and responsively, and the documentation
matches the verified implementation.
