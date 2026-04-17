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
  - refreshed default schedule baseline:
    - `AM IN` starts `08:00`, on time until `09:15`
    - `AM OUT` starts `11:30`
    - `PM IN` starts `12:30`, on time until `13:15`
    - `PM OUT` starts `16:00`
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
    - per-event schedule inputs on create and edit
    - reset-to-current-default actions
  - `/crfv/event-create` UX cleanup:
    - event-specific schedule is now labeled `This Event Attendance Schedule` in create and edit flows
    - slot cards now include per-slot help icons for `AM IN`, `AM OUT`, `PM IN`, and `PM OUT`
    - tooltip help works on hover, keyboard focus, and tap/click
    - slot help hints are now anchored within the schedule card instead of floating outside the page
    - create-form creator label now reads `User ID`
  - `/crfv/event-create` edit modal redesign:
    - edit flow now uses `Details` and `Attendance Schedule` tabs inside one modal
    - modal body is capped to the viewport and scrolls internally on desktop
    - details fields are compacted into a grid layout for name, dates, venue, location, status, and creator info
    - delete action moved into a dedicated danger section inside the details tab
    - persistent footer is reduced to `Cancel` and `Save Changes`
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
  - later UX verification reran:
    - `node --check public/crfv/js/event-create.js`
    - `npx jest tests/smoke/crfvRouteAccess.test.js --runInBand`
    - after edit modal and tooltip refinements, the same syntax and CRFV route smoke checks were rerun successfully
  - default-refresh rollout helper added:
    - `scripts/backfill-crfv-attendance-defaults.js`
    - package script: `npm run crfv:backfill:attendance-defaults`
- System settings and profile/settings navigation updates:
  - new protected page route: `/crfv/system-settings`
  - `Default Attendance Template` editor moved out of `/crfv/event-create` and into `/crfv/system-settings`
  - `/crfv/system-settings` now includes:
    - active `Attendance Defaults` editor powered by the existing attendance-defaults API
    - placeholder `Payment & Billing Settings` card
    - placeholder `Reporting & Audit Preferences` card
  - shared schedule editor helper extracted for browser reuse:
    - `public/crfv/js/attendance-schedule-ui.js`
  - `/crfv/account-settings` is now labeled `User Profile Settings` in route metadata and visible page copy
  - `/crfv/index` menu updates:
    - `Settings` renamed to `User Profile Settings`
    - new `System Settings` tile for `admin` and `manager`
    - signed-in side panel no longer duplicates a profile/settings button
- Shared CRFV app-shell navigation updates:
  - authenticated CRFV pages now use a simplified shared top nav
  - nav now shows:
    - `CRFV Event System` home/main-menu button
    - live clock
    - icon-only auth button that toggles between login/logout state
  - hover/focus labels added for:
    - `Home / Main Menu`
    - `Log In` / `Log Out`
- `/crfv/index` main-menu layout and content refinements:
  - three-panel desktop layout now uses a `25% / 50% / 25%` split
  - center menu now uses a three-column grid on desktop
  - menu tiles now use explicit semantic classes instead of `nth-child(...)` color assignment
  - tile order is now:
    - row 1: `Create Event`, `Register`, `Attendance`
    - row 2: `Reports`, `Payment Audits`, `Attendance Summary`
    - row 3: `Audit Trail`, `User Profile Settings`, `System Settings`
  - welcome panel copy was shortened to a lighter summary with three concise bullets
- Payment audits dashboard added as a separate CRFV surface:
  - new protected page route: `/crfv/payment-audits`
  - new `/crfv/index` menu button: `Payment Audits`
  - button visibility is client-side role-aware for `admin` and `manager`
  - the page is read-only and stays separate from `/crfv/payment-reports`
- New payment audit API support:
  - `GET /api/payment-audits/summary`
  - `GET /api/payment-audits/records`
  - route module: `routes/paymentAuditsApi.js`
  - shared summary utility: `utils/paymentAuditMetrics.js`
- Payment audit page behavior:
  - page is now Supabase-backed for live CRFV payment data
  - default view is an all-events records-first report
  - summary cards expose recorded, collected, and receivable totals plus operational counts
  - records table shows event, attendee, organization, payment status, amount, form of payment, OR number, and payment dates by default
  - optional finance detail columns can be enabled through a `Columns` picker and are persisted in browser storage
  - records filter by event, search query, payment status, page, and row limit
  - rows still link into `/crfv/payment-reports` for deeper per-event review/editing
- Payment reports drill-down update:
  - `/crfv/payment-reports` now reads `?event_id=...` from the URL
  - payment audit table actions can deep-link directly into the existing per-event editor
- Related release note:
  - `docs/reports/release-note-2026-04-17.md`

## Architecture Analysis (2026-04-17)

- `/crfv` currently behaves like a self-contained app surface inside the repo:
  - dedicated page router: `routes/crfvPagesRoutes.js`
  - dedicated layout and shared nav shell: `views/layouts/crfv.ejs`, `views/partials/crfv/app-shell-nav.ejs`
  - dedicated page assets under `public/crfv/`
  - dedicated protected APIs for settings, payment audits, reports, attendance, and events
- Current strengths:
  - route structure is clearer and more consistent than the earlier CRFV state
  - shared app-shell navigation is now centralized instead of reimplemented per page
  - attendance scheduling now has a real server-side domain layer:
    - `utils/crfvAttendanceSchedule.js`
    - `utils/crfvAttendanceStore.js`
    - `routes/crfvSettingsApi.js`
  - payment audit reporting now has a read-only all-events surface with canonical payment status normalization:
    - `routes/paymentAuditsApi.js`
    - `utils/paymentAuditMetrics.js`
  - route-access and newer CRFV API smoke coverage exist for:
    - CRFV page access and auth gating
    - attendance-default settings API
    - payment audit summary and records API
- Earlier interaction-audit findings that are no longer current:
  - `payment-reports` now has `PUT` and `DELETE` routes in `routes/paymentsReportsApi.js`
  - payment-report export logging now has a supported `POST /api/audit-trail`
  - audit-trail pagination no longer depends on inline `onclick`
  - `/crfv/index` fallback auth forms now point to `/login` and `/logout`
  - `admin-register.js` no longer hard-crashes on the removed `adminRegisterForm` id because the legacy hook is now guarded
- Current architectural risks:
  - CRFV data is split across multiple systems:
    - Supabase for events, attendance, and payment-audit reads
    - MongoDB for attendance defaults, event schedule overrides, attendance metadata, and payment-report writes
    - Google Sheets relay still exists in attendance write flow
  - Google Sheets appears to be retained for legacy CRFV workflow compatibility rather than as the primary source of truth:
    - current attendance writes save to Supabase first, then relay the payload to an Apps Script endpoint
    - registration can also relay to Apps Script when `GOOGLE_APPSCRIPT_URL` is configured
    - legacy artifacts suggest CRFV previously depended on Sheets tabs such as `Registered`, date-based `Attendance...`, `BulkRegister`, and `TimeSlot`
    - removing the relay should be treated as legacy integration cleanup, not as a replacement for the current core datastore
  - schedule and punctuality rules are duplicated between server and browser code, which increases drift risk:
    - server canonical logic: `utils/crfvAttendanceSchedule.js`
    - browser duplicates: `public/crfv/js/attendance.js`, `public/crfv/js/attendance-schedule-ui.js`
  - `POST /api/attendance` is mounted without an auth guard and currently relies on client-side login flow instead of a server-side protected write path
  - `PUT /api/events/:id` performs the Supabase update call before its required-field validation block, which is the wrong validation order
- Recommended next follow-up:
  - protect `/api/attendance` with an explicit server-side auth/role decision
  - reduce duplicated attendance-schedule logic so the server remains the single source of truth
  - clean up the mixed Supabase/Mongo/Sheets data ownership where practical, especially across attendance and payment flows
  - add targeted automated coverage for:
    - payment-report update/delete flows
    - attendance scanner write path
    - event update validation behavior
