# CRFV Notes

## Scope

- Product area: `CRFV`
- Main route namespace: `/crfv/*`
- Template root: `views/pages/crfv/`
- Shared footer partial: `views/partials/crfv/footer.ejs`

## Migration Status (2026-03-01)

- CRFV is EJS-first for active pages under `views/pages/crfv/`.
- Canonical CRFV routes are extensionless (example: `/crfv/index`, `/crfv/reports`).
- Backward `.html` CRFV route aliases were removed from active routing.
- Migrated duplicate static CRFV HTML files were removed from `public/crfv/`.
- Internal CRFV links were normalized to in-app navigation (no `_blank` for internal page flows).
- Core CRFV route access smoke test coverage includes:
  - public page access checks
  - protected page blocking checks when logged out
  - authenticated page rendering checks for admin-protected views
  - canonical extensionless index route checks

## QA Checklist

Manual sanity pass before release:
1. Open `/crfv/index` and verify all primary menu links navigate correctly.
2. Confirm protected pages (`/crfv/reports`, `/crfv/event-create`, `/crfv/admin-register`) return auth/login flow when logged out.
3. Log in as admin and confirm protected CRFV pages render expected content.
4. Validate `/crfv/account-settings` behavior for authenticated user sessions.
5. Check mobile layout for `/crfv/reports` and `/crfv/event-create` at small breakpoints.
6. Verify no references remain to `/crfv/*.html` in active routes or client-side navigation.

## QA Run Log

Use this section to record each manual QA pass.

Run metadata template:
- Date:
- Environment:
- Tester:
- Build/Commit:

Checklist result template:
1. `/crfv/index` navigation flow: `PASS` | `FAIL` | `N/A`
2. Protected page auth gating (logged out): `PASS` | `FAIL` | `N/A`
3. Admin access to protected views: `PASS` | `FAIL` | `N/A`
4. `/crfv/account-settings` authenticated behavior: `PASS` | `FAIL` | `N/A`
5. Mobile layout check (`/crfv/reports`, `/crfv/event-create`): `PASS` | `FAIL` | `N/A`
6. No active `/crfv/*.html` references: `PASS` | `FAIL` | `N/A`

Findings template:
- Severity:
- Page/Route:
- Steps to reproduce:
- Expected:
- Actual:
- Fix status:

### Run: 2026-03-01 (Automated + Partial Manual)

Run metadata:
- Date: `2026-03-01`
- Environment: `Local dev`
- Tester: `Codex + developer`
- Build/Commit: `Working tree (post-CRFV EJS migration hardening)`

Checklist results:
1. `/crfv/index` navigation flow: `PASS` (route and page marker checks via smoke tests)
2. Protected page auth gating (logged out): `PASS` (smoke checks for reports/event-create/admin-register + others)
3. Admin access to protected views: `PASS` (authenticated smoke checks for reports/event-create/admin-register)
4. `/crfv/account-settings` authenticated behavior: `PASS` (authenticated smoke check)
5. Mobile layout check (`/crfv/reports`, `/crfv/event-create`): `N/A` (manual viewport QA not executed in this run)
6. No active `/crfv/*.html` references: `PASS` (active route/client scan clean; canonical extensionless routes enforced)

Findings:
- Severity: `Info`
- Page/Route: `CRFV suite`
- Steps to reproduce: `Run npx jest tests/smoke/crfvRouteAccess.test.js --runInBand --verbose`
- Expected: `All CRFV route access and auth checks pass`
- Actual: `7/7 tests passing`
- Fix status: `No code fix required`

## Implementation Notes (2026-03-03)

- Account settings page migrated from utility-class styling to dedicated CRFV stylesheet:
  - `public/crfv/css/account-settings.css`
  - `views/pages/crfv/account-settings.ejs` now uses semantic `as-*` classes.
- Account settings script extracted and refactored:
  - `public/crfv/js/account-settings.js`
  - Inline script removed from `views/pages/crfv/account-settings.ejs`.
- New account API routes added and mounted:
  - `GET /api/account/profile`
  - `PUT /api/account/profile`
  - `POST /api/account/change-password`
  - Route module: `routes/accountApiRoutes.js`
- CSRF protections added for account mutation endpoints and `/api/logout`:
  - token utility: `utils/csrfToken.js`
  - token endpoint: `GET /api/csrf-token`
  - account settings frontend now sends CSRF token with state-changing requests.
- Update Profile UX changes:
  - Email is read-only in the profile form.
  - Profile fields are locked by default and enabled only in edit mode.
  - `Edit Profile` button shows `Save/Cancel` controls only while editing.
  - Dirty-state guard and beforeunload warning enabled for unsaved profile changes.
- Change Password UX changes:
  - Panel now uses the same edit-mode pattern (`Edit Password` -> `Update/Cancel`).
  - Password fields are disabled by default until edit mode.
  - `New Password` and `Confirm New Password` now have Show/Hide toggles.
  - Password panel layout adjusted to compact single-column with shorter horizontal width.
- CRFV login panel updates:
  - Password visibility control now uses Material icon correctly.
  - Login error/success messages are hidden by default and shown only when needed.
  - Username placeholder updated to `ID Number`.
- Audit Trail updates:
  - Added `Audit Trail` button in center menu panel (`/crfv/index`).
  - Button visibility now role-aware on client (`admin`/`manager` only).
  - `public/crfv/js/audittrail.js` auth check now validates `authenticated` and role.
  - Audit log fetches now consistently use session credentials (`same-origin`) instead of local bearer token.

## Implementation Notes (2026-04-17)

- Attendance scheduling is now a two-layer CRFV model:
  - global default attendance schedule for future events
  - per-event attendance schedule override stored independently from later default changes
- New CRFV settings API:
  - `GET /api/crfv/settings/attendance-defaults`
  - `PUT /api/crfv/settings/attendance-defaults`
  - route module: `routes/crfvSettingsApi.js`
- Attendance schedule utilities and persistence helpers added:
  - `utils/crfvAttendanceSchedule.js`
  - `utils/crfvAttendanceStore.js`
  - `utils/crfvAttendanceRecordEnrichment.js`
- Event management updates:
  - `POST /api/events` now seeds new events from the current global attendance default when no schedule is provided
  - `PUT /api/events/:id` now accepts per-event `attendance_schedule`
  - `/crfv/event-create` now includes:
    - a default attendance schedule editor for admin/manager
    - per-event schedule inputs on create and edit
    - reset-to-current-default actions
- Attendance runtime updates:
  - `/api/attendance/latest-event` now returns `attendance_schedule`
  - `/crfv/attendance` now uses the event schedule instead of hard-coded slot timing
  - slot assignment follows:
    - `AM IN` until `AM OUT` start
    - `AM OUT` until `PM IN` start
    - `PM IN` until `PM OUT` start
    - `PM OUT` after that
  - punctuality is persisted at write time using:
    - `punctuality_status`
    - `late_minutes`
  - punctuality applies to `AM IN` and `PM IN`; `AM OUT` and `PM OUT` remain `not_applicable`
- Reporting updates:
  - attendance summary exposes `am_in_status`, `pm_in_status`, `am_in_late_minutes`, and `pm_in_late_minutes`
  - CRFV reports and exports now include punctuality columns and counters for on-time vs late arrivals
- Automated coverage added:
  - `tests/unit/crfvAttendanceSchedule.test.js`
  - `tests/smoke/crfvAttendanceSettingsApi.test.js`
  - targeted smoke reruns for CRFV route access and auth guards
- Related release note:
  - `docs/reports/release-note-2026-04-17.md`
