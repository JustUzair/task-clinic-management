# Plan 007: Staff shift discovery

Status: accepted during the system-rules grilling; implementation has not
started.

## Available shifts

- Staff see future active shifts that contain a requirement for their
  profession.
- Full, already-claimed, and overlapping shifts remain visible so the user can
  understand why they cannot claim them.
- Each card shows local date and time, overnight status when applicable,
  required and claimed headcount for the staff member's profession, remaining
  capacity, and the claim state.
- The Claim action is disabled with a specific reason when the current snapshot
  is not claimable.
- Cancelled, archived, ongoing, and completed shifts do not appear in Available
  Shifts; they belong in the relevant personal schedule section.

## Correctness

- The UI state is advisory. Claim submission always reruns profession,
  capacity, duplicate, overlap, and lifecycle checks in one server transaction.
- A race lost after the page was rendered returns a stable conflict response and
  refreshes the affected schedule and coverage data.
- SSE invalidates visible shift data, but the client refetches authoritative
  records rather than applying capacity changes locally.

## Planned verification

- Staff cannot discover or claim shifts with no requirement for their
  profession.
- Full and overlapping shifts remain visible with the correct reason.
- A stale enabled button cannot bypass server rules.
- Date, time, and overnight presentation use India Standard Time.
