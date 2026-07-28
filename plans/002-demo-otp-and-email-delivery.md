# Plan 002: Demo OTP and email delivery

Status: accepted during the system-rules grilling; implementation has not
started.

## One OTP protocol

1. The user enters an imported email and requests an OTP.
2. The server applies the per-email send limit and creates an `otpSessionId`.
3. In normal mode, it generates a random six-digit OTP. In demo mode, an
   allowlisted seeded account uses the fixed `DEMO_OTP_CODE`, such as `123456`.
4. The server stores only the OTP HMAC and account context at
   `otp:session:<otpSessionId>` with a short TTL.
5. The configured email adapter receives the same OTP for delivery.
6. Verification requires the `otpSessionId`, applies an attempt limit, compares
   HMACs safely, and consumes the challenge after success.
7. Successful verification creates the normal session; demo mode does not
   change session authorization or lifetime.

## Safety boundaries

- `DEMO_AUTH_ENABLED` is false by default.
- The fixed code applies only to explicitly seeded demo accounts.
- Requesting an OTP remains mandatory; the fixed code cannot create a session
  without a live Redis challenge.
- Demo requests retain OTP expiry, one-time use, send limits, and verification
  attempt limits.
- The fixed code comes from environment configuration and is documented only
  for the evaluation deployment.

## Mailtrap

Local evaluators may provide their own Mailtrap Sandbox API/SMTP credentials and
sandbox identifier through environment variables. The application sends OTP
emails into their sandbox without requiring access to our Mailtrap account.
The deployed demo remains usable with the documented fixed OTP even when the
evaluator cannot inspect our sandbox.
