# Clinic Shift Scheduler

![Node](https://img.shields.io/badge/Node.js-24.11-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.6-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.33-F69220?logo=pnpm&logoColor=white)

A modular-monolith clinic shift scheduler. Managers create shifts and import
staff/shift data from CSV; staff discover and claim shifts. The API enforces
profession capacity and staff-overlap rules under concurrent use directly at
the database layer, not just in application code.

Full policy reasoning lives in [`DECISIONS.md`](DECISIONS.md), the API
contract in [`docs/API.md`](docs/API.md), and the per-feature design process
in [`plans/`](plans/) and [`AGENTS.md`](AGENTS.md).

---

## Architecture at a glance

One backend, one deployable API, organized as a modular monolith with clear
domain boundaries rather than separate services:

| Module           | Owns                                                                                                              | Key files                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Identity**     | OTP login, sessions, authorization middleware, the staff directory                                                | `otp.service`, `session.service`, `auth.middleware`, `staff-directory.*`       |
| **Scheduling**   | Shifts, claims/assignments, the manager coverage dashboard, staff shift discovery — the concurrency-critical core | `shift.service`, `assignment.service`, `coverage.service`, `discovery.service` |
| **Import**       | The shared CSV pipeline used by both seeding and manager uploads                                                  | `import.service`, `staff-normalization`, `shift-normalization`, `csv-parser`   |
| **Notification** | Durable, transactional in-app notifications with acknowledgement                                                  | `notification.service`                                                         |
| **Realtime**     | Server-Sent Events fan-out for live dashboard/schedule updates                                                    | `sse-hub`                                                                      |

PostgreSQL is the single source of truth for every domain rule — capacity,
overlap, and lifecycle checks are enforced in transactions and constraints,
not just in application code. Redis (Upstash) is scoped to OTP challenges and
rate limiting; it is never required for scheduling correctness. SSE is a
convenience layer — a client that misses an event simply refetches from
Postgres on reconnect.

---

## Directory structure

```
.
├── apps/
│   ├── api/                     # Express + TypeScript backend
│   │   ├── prisma/              # Schema and migrations
│   │   └── src/
│   │       ├── modules/         # identity, scheduling, import, notification, realtime
│   │       ├── config/          # env, database, redis, logger
│   │       ├── middleware/      # error handling, origin/CSRF guard
│   │       ├── bootstrap/       # migration + seed orchestration on startup
│   │       └── lib/             # shared errors, crypto helpers
│   └── web/                     # Next.js + MUI frontend
│       └── src/
│           ├── app/             # manager/ and staff/ routes
│           ├── components/      # dashboard, forms, import UI
│           └── features/        # API clients + hooks per domain
├── data/                        # Immutable staff.csv / shifts.csv fixtures
├── docs/API.md                  # Request/response and error-code contract
├── plans/                       # Per-decision design docs from the planning phase
├── DECISIONS.md                 # Accepted policies and tradeoffs
├── AGENTS.md                    # Source-of-truth hierarchy and invariants
├── docker-compose.yaml          # Runs the built API + web images
└── .env.example                 # Full environment contract
```

---

## Running it locally

**Requirements:** Docker with Compose, and accounts for Supabase, Upstash, and
Mailtrap (see below). Local development talks to the same hosted Postgres,
Redis, and email services as production — there's no local database
container — so an internet connection and real (free-tier) credentials are
required even for local dev.

```sh
cp .env.example .env   # then fill in every "replace-me" value
docker compose up --build
```

The web app runs at `http://localhost:3000`, the API at `http://localhost:4000`.
On first boot the API applies migrations, then imports `data/staff.csv` and
`data/shifts.csv` through the same pipeline used by manager uploads. Later
restarts skip already-completed seed checksums.

**Native development** (without Docker), after the same `.env` setup:

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

**Docker development with live reload** is the standard local workflow. It
runs `next dev` for the frontend and uses Compose Watch to sync source changes
into the containers. Save a frontend file and let Next.js refresh the
browser—no rebuild or restart is needed.

```sh
docker compose up --watch
```

The first run builds the development images. Changes to `package.json` or
`pnpm-lock.yaml` rebuild the affected image automatically; source changes use
the frontend or API watch process. This requires Docker Compose 2.22 or newer.

---

## Environment variables and where to get them

Every variable is documented in `.env.example` and validated at startup — the
API refuses to start if any are missing or malformed.

| Variable(s)                                          | Where to get it                                                                                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                         | [supabase.com](https://supabase.com) → create a project → **Project Settings → Database** → copy the pooled connection string (`DATABASE_URL`) and the direct connection string (`DIRECT_URL`, used for migrations) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | [console.upstash.com](https://console.upstash.com) → create a Redis database → **REST API** tab                                                                                                                     |
| `MAILTRAP_API_KEY`, `MAILTRAP_INBOX_ID`              | [mailtrap.io](https://mailtrap.io) → **Email Testing → Inboxes** for the inbox ID, **Settings → API Tokens** for the key                                                                                            |
| `SESSION_SECRET`, `OTP_HMAC_SECRET`                  | Generate locally — not a third-party key: `openssl rand -hex 32` (run twice, once per secret)                                                                                                                       |
| `SEED_MANAGER_EMAIL`, `SEED_MANAGER_NAME`            | Your own choice — this becomes the seeded manager login                                                                                                                                                             |
| `DEMO_AUTH_ENABLED`, `DEMO_OTP_CODE`                 | Optional; see Authentication below                                                                                                                                                                                  |

All Supabase and Upstash tiers used here are free.

---

## Authentication

Login is passwordless email OTP rather than a password, by design: the
supplied `staff.csv` has no password field, so seeding one would mean
inventing data that doesn't exist in the source. A six-digit code is emailed
via Mailtrap, verified against an HMAC stored in Redis with a short TTL, rate
limits, and an attempt cap. Successful verification issues a signed JWT in an
`HttpOnly` session cookie, valid for up to 24 hours.

**Seeded manager:** `manager@clinic.test`
**Example staff accounts:** any row from `data/staff.csv`, e.g.
`marcus.whitfield@clinicmail.test`

With `DEMO_AUTH_ENABLED=true`, request an OTP as normal and enter the fixed
`DEMO_OTP_CODE` instead of checking Mailtrap. This still requires a live
Redis challenge and keeps normal expiry, rate limiting, and one-time
consumption — it only replaces the delivered code, not the flow.

---

## CSV import

Two manager-only upload actions accept exact headers only — type is never
inferred from the filename:

- **Staff:** `staff_id,full_name,role,email`
- **Shifts:** `shift_id,date,start_time,end_time,requirements`

Both uploads and the initial seed run the same pipeline:
`parse → normalize → validate → deduplicate/merge → persist → report`. Exact
duplicates merge idempotently; conflicting data is rejected without
overwriting existing records. The manager-only Import Report page shows
row-level evidence — raw input, normalized value, and reason — for every
merged or rejected row.

---

## Testing

```sh
pnpm test            # unit tests
pnpm test:database    # full verification: isolated Postgres container,
                       # migrations, unit + HTTP + database integration tests
```

`pnpm test:database` is the single command that matters most here — it
includes concurrency tests proving profession capacity and staff-overlap
rules hold under simultaneous requests, and never touches the configured
Supabase database.

---

## Known limitations

- **SSE fan-out is single-instance.** Live updates are held in-process; a
  second API instance wouldn't see another instance's events. Fine for the
  current single-instance deployment; scaling out would need the
  Postgres `LISTEN/NOTIFY` bridge described in `plans/006`.
- **Recurring shifts and staff-initiated release requests** are intentionally
  out of scope — see the "With more time" section of `DECISIONS.md`.

## Deployment

_Deployment URL and cold-start notes go here once the hosted environment is
live._
