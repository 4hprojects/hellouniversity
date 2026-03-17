# Auth Flow Notes
Updated: 2026-03-15

## Current Auth Surface

The non-CRFV auth flow is now EJS-first and organized into a dedicated auth module.

Pages:
- `/login`
- `/signup`
- `/reset-password`
- `/approval-pending`
- `/confirm-email/:token`
- `/resend-confirmation`

Primary page templates:
- `views/pages/auth/login.ejs`
- `views/pages/auth/signup.ejs`
- `views/pages/auth/reset-password.ejs`
- `views/pages/auth/approval-pending.ejs`
- `views/pages/auth/confirmation-status.ejs`

Client scripts:
- `public/js/auth/loginPage.js`
- `public/js/auth/signupPage.js`
- `public/js/auth/passwordRules.js`
- `public/js/auth/institutionSearch.js`
- `public/js/auth/resetPasswordPage.js`

Shared auth CSS:
- `public/css/auth.css`

## Login

Accepted identifiers:
- 7-digit student ID
- 8-digit student ID
- email address
- existing special usernames still supported by backend aliases

Behavior:
- role-aware redirect after login
- email confirmation required for accounts where `emailConfirmed === false`
- failed-login lockout still applies
- pending teacher accounts redirect to `/approval-pending`

## Signup

Signup now captures:
- first name
- last name
- student ID number
- email
- password / confirm password
- account type:
  - `student`
  - `teacher`
- institution type:
  - `senior_high_school`
  - `college`
  - `university`
- institution selection or manual fallback

Institution behavior:
- searchable local institution directory through `/api/institutions/search`
- `School not listed` allows manual institution entry
- current directory is a curated Philippines-focused baseline and can be expanded later

## Teacher Signup Safety

Teacher signup does not grant immediate teacher access.

Current behavior:
- requested teacher signups are stored as:
  - `role: teacher_pending`
  - `requestedRole: teacher`
  - `approvalStatus: pending`
- admin approval is still required before teacher dashboard access
- existing admin user-management role update tools can be used to promote the account later

## Reset Password

The password reset flow is now page-driven through EJS and uses existing backend endpoints:
- `POST /send-password-reset`
- `POST /verify-reset-code`
- `POST /reset-password`

UI steps:
1. submit email
2. verify reset code
3. create new password

## Email Confirmation

Email confirmation and resend-confirmation responses now render through EJS status pages instead of raw HTML strings.

## Static Auth Cleanup

Retired static auth files:
- `public/login.html`
- `public/signup.html`
- `public/reset-password.html`

Legacy clean-URL compatibility remains through redirects:
- `/login.html -> /login`
- `/signup.html -> /signup`
- `/reset-password.html -> /reset-password`
