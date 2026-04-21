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
- Current architectural risks after the 2026-04-21 hardening pass:
  - CRFV data is split across multiple systems:
    - Supabase for events, attendees, attendance records, payment records, and payment/report reads
    - MongoDB for attendance defaults, event schedule overrides, attendance metadata, and user/password records
    - Google Sheets relay still exists in attendance write flow
  - Google Sheets is retained only for legacy CRFV workflow compatibility, not as the primary source of truth:
    - current attendance writes save to Supabase first, then relay the payload to an Apps Script endpoint as bounded best-effort work
    - the relay no longer blocks the successful primary attendance response
    - registration can also relay to Apps Script when `GOOGLE_APPSCRIPT_URL` is configured
    - legacy artifacts suggest CRFV previously depended on Sheets tabs such as `Registered`, date-based `Attendance...`, `BulkRegister`, and `TimeSlot`
    - removing the relay should be treated as legacy integration cleanup, not as a replacement for the current core datastore
  - schedule and punctuality rules are duplicated between server and browser code, which increases drift risk:
    - server canonical logic: `utils/crfvAttendanceSchedule.js`
    - browser duplicates: `public/crfv/js/attendance.js`, `public/crfv/js/attendance-schedule-ui.js`
  - `PUT /api/events/:id` performs the Supabase update call before its required-field validation block, which is the wrong validation order
- Risks addressed in the 2026-04-21 hardening pass:
  - `POST /api/attendance` and related `/api/attendance/*` reads now require a server-side authenticated session
  - CRFV report, attendee, accommodation, attendance, and payment reporting reads now require `admin` or `manager`
  - report/account/payment/settings/audit mutations now require CSRF where they are session-backed
  - `/crfv/reports` no longer loads the duplicate `reportscounter.js` controller
- Recommended next follow-up:
  - reduce duplicated attendance-schedule logic so the server remains the single source of truth
  - clean up the mixed Supabase/Mongo/Sheets data ownership where practical, especially across attendance and payment flows
  - add targeted automated coverage for:
    - event update validation behavior
    - remaining mixed-owner data cleanup paths

## Git Status (2026-04-17)

- Current CRFV batch has been committed and pushed to GitHub:
  - branch: `main`
  - commit: `cea004d`
  - message: `Add CRFV scheduling, settings, and payment audits`
- Targeted verification completed before push:
  - `npm test -- tests/unit/crfvAttendanceSchedule.test.js tests/smoke/crfvAttendanceSettingsApi.test.js tests/smoke/crfvRouteAccess.test.js tests/unit/paymentAuditMetrics.test.js tests/smoke/paymentAuditsApi.test.js --runInBand`
  - result: `5/5` suites passed, `25/25` tests passed

## Event-Create Updates (2026-04-18)

- `/crfv/index` main-menu tiles now open their CRFV pages in a new tab:
  - menu links use `target="_blank"` with `rel="noopener noreferrer"`
  - route smoke coverage now asserts the rendered new-tab markup
- `/crfv/event-create` edit modal actions were reorganized:
  - `Delete Event` moved into the same footer row as `Cancel` and `Save Changes`
  - delete stays aligned left while cancel/save stay grouped on the right
  - the destructive warning copy moved out of the edit body and into the delete verification flow
  - a hover/focus tooltip was added beside `Delete Event` with the permanent-delete warning
- Archive flow now requires stronger confirmation:
  - archive confirm dialog now explains that the event will move to `Completed Events` and leave active CRFV lists
  - archiving now opens a password-verification modal before the status update is sent
  - backend `PATCH /api/events/:id/status` now verifies the user password before allowing `status = archived`
- Archived-event editing is now intentionally locked down:
  - opening `Edit` for an archived event makes the modal read-only except for the `Status` field
  - attendance schedule inputs, reset control, and `Save Changes` stay disabled while status remains `Archived`
  - switching `Status` to `Active` immediately unlocks the rest of the modal in the same session
  - switching back to `Archived` re-locks the modal before save

## Delete Cascade Update (2026-04-18)

- Event deletion now uses application-level dependency preflight instead of relying on raw foreign-key failures
- `DELETE /api/events/:id` now checks related CRFV data before deleting:
  - Supabase `attendees`
  - Supabase `attendance_records`
  - Mongo `payment_info` linked by attendee number
  - Mongo CRFV event schedule documents
  - Mongo CRFV attendance metadata documents
- New delete behavior:
  - empty events can still be deleted normally
  - events with related data return structured `409` details unless `cascade: true` is explicitly confirmed
  - full cascade delete for non-empty events is now admin-only
  - cascade cleanup deletes child data first, then deletes the event row last
- Attendance-store helpers were added for event-schedule and attendance-metadata cleanup so route logic does not directly reach into those collections
- `/crfv/event-create` delete confirmation now uses the structured dependency counts to explain what will also be removed during cascade delete

## Git Status (2026-04-18)

- Current CRFV batch has been committed and pushed to GitHub:
  - branch: `main`
  - commit: `8883d32`
  - message: `Refine CRFV event edit and delete flows`
- Targeted verification completed before commit/push:
  - `npm test -- tests/smoke/crfvRouteAccess.test.js tests/smoke/eventsArchiveStatusApi.test.js tests/smoke/eventsDeleteCascadeApi.test.js --runInBand`
  - result: `3/3` suites passed, `16/16` tests passed

## Payment Audits UI Update (2026-04-18)

- `/crfv/payment-audits` column picker/menu was reworked from a basic checkbox dropdown into a structured CRFV control panel
- The `Columns` trigger now includes:
  - explicit button structure
  - live visible-column count
  - open/close indicator
- Column menu improvements:
  - titled popover panel with helper copy
  - `Show all` and `Reset default` quick actions
  - grouped sections for default columns vs additional detail columns
  - dark-text label styling and larger clickable option rows
  - `Escape` close support and better outside-click behavior
- Desktop positioning bug was fixed:
  - menu alignment is now chosen at open time based on viewport space
  - desktop overflow/off-screen rendering near the right toolbar edge is prevented
  - mobile/tablet behavior stays full-width under the control
- Desktop checkbox layout bug was fixed:
  - the broad filter-row input rule no longer leaks onto column-menu checkboxes
  - checkbox and label alignment now stays correct on larger screens as well as smaller ones

## Payment Info Migration (2026-04-18)

- CRFV `payment_info` is now treated as a Supabase-backed source of truth for the payment-report route and event-delete cascade path
- New shared payment store helper added:
  - `utils/paymentInfoStore.js`
  - centralizes:
    - event-scoped payment fetch by attendee/event relationship
    - payment update/delete by `payment_id`
    - payment dependency count/delete by attendee number for event cascade cleanup
- `/api/payments-report` migration:
  - `routes/paymentsReportsApi.js` no longer reads or writes Mongo `payment_info`
  - `GET /api/payments-report?event_id=...` now assembles the same row shape from Supabase `payment_info` + Supabase `attendees`
  - `PUT /api/payments-report/:payment_id` now updates Supabase while keeping the same allowed editable fields and audit-trail behavior
  - `DELETE /api/payments-report/:payment_id` now deletes from Supabase and preserves the same audit logging semantics
- Event delete cascade update:
  - `routes/eventsApi.js` now counts and deletes related payment rows from Supabase instead of Mongo during delete preflight/cascade cleanup
  - Mongo remains in use for user/password verification and CRFV attendance/settings metadata only
- Backfill/reconciliation tooling added:
  - `scripts/backfill-payment-info-to-supabase.js`
  - package script: `npm run crfv:backfill:payment-info`
  - dry-run mode reports:
    - Mongo row count
    - Supabase row count
    - missing `payment_id`s in Supabase
    - field-level differences for matching `payment_id`s
    - orphaned Mongo payment rows whose `attendee_no` does not exist in Supabase
  - write mode upserts valid rows into Supabase by `payment_id`
- New automated coverage:
  - `tests/smoke/paymentsReportsApi.test.js`
  - `tests/smoke/eventsDeleteCascadeApi.test.js` updated for Supabase payment cleanup path

## Git Status (2026-04-18, Latest)

- Current CRFV batch has been committed and pushed to GitHub:
  - branch: `main`
  - commit: `41b6cdb`
  - message: `Migrate CRFV payments to Supabase and refine audits UI`
- Targeted verification completed before commit/push:
  - `npm test -- tests/smoke/paymentsReportsApi.test.js tests/smoke/eventsDeleteCascadeApi.test.js tests/smoke/eventsArchiveStatusApi.test.js tests/smoke/paymentAuditsApi.test.js tests/smoke/crfvRouteAccess.test.js --runInBand`
  - result: `5/5` suites passed, `25/25` tests passed

## Reports Page Update (2026-04-19)

- `/crfv/reports` event filter now prefers the full events listing endpoint:
  - frontend event-dropdown loading in `public/crfv/js/reports.js` now requests `/api/events/all` first
  - if that request fails or returns nothing, it falls back to `/api/events`
- Reason for the change:
  - the reports page is used for historical reporting and should not be limited to only current/upcoming events
  - using the all-events endpoint restores event-filter population for older CRFV report contexts
- Payload compatibility was preserved:
  - the reports page still accepts either an array payload or `{ events: [...] }`
  - no backend route contract was changed for this fix

## Git Status (2026-04-19)

- Current CRFV/doc batch has been committed and is ready to push to GitHub:
  - branch: `main`
  - commit: `31d1456`
  - message: `Fix CRFV reports event filter and add AI feature docs`
- Targeted verification completed before commit/push:
  - `node --check public/crfv/js/reports.js`
  - `npm test -- tests/smoke/crfvRouteAccess.test.js --runInBand`
  - result: `1/1` suite passed, `8/8` tests passed

## Security, Efficiency, and Code Organization Update (2026-04-21)

- Shared API security middleware added:
  - `middleware/apiSecurity.js`
  - exports `requireSession`, `requireRole`, `requireCsrf`, and cached `requireRateLimit(profile)` middleware
  - profiles currently cover auth login, password reset, privileged writes, audit writes, and attendance writes
- Centralized Supabase service-role usage:
  - route modules touched in this pass now import `supabase` from `supabaseClient.js`
  - direct service-role client creation was removed from the hardened CRFV/report/payment paths
- CRFV sensitive API hardening:
  - `routes/reportsApi.js` now applies `admin`/`manager` access to report, attendee, accommodation, attendance, and payment-reporting reads
  - report mutations now require CSRF and rate-limit checks
  - `routes/attendanceApi.js` now requires an authenticated session for live attendance reads and writes
  - attendance writes now require CSRF and use the `attendance-write` rate-limit profile
  - `routes/paymentsReportsApi.js`, `routes/crfvSettingsApi.js`, `routes/auditTrailApi.js`, account mutation routes, and admin-user mutation routes now use shared CSRF handling where applicable
- Attendance write behavior:
  - Supabase remains the primary write target for attendance records
  - `utils/attendanceSheetsRelay.js` keeps the Apps Script relay as best-effort compatibility work
  - the Sheets relay no longer delays or blocks a successful attendance response
- Report data efficiency and correctness:
  - latest-payment selection moved into shared helpers in `utils/paymentInfoStore.js`
  - `/api/attendees` and related report flows now batch payment lookup by attendee number instead of doing per-attendee secondary queries
  - report exports for attendees, accommodation, and attendance now preserve the active `event_id` filter when exporting `All (Database)`
- CRFV reports client cleanup:
  - `public/crfv/js/api-client.js` added as the shared browser helper for CSRF-aware same-origin requests
  - `public/crfv/js/reports.js` now owns the reports page controller, counters, pagination, exports, and edit modals
  - stale duplicate `public/crfv/js/reportscounter.js` was removed from the runtime route and deleted
- Documentation and DX:
  - checked-in route security matrix added at `docs/route-security-matrix.md`
  - `docs/route-map.md` now links to the route security matrix
  - conservative `eslint` and `prettier` scripts were added to `package.json`
  - config files added:
    - `eslint.config.js`
    - `.prettierrc.json`
    - `.prettierignore`
- Automated coverage added or updated:
  - `tests/smoke/reportsApi.test.js`
  - `tests/smoke/attendanceApi.test.js`
  - `tests/smoke/auditTrailApi.test.js`
  - `tests/smoke/accountApiRoutes.test.js`
  - `tests/smoke/paymentsReportsApi.test.js`
  - `tests/smoke/crfvAttendanceSettingsApi.test.js`
  - `tests/smoke/crfvRouteAccess.test.js`
- Verification completed for this pass:
  - `node --check` on touched CRFV browser/server files: `PASS`
  - `npm run lint`: `PASS`
  - `npm run format:check`: `PASS`
  - targeted hardened-surface smoke tests: `7/7` suites passed, `32/32` tests passed
- Full-suite status:
  - `npm run test:smoke`: `FAIL`
  - `npm test -- --runInBand`: `FAIL`
  - known unrelated failing test:
    - `tests/smoke/studentClassRushActivitiesApi.test.js`
    - failing assertion: `response.body.summary.nextDue` is `null`
  - all newly added and updated CRFV/security smoke tests pass
