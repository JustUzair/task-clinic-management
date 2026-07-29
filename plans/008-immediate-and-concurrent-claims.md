# Plan 008: Immediate and concurrent claims

Status: implemented and verified with concurrent PostgreSQL integration tests.

## Claim result

- A successful staff claim immediately creates an active assignment; there is
  no pending approval, manager review, or waitlist.
- Staff self-claims and manager assignments use the same mutation path and
  invariants.
- Audit metadata distinguishes `self_claimed` from `manager_assigned` and
  records the initiating account and creation time. Assignment origin also
  controls who may later unclaim it.
- After commit, SSE invalidates the affected manager coverage view and the
  affected staff schedule.

## Transaction boundary

The claim transaction:

1. locks the target shift row;
2. locks the target staff profile row;
3. verifies the shift is active and has not started;
4. verifies profession eligibility, remaining capacity, duplicate status, and
   overlap against current database state;
5. inserts the active claim;
6. creates any required durable notification;
7. commits before reporting success or emitting realtime invalidations.

Every claim and assignment path uses the same deterministic lock order. The
shift lock serializes capacity decisions for concurrent claimants. The staff
lock serializes concurrent attempts by the same staff member across different
shifts.

## Database safeguards

- A database uniqueness rule prevents more than one active claim for the same
  staff member and shift.
- The assignment table stores the effective `tstzrange` used for overlap
  checks. A reviewed SQL migration enables `btree_gist` and adds a partial
  `EXCLUDE USING GIST` constraint for equal staff and overlapping active ranges.
- The exclusion constraint is mandatory. Staff-row serialization and
  application pre-checks improve race handling and error clarity but cannot
  replace the database backstop.
- Shift edits update the stored active-assignment ranges and revalidate them in
  the same transaction.
- Transactions remain short and perform no email or network calls while locks
  are held.
- Lock timeouts, serialization failures, and database unavailability never
  produce a successful response. Safe transient failures may be retried within
  a small bound; otherwise the client receives a retryable error.

## Planned verification

- More simultaneous claims than remaining capacity produce exactly the allowed
  number of successful active claims.
- The same staff member cannot concurrently claim overlapping shifts.
- A direct insert that bypasses application locking is still rejected by the
  exclusion constraint.
- Double-clicking Claim cannot create duplicate active claims.
- Manager assignment and staff claim races obey the same rules.
- A failed or rolled-back transaction emits no SSE success event and leaves no
  durable notification.
