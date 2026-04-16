# Release Note - 2026-04-17

## Summary

This release adds configurable CRFV attendance timing with global defaults, per-event overrides, and punctuality tracking for AM/PM check-in.

## Included Changes

- Added a two-layer CRFV attendance schedule model:
  - global default attendance template for future events
  - per-event attendance schedule persisted independently from later default changes
- Added new CRFV settings API support:
  - `GET /api/crfv/settings/attendance-defaults`
  - `PUT /api/crfv/settings/attendance-defaults`
- Extended event create/update flows so new events inherit the current default schedule and existing events can override it.
- Reworked CRFV event management UI:
  - default attendance schedule editor
  - per-event attendance schedule editor
  - reset-to-current-default behavior in create/edit flows
- Reworked CRFV attendance runtime:
  - scanner now reads the active event schedule instead of hard-coded slot windows
  - slot assignment follows the saved event schedule
  - punctuality is stored as `punctuality_status` and `late_minutes`
  - attendance page now shows the active schedule summary
- Extended attendance summary and reports:
  - AM/PM on-time vs late counters
  - punctuality columns in tables and exports
- Added supporting tests for:
  - schedule validation and slot/punctuality classification
  - guarded CRFV attendance-defaults API access

## Verification

Verified with:

```powershell
npx jest tests/unit/crfvAttendanceSchedule.test.js tests/smoke/crfvAttendanceSettingsApi.test.js tests/smoke/crfvRouteAccess.test.js --runInBand
npx jest tests/smoke/mutationRouteGuards.test.js tests/smoke/routeAuthGuards.test.js --runInBand
```

Result: 25 tests passed across the targeted unit and smoke coverage for CRFV schedule logic, CRFV route access, and auth guards.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`
