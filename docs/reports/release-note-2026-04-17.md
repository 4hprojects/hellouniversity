# Release Note - 2026-04-17

## Summary

This release adds configurable CRFV attendance timing with global defaults and per-event overrides, moves shared defaults into a dedicated CRFV system settings page, refines the shared CRFV navigation and main menu, and adds a read-only payment audit reporting dashboard.

## Included Changes

- Added a two-layer CRFV attendance schedule model:
  - global default attendance template for future events
  - per-event attendance schedule persisted independently from later default changes
  - refreshed baseline default times:
    - `AM IN` `08:00` to `11:30` with on-time cutoff `09:15`
    - `AM OUT` from `11:30`
    - `PM IN` `12:30` to `16:00` with on-time cutoff `13:15`
    - `PM OUT` from `16:00`
- Added new CRFV settings API support:
  - `GET /api/crfv/settings/attendance-defaults`
  - `PUT /api/crfv/settings/attendance-defaults`
- Extended event create/update flows so new events inherit the current default schedule and existing events can override it.
- Reworked CRFV event management UI:
  - per-event attendance schedule editor
  - reset-to-current-default behavior in create/edit flows
  - clarified event-create layout so:
    - `This Event Attendance Schedule` stays with the event form
    - added per-slot help icons for `AM IN`, `AM OUT`, `PM IN`, and `PM OUT`
    - tooltip help now works on hover, keyboard focus, and tap/click
    - slot help hints are now anchored within the schedule card so they stay inside the page flow
    - create-form creator label now reads `User ID`
  - redesigned the `Edit Event` modal for desktop fit:
    - `Details` and `Attendance Schedule` tabs inside one modal
    - viewport-capped, internally scrollable body
    - compact details grid for event fields
    - delete action moved into a smaller danger section instead of the persistent footer
- Reworked CRFV attendance runtime:
  - scanner now reads the active event schedule instead of hard-coded slot windows
  - slot assignment follows the saved event schedule
  - punctuality is stored as `punctuality_status` and `late_minutes`
  - attendance page now shows the active schedule summary
- Added one-off default rollout helper:
  - `scripts/backfill-crfv-attendance-defaults.js`
  - `npm run crfv:backfill:attendance-defaults`
- Added a dedicated CRFV system settings surface:
  - new protected page: `/crfv/system-settings`
  - moved `Default Attendance Template` out of `/crfv/event-create`
  - `Attendance Defaults` now lives in system settings and still uses:
    - `GET /api/crfv/settings/attendance-defaults`
    - `PUT /api/crfv/settings/attendance-defaults`
  - added placeholder cards for:
    - `Payment & Billing Settings`
    - `Reporting & Audit Preferences`
  - shared browser schedule UI extracted to:
    - `public/crfv/js/attendance-schedule-ui.js`
- Refined CRFV shared navigation and main menu:
  - `/crfv/account-settings` is now presented as `User Profile Settings`
  - `/crfv/index` now includes a separate `System Settings` tile for `admin` and `manager`
  - shared authenticated CRFV nav is simplified to:
    - `CRFV Event System` home/main-menu button
    - live clock
    - icon-only login/logout button
  - hover/focus labels now show:
    - `Home / Main Menu`
    - `Log In` / `Log Out`
  - `/crfv/index` layout updates:
    - three-panel desktop split now uses `25% / 50% / 25%`
    - center menu uses three columns on desktop
    - menu tiles now use explicit semantic classes instead of `nth-child(...)` colors
    - tile order is:
      - `Create Event`, `Register`, `Attendance`
      - `Reports`, `Payment Audits`, `Attendance Summary`
      - `Audit Trail`, `User Profile Settings`, `System Settings`
    - welcome panel copy was shortened and simplified
- Added a dedicated CRFV payment audit dashboard:
  - new protected page: `/crfv/payment-audits`
  - new `/crfv/index` button: `Payment Audits`
  - page remains read-only and links into `/crfv/payment-reports` for per-event record review/editing
- Added payment audit APIs:
  - `GET /api/payment-audits/summary`
  - `GET /api/payment-audits/records`
  - page is now Supabase-backed for live CRFV payment data
  - all-events summary cards for recorded, collected, and receivable totals
  - read-only payment records table with search, payment-status filter, event filter, pagination, and drill-down links
  - compact default column set plus optional finance columns through a `Columns` picker
- Updated payment reports drill-down behavior:
  - `/crfv/payment-reports` now accepts `?event_id=...`
  - payment audit rows can open the existing payment reports page scoped to one event
- Extended attendance summary and reports:
  - AM/PM on-time vs late counters
  - punctuality columns in tables and exports
- Added supporting tests for:
  - schedule validation and slot/punctuality classification
  - guarded CRFV attendance-defaults API access
  - payment audit metric aggregation
  - payment audit API access and payload shape
  - CRFV protected route access including `/crfv/payment-audits`

## Verification

Verified with:

```powershell
npx jest tests/unit/crfvAttendanceSchedule.test.js tests/smoke/crfvAttendanceSettingsApi.test.js tests/smoke/crfvRouteAccess.test.js --runInBand
npx jest tests/smoke/mutationRouteGuards.test.js tests/smoke/routeAuthGuards.test.js --runInBand
node --check public/crfv/js/event-create.js
node --check public/crfv/js/attendance.js
node --check scripts/backfill-crfv-attendance-defaults.js
npx jest tests/smoke/crfvRouteAccess.test.js --runInBand
node --check public/crfv/js/attendance-schedule-ui.js
node --check public/crfv/js/system-settings.js
node --check public/crfv/js/app-shell.js
node --check routes/paymentAuditsApi.js
node --check public/crfv/js/payment-audits.js
node --check public/crfv/js/payment-reports.js
node --check public/crfv/js/index.js
npx jest tests/unit/paymentAuditMetrics.test.js tests/smoke/paymentAuditsApi.test.js tests/smoke/crfvRouteAccess.test.js --runInBand
```

Result: targeted CRFV schedule logic, payment audit aggregation/API coverage, route access coverage, auth-guard coverage, and syntax checks for the updated CRFV scripts all passed.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`
