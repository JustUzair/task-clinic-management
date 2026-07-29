# Plan 000: Implementation kickoff guardrails

Status: implemented; the required database backstop and prioritized isolated
verification suite are in place.

## Required correctness backstop

- Keep shift and staff row locks for capacity and predictable domain errors.
- Store each active assignment's effective PostgreSQL time range.
- Enforce non-overlap with a mandatory partial `EXCLUDE USING GIST` constraint
  over staff equality and range intersection.
- Enable `btree_gist` and create the exclusion constraint in reviewed SQL
  migrations; Prisma schema declarations alone are insufficient.

## Verification budget

When time is constrained, verify in this order:

1. concurrent claims, capacity, duplicates, and overlap;
2. deterministic imports, idempotency, and row evidence;
3. coverage dashboard correctness and critical browser flows;
4. notification delivery and acknowledgement behavior.

## Deadline fallbacks

- End of day 1: if OTP plus email is not working end to end, activate the
  seeded-password fallback and document it. Passwords come from environment
  configuration and are stored only as hashes.
- End of day 3: if the deployed core is not stable, drop the notification
  acknowledgement-inbox UI. Keep durable notification rows and SSE refetches.

These triggers reduce optional scope; they do not relax authorization, claim
invariants, import evidence, or database correctness.
