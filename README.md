# Clinic Shift Scheduler

A modular-monolith clinic scheduler built for the supplied full-stack take-home.
Managers manage shifts and CSV imports; staff discover and claim shifts. The
API protects profession capacity and staff overlap rules under concurrent use.

## Stack

- Next.js 16, React 19, and Material UI 9 with the App Router SSR cache
- Node.js 24, Express 4, TypeScript, and Zod
- PostgreSQL on Supabase with Prisma 7
- Upstash Redis for OTP challenges and rate limits
- Signed JWT sessions in secure `HttpOnly` cookies
- Mailtrap for OTP email delivery
- Server-Sent Events (SSE) for authenticated dashboard invalidations
- pnpm workspace, multi-stage Docker images, and Docker Compose

The backend is one modular monolith with Identity, Import, Scheduling,
Notification, and Realtime modules. PostgreSQL is authoritative; Redis and SSE
are not part of scheduling correctness. See [DECISIONS.md](DECISIONS.md) for
the accepted policies and [docs/API.md](docs/API.md) for the API contract.

## Run locally

Requirements: Docker with Compose, plus configured Supabase, Upstash, and
Mailtrap credentials.

1. Copy `.env.example` to `.env` and replace every `replace-me` value.
2. Start the complete application:

   ```sh
   docker compose up --build
   ```

The frontend is available at `http://localhost:3000`. The API defaults to
`http://localhost:4000`; change `API_PORT` and `API_ORIGIN` together if needed.

The API container applies committed migrations before startup. It then acquires
a PostgreSQL advisory lock and imports the immutable `data/staff.csv` and
`data/shifts.csv` fixtures through the same pipeline used by manager uploads.
Completed seed checksums are skipped on later starts. A migration or systemic
seed failure prevents the API from serving traffic.

## Authentication and demo credentials

Passwordless email OTP is deliberate, not placeholder behavior:
`staff.csv` has no password field, so seeding passwords would invent data that
does not exist in the supplied source.

Seeded manager:

- Email: `manager@clinic.test`

Example accepted staff accounts:

- `marcus.whitfield@clinicmail.test`
- `anya.haddad@clinicmail.test`
- `ben.marchand@clinicmail.test`

With `DEMO_AUTH_ENABLED=true`, request an OTP from the login page and then enter
the configured `DEMO_OTP_CODE` (`123456` in `.env.example`). The fixed code
works for every valid stored account, including later CSV imports, but only
after a live Redis challenge is created. It retains the normal expiry, attempt
limit, rate limit, HMAC storage, and one-time consumption behavior.

With demo mode disabled, the generated code is delivered through the configured
Mailtrap inbox. Unknown or rejected emails receive the same public response as
known emails but no usable challenge.

The day-one seeded-password fallback described in the plans has not been
activated or implemented because the OTP flow is working. `AUTH_MODE` must
remain `otp`.

Successful OTP verification signs a short-lived JWT containing only standard
session claims and the account ID. The API verifies issuer, audience, signature,
and expiry, then reloads the durable account from PostgreSQL. “Remember me”
keeps the browser marker and cookie for up to 24 hours; without it, the web app
uses a session-only marker and clears the cookie when that marker is absent.
Browsers configured for full session restoration may restore session storage as
well. Signing out clears both markers and the cookie. No role or profession
authority is trusted from the token.

## Local development

Install all workspace dependencies once from the repository root:

```sh
pnpm install
```

Apply migrations, then start the API and web development servers:

```sh
pnpm db:migrate
pnpm dev
```

Other supported commands:

```sh
pnpm db:generate
pnpm typecheck
pnpm build
pnpm test
pnpm test:database
```

`pnpm test:database` is the single complete verification command. It starts an
isolated PostgreSQL 16 container, applies all migrations, runs unit, HTTP, and
database integration tests, then removes the test database. It never points at
the configured Supabase database.

## Import contract

The two manager upload controls accept only these exact CSV headers:

- Staff: `staff_id,full_name,role,email`
- Shifts: `shift_id,date,start_time,end_time,requirements`

Seed and upload both execute:

`parse -> normalize -> validate -> deduplicate/merge -> persist -> report`

Files are size- and row-bounded. Exact duplicates merge without changing the
stored record; conflicting identifiers are rejected without overwriting data.
The manager report shows batch counts and row-level evidence for every merged
or rejected row.

## Deployment status

No public deployment URL is configured yet, so cold-start behavior has not been
measured. The Compose images and hosted-service configuration are ready for the
deployment phase, but this README does not claim an unverified deployment.
