# Plan 012: Weekly dashboard draft

Status: basic responsive implementation complete; visual refinement remains
intentionally deferred.

Material UI provides the shared responsive component system; route pages remain
thin and compose feature-specific components.

## Initial working direction

- Use a Monday-through-Sunday week in India Standard Time.
- Open on the current clinic week.
- Provide previous/next navigation and a date-based jump to another week.
- Show active shifts with computed empty, partial, or full coverage and the
  missing headcount by profession.
- Place overnight shifts on their starting day and mark the end as next-day.
- Exclude cancelled and archived shifts from normal coverage.
- Allow past-week navigation to show completed shifts and their final staffing.

These are implementation-ready defaults, not fixed design decisions. Layout,
controls, information density, and responsive presentation will be reviewed
using real backend data before being promoted into `DECISIONS.md`.
