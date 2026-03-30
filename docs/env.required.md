# Required Environment Variables
Updated: 2026-03-30

This file documents the startup env checks enforced by [`app/validateEnv.js`](../app/validateEnv.js).

If any required variable is missing, the server will fail fast during startup.

## Always Required

- `MONGODB_URI`
- `SESSION_SECRET`

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`

- `CF_R2_ACCOUNT_ID`
- `CF_R2_ACCESS_KEY_ID`
- `CF_R2_SECRET_ACCESS_KEY`
- `CF_R2_BUCKET_NAME`

- `RESEND_API_KEY`
- `SENDER_EMAIL_NOREPLY`

- `GOOGLE_API_KEY`
- `GOOGLE_SPREADSHEET_ID_ATTENDANCE`

- `GOOGLE_TYPE`
- `GOOGLE_PROJECT_ID`
- `GOOGLE_PRIVATE_KEY_ID`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_AUTH_URI`
- `GOOGLE_TOKEN_URI`
- `GOOGLE_AUTH_PROVIDER_X509_CERT_URL`
- `GOOGLE_CLIENT_X509_CERT_URL`
- `GOOGLE_UNIVERSE_DOMAIN`

## Conditionally Required

- `SECRET_KEY` (reCAPTCHA secret)
  - Required unless either:
    - `NODE_ENV=development`, or
    - `DISABLE_CAPTCHA=true`

## Required in Production (`NODE_ENV=production`)

- `TRUST_PROXY`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`
- `ENABLE_CSP`
- `CSP_REPORT_ONLY`

## Optional / Common

- `PORT` (default: `3000`)
- `MONGODB_DB_NAME` (default: `myDatabase`)
- `BYTE_FUNRUN_2025_CUTOFF_ISO` (optional override for Fun Run cutoff)
- `BASE_URL` (used by some bulk registration flows; defaults to `http://localhost:3000`)
- `RECAPTCHA_SITE_KEY` (required for frontend captcha rendering when captcha is enabled)
- `ACTIVITY_RANDOM_REQUIRE_STAFF` (`true` to restrict `/api/activity/random` to `teacher|admin|manager`; default open)
- `TRUST_PROXY` (supports `true|false|<number>|<express trust proxy value>`; default `1` in production, `false` otherwise)
- `SESSION_COOKIE_SECURE` (override cookie `secure` behavior; defaults to `true` in production)
- `SESSION_COOKIE_SAMESITE` (`lax|strict|none`; defaults to `lax`, and `none` requires secure cookies)
- `SESSION_COOKIE_DOMAIN` (optional cookie domain override)
- `SESSION_MAX_AGE_MS` (optional session cookie max age; default 2 hours)
- `ENABLE_CSP` (`true` to enable Helmet CSP policies; defaults to `true` in production)
- `CSP_REPORT_ONLY` (`true` for report-only mode when CSP is enabled; default `true` for rollout safety)

## Notes

- For multi-line private keys in `.env`, preserve escaped newlines (`\\n`) where required by routes using Google service account credentials.
- Keep secrets out of version control.
- Use `/.env.production.example` as the deployment baseline.
