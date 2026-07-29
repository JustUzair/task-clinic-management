# Plan 001: Passwordless authentication and staff foundation

Status: implemented; OTP, session, authorization, schema, and automated identity
tests are in place.

## Decisions

- Preserve imported fields as `staff_id`, `full_name`, `role`, and `email`.
- Create an `Account` for identity/access and a related `StaffProfile` for
  `staff_id` and profession. Managers have an Account but no StaffProfile.
- Managers are seeded only; no workflow can create another manager.
- Normalize role aliases to `doctor`, `nurse`, or `receptionist`; reject unknown
  roles and preserve every raw value in the import report.
- Every valid imported staff account is immediately eligible for email OTP
  login. There is no password or manager-activation state.
- OTP is deliberate because `staff.csv` contains no password field; inventing
  seeded passwords would not be an import of the supplied source.
- Store only an HMAC of the OTP in Redis. OTPs are one-time, short-lived,
  attempt-limited, and request-rate-limited.
- Successful verification creates a secure `HttpOnly` session with a 24-hour
  absolute maximum. Without “remember me” the browser cookie is session-only;
  with it, the cookie persists for at most 24 hours.
- The session cookie contains a signed JWT with issuer, audience, subject,
  issued-at, and expiry claims. Only the account ID is carried; authorization
  reloads the durable account from PostgreSQL.
- Use Supabase PostgreSQL, Prisma, and Upstash Redis. Mailtrap Sandbox is the
  local and evaluator-supplied test-email adapter; see Plan 002.

## End-to-end flow

1. The seed or manager import validates and creates a staff record.
2. The staff member enters the imported email address on the login page.
3. The server confirms that the account exists, creates a six-digit OTP
   challenge, stores its HMAC in Redis, and sends the OTP through the configured
   email adapter.
4. The staff member submits the OTP. The server verifies and consumes it.
5. The server creates the 24-hour session and returns the appropriate staff
   identity and profession context.
6. Protected requests load the durable account from PostgreSQL when required;
   Redis remains ephemeral and is never the account source of truth.

## Implementation sequence

1. Define the Prisma staff/account model and strict enums.
2. Implement role normalization and valid-email import behavior.
3. Add OTP request, delivery, verification, throttling, and expiry.
4. Add secure session creation, validation, logout, and daily expiry.
5. Add authorization middleware and authentication integration tests.

The public OTP-request response is identical for existing and unknown email
addresses. Unknown addresses do not create a usable challenge or send email,
but the response does not disclose account membership.

## Time-box fallback

If OTP request, Mailtrap delivery, verification, and session creation are not
working end to end by the end of implementation day 1, switch `AUTH_MODE` to
seeded password authentication. Hash the environment-supplied fallback password,
do not persist plaintext, document the fallback in the README, and spend the
remaining schedule on the graded core.

`Account.password_hash` may remain nullable so this fallback does not require a
late schema redesign. It stays null in OTP mode and is populated from
`FALLBACK_SEEDED_PASSWORD` only when password mode is deliberately activated.
