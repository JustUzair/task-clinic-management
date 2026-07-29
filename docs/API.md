# API contract

Base path: `/api/v1`. JSON mutation requests must send a trusted `Origin` or
`Referer` matching `APP_ORIGIN`. Authentication uses a signed JWT in an
`HttpOnly` session cookie.

## Response and error shape

Successful JSON responses wrap payloads in `data`. Expected domain failures use
a stable code and an actionable message:

```json
{
  "code": "PROFESSION_CAPACITY_FULL",
  "message": "This shift already has enough staff for that profession"
}
```

Validation errors return `400`, authentication failures `401`, authorization
failures `403`, missing records `404`, business or concurrency conflicts `409`,
rate limits `429`, and unavailable dependencies `503`. Unexpected errors return
`500` without exposing internal details.

## Public and identity routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthz` | Public | Process health |
| `POST` | `/auth/otp/request` | Public | Create a rate-limited OTP challenge |
| `POST` | `/auth/otp/verify` | Public | Consume a challenge and create a session |
| `GET` | `/auth/me` | Authenticated | Reload durable account identity |
| `POST` | `/auth/logout` | Session holder | Clear the JWT session cookie |

OTP requests deliberately return the same public shape for known and unknown
emails. Protected requests reload the account from PostgreSQL after resolving
the verified JWT subject. JWT issuer, audience, signature, and expiry are
validated before the durable account is loaded.

## Scheduling routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/shifts/:id` | Authenticated | Get one shift and active assignments |
| `POST` | `/shifts` | Manager | Create a future shift |
| `PATCH` | `/shifts/:id` | Manager | Atomically edit and revalidate claims |
| `POST` | `/shifts/:id/cancel` | Manager | Retain-cancel a future shift |
| `DELETE` | `/shifts/:id` | Manager | Retain-archive a future shift |
| `POST` | `/shifts/:id/claims` | Staff | Claim the shift for the current staff member |
| `POST` | `/shifts/:id/assignments` | Manager | Assign a selected staff profile |
| `DELETE` | `/assignments/:id` | Authenticated | Authorized unclaim or unassignment |
| `GET` | `/staff/shifts` | Staff | Available and personal schedule sections |
| `GET` | `/coverage?week=YYYY-MM-DD` | Manager | Derived Monday-Sunday coverage |
| `GET` | `/staff-directory` | Manager | Staff choices for direct assignment |

Claim and assignment mutations lock the shift and staff rows, recheck
lifecycle, profession, capacity, duplicate, and overlap rules, then insert in
one transaction. A PostgreSQL partial unique index and `EXCLUDE USING GIST`
constraint are the final duplicate and overlap backstops.

Staff may remove only their own future self-claim. Managers may remove either
assignment origin before the shift starts. All removals retain audit rows.
Creating or editing a shift with a start instant at or before database time
returns `SHIFT_START_NOT_FUTURE`.

## Import routes

All import routes are manager-only.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/imports/staff` | Import a `file` multipart field as staff CSV |
| `POST` | `/imports/shifts` | Import a `file` multipart field as shifts CSV |
| `GET` | `/imports` | List import batch summaries |
| `GET` | `/imports/:id` | Read merged and rejected row evidence |

Authentication and manager authorization execute before Multer reads the file.
Wrong headers fail at file level; mixed valid and invalid rows produce one
transactional, explainable report.

## Notifications and live events

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/notifications` | Authenticated | List the caller's unacknowledged notices |
| `POST` | `/notifications/:id/acknowledge` | Owner | Acknowledge one retained notice |
| `GET` | `/events` | Authenticated | Open the caller's SSE stream |

Manager-assignment, shift-cancellation, and archival notifications include the
immutable shift ID, optional imported shift ID, and ISO start/end instants so
the acknowledgement UI can identify the exact IST date and time affected.

The server sends `coverage.changed`, `schedule.changed`,
`notification.created`, and `import.status_changed` as small invalidations.
Each event has an ID and reconnect interval; clients refetch authoritative
PostgreSQL state. The current in-process fan-out assumes one API instance.
Cross-instance fan-out is deferred until deployment scale requires it.
