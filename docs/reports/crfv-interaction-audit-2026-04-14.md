# CRFV Full Interaction Audit - 2026-04-14

## Scope and method
- Scope: full `/crfv` surface across public pages, protected user pages, and protected admin/manager pages.
- Device target: desktop and phone-sized layouts by static inspection of templates, scripts, CSS hooks, and route guards.
- Auth states reviewed: logged out, authenticated user, authenticated admin/manager.
- Evidence sources: `routes/crfvPagesRoutes.js`, active CRFV page templates in `views/pages/crfv`, active CRFV scripts in `public/crfv/js`, and the mounted API owners in `app/registerRoutes.js` plus the individual route modules.
- Limitation: I could not complete a live browser automation pass in this sandbox because ad hoc Node module loading for a request harness hit an `EPERM lstat C:\Users\Kayla Ryhs` resolution error. Findings below are therefore based on route rendering rules, page/script consistency checks, and client-to-API contract tracing.

## Summary
- Overall result: `/crfv` is partially healthy, but not all buttons and features work properly.
- Public informational pages are mostly wired correctly.
- The strongest breakages are concentrated in `payment-reports`, `attendance`, and `admin-register`.
- Protected-page route blocking is configured correctly for logged-out access.
- There is also legacy drift in unused scripts and dead code paths that increases regression risk.

## Prioritized findings

### 1. `payment-reports` detail modal cannot save or delete records
- Status: `broken`
- Page: `/crfv/payment-reports`
- Repro:
  1. Open Payment Reports as an admin/manager.
  2. Select an event and open a row's `Details` modal.
  3. Click `Save` or `Delete`.
- Expected: save issues a supported update request; delete is available to authorized roles and removes the record.
- Actual:
  - The script sends `PUT` and `DELETE` to `/api/payments-report/:payment_id` in `public/crfv/js/payment-reports.js:364` and `public/crfv/js/payment-reports.js:381`.
  - The mounted backend only implements `GET /api/payments-report` in `routes/paymentsReportsApi.js:10`.
  - The modal role gate defaults to `window.currentUserRole || 'user'` in `public/crfv/js/payment-reports.js:342`, and nothing in the CRFV page stack sets `window.currentUserRole`, so the Delete button stays hidden even for admins/managers.
- Likely root cause: the page was built with edit/delete UI, but the API module only shipped the list endpoint and the role bootstrap was never completed.
- Recommended fix: either implement `PUT /api/payments-report/:id` and `DELETE /api/payments-report/:id` plus real role injection, or remove/disable the modal edit/delete controls and treat the page as read-only.
- Regression test: authenticated admin request flow covering load event -> open details -> save -> delete.

### 2. `payment-reports` includes visible controls that are dead or internally inconsistent
- Status: `broken`
- Page: `/crfv/payment-reports`
- Repro:
  1. Open Payment Reports.
  2. Click `Columns`.
  3. Export a report and inspect audit logging / totals.
- Expected: column picker opens and allows column selection; summary totals align with CRFV payment statuses; export logging uses a supported endpoint.
- Actual:
  - The page renders `#showColumnPickerBtn` and `#columnPickerDropdown` in `views/pages/crfv/payment-reports.ejs:38-39`, but `payment-reports.js` never binds a click handler for them and leaves `setupColumnPicker()` commented out at `public/crfv/js/payment-reports.js:56`.
  - Summary math only treats `payment_status.toLowerCase() === 'paid'` as collected in `public/crfv/js/payment-reports.js:259`, while the rest of CRFV uses statuses like `Fully Paid`, `Partially Paid`, and `Accounts Receivable`.
  - Export logging posts to `/api/audit-trail` in `public/crfv/js/payment-reports.js:334`, but `routes/auditTrailApi.js:8` only exposes `GET /audit-trail`.
- Likely root cause: the page diverged from the CRFV reporting/payment conventions and was never fully integrated with the audit API.
- Recommended fix: either finish the column picker flow and audit logging API support, or remove those controls; align summary calculations with the canonical CRFV payment status vocabulary.
- Regression test: UI test for `Columns`, export-XLSX, export-PDF, and summary totals against mixed payment statuses.

### 3. `/crfv/attendance` contains a live null-dereference and a dead auxiliary endpoint
- Status: `broken`
- Page: `/crfv/attendance`
- Repro:
  1. Open the Attendance page.
  2. Load the page with the current script bundle.
  3. Watch console/runtime behavior and event-selection wiring.
- Expected: the page initializes without DOM errors and all configured event/time-slot helpers are backed by real elements and endpoints.
- Actual:
  - The script fetches `/api/timeslots` at `public/crfv/js/attendance.js:51`, but no mounted route for `/api/timeslots` exists in the active route modules; only a backup text file references the old Apps Script behavior.
  - The script dereferences `document.getElementById('eventSelect')` at `public/crfv/js/attendance.js:697` and again at `public/crfv/js/attendance.js:734`, but the active template `views/pages/crfv/attendance.ejs` contains no `id="eventSelect"` element.
- Impact:
  - The missing `eventSelect` produces a runtime error during script boot.
  - The time-slot customization path is effectively dead and always falls back to default slot logic.
- Likely root cause: the page template was simplified to a single-current-event flow, but the older multi-event attendance script was not cleaned up.
- Recommended fix: remove the dead `eventSelect` path or restore the matching control; either implement `/api/timeslots` or delete that bootstrap path and document the fixed default slot schedule.
- Regression test: page-load smoke test asserting no null-deref on boot and no unresolved attendance helper endpoints.

### 4. `admin-register` bulk upload initialization breaks after a null form lookup
- Status: `broken`
- Page: `/crfv/admin-register`
- Repro:
  1. Open Admin Register as an admin/manager.
  2. Let the script initialize.
  3. Attempt to use the bulk upload controls.
- Expected: both single registration and bulk upload bindings initialize cleanly.
- Actual:
  - Single registration uses `#registerForm` and is wired earlier in the file.
  - Later, the script does `const form = document.getElementById('adminRegisterForm'); form.addEventListener(...)` in `public/crfv/js/admin-register.js:138`, but the active template only renders `id="registerForm"` in `views/pages/crfv/admin-register.ejs:57`.
  - Because the null dereference occurs before the bulk-upload listeners are attached lower in the same callback, the bulk-upload flow after that point does not finish bootstrapping.
- Likely root cause: an old form ID survived a refactor from `adminRegisterForm` to `registerForm`.
- Recommended fix: replace the dead `adminRegisterForm` lookup with the active form ID or remove that duplicate RFID-required block entirely.
- Regression test: page-load smoke test for admin-register plus bulk upload button state changes after file and event selection.

### 5. The CRFV landing page still ships server-rendered auth forms that post to routes that do not exist
- Status: `broken`
- Page: `/crfv` / `/crfv/index`
- Repro:
  1. Open the CRFV landing page with JS disabled or before the client rewrites the side panel.
  2. Submit the rendered sign-in or sign-out form.
- Expected: form actions target live auth endpoints.
- Actual:
  - The EJS template posts to `/crfv/login` and `/crfv/logout` in `views/pages/crfv/index.ejs:115` and `views/pages/crfv/index.ejs:179`.
  - The active auth routes expose `/login` and `/logout` in `routes/authWebRoutes.js:269` and `routes/authWebRoutes.js:272`.
  - `public/crfv/js/index.js` masks this by replacing the panel with a client-side auth flow after load, but the server-rendered fallback is still wrong.
- Likely root cause: route names changed and the template fallback was never updated.
- Recommended fix: point the fallback forms at `/login` and `/logout`, or remove the stale server-rendered forms entirely and render only the client-side panel shell.
- Regression test: no-JS/fallback route test for CRFV landing auth panel.

### 6. Audit-trail pagination currently depends on inline handlers and will fail under enforced CSP
- Status: `legacy/dead risk`
- Page: `/crfv/audittrail`
- Repro:
  1. Open Audit Trail.
  2. Use pagination under a CSP policy that blocks inline handlers.
- Expected: pagination uses normal JS event listeners.
- Actual:
  - Pagination buttons are emitted with inline `onclick="reloadLogs(...)"` in `public/crfv/js/audittrail.js:181` and `public/crfv/js/audittrail.js:185`.
  - The app CSP is configured in `app/setupCoreMiddleware.js:25-33` with `scriptSrc` nonces and `reportOnly` mode by default, so the page works today only because CSP is not currently enforced.
- Likely root cause: older inline-handler markup survived while the rest of the app moved toward stricter CSP.
- Recommended fix: replace inline pagination handlers with delegated or direct listener binding after render.
- Regression test: audit-trail pagination smoke test with CSP enforcement enabled in test config.

## Interaction matrix

### Public pages
| Page | Control group | Status | Notes |
| --- | --- | --- | --- |
| `/crfv` | Header nav links (`Home`, `Attendance`, `Register`, `Reports`, `Create Event`) | `working` | Links match active routes; protected destinations are still guard-protected server-side. |
| `/crfv` | Menu cards for protected pages | `auth-blocked as designed` | `index.js` disables protected cards when anonymous and the protected routes redirect when opened directly. |
| `/crfv` | Sign In/Out menu action | `working` | Handled by `public/crfv/js/index.js` through `authClient`. |
| `/crfv` | Server-rendered auth forms | `broken` | Fallback forms still post to `/crfv/login` and `/crfv/logout`. |
| `/crfv/attendance` | RFID input, reload, sync, offline-log download, mini login, logout | `working` | Core controls are wired to active handlers and live auth endpoints. |
| `/crfv/attendance` | Event selector helper | `broken` | Script expects `#eventSelect`, template does not provide it. |
| `/crfv/attendance` | Custom time slots bootstrap | `legacy/dead` | `/api/timeslots` is not mounted; page falls back to default slot logic. |
| `/crfv/user-register` | Step navigation, validation, agreement gating, final submit, confirmation copy | `working` | IDs and `/api/user-register` contract line up. |
| `/crfv/about` | Top nav, mobile menu, FAQ accordions | `working` | `about.js` exposes `window.toggleAnswer` for the inline FAQ hooks. |
| `/crfv/roles` | Top nav, mobile menu | `working` | No route or selector drift found. |
| `/crfv/privacy-policy` | Top nav, scroll-to-top | `working` | Script and template IDs line up. |
| `/crfv/event-agreement` | Top nav, mobile menu, scroll-to-top | `working` | Visible controls match the script. |
| `/crfv/event-agreement` | Accept-button/checkbox path | `legacy/dead` | `event-agreement.js` still looks for `#acceptBtn` and `#agreementCheckbox`, but the template does not render them. |

### Protected user page
| Page | Control group | Status | Notes |
| --- | --- | --- | --- |
| `/crfv/account-settings` | Profile edit/save/cancel | `working` | Uses `/api/account/profile` with CSRF token bootstrap. |
| `/crfv/account-settings` | Password edit/update/cancel/show-hide | `working` | Routed through `/api/account/change-password`. |
| `/crfv/account-settings` | Refresh session and logout | `working` | Uses `/api/check-auth` and `/api/logout`. |
| `/crfv/account-settings` | Logged-out access | `auth-blocked as designed` | Route guard and client check both redirect away. |

### Protected admin/manager pages
| Page | Control group | Status | Notes |
| --- | --- | --- | --- |
| `/crfv/event-create` | Create event form | `working` | `POST /api/events` exists and validation is mirrored client-side. |
| `/crfv/event-create` | Edit/archive/delete event flows | `working` | `PUT /api/events/:id`, `PATCH /api/events/:id/status`, and `DELETE /api/events/:id` all exist. |
| `/crfv/event-create` | Legacy `renderEvents()` helper | `legacy/dead` | Unused helper still contains stale creator logic. |
| `/crfv/admin-register` | Single registration form | `working` | Payload shape matches `userRegisterApi` closely enough to submit successfully. |
| `/crfv/admin-register` | Bulk upload flow | `broken` | Initialization stops at the null `adminRegisterForm` lookup before bulk listeners finish binding. |
| `/crfv/reports` | Tab switching, event filter, search, pagination, exports | `working` | Active routes and scripts line up; reports page uses `reports.js` + `reportscounter.js`. |
| `/crfv/reports` | Edit Info / Edit Payment modals | `working` | Recently fixed to use delegated handlers instead of inline `onclick`. |
| `/crfv/reports` | Dual attendance-table function definitions | `legacy/dead risk` | `reportscounter.js` overrides `reports.js` helpers; it works but is fragile. |
| `/crfv/attendanceSummary` | Event/date filters, search, sorting, selection, export | `working` | Uses live `/api/attendance-summary` endpoints and matching template IDs. |
| `/crfv/audittrail` | Load/filter/export | `working` | `GET /api/audit-trail` exists and matches the page workflow. |
| `/crfv/audittrail` | Pagination | `legacy/dead risk` | Inline `onclick` is CSP-fragile. |
| `/crfv/payment-reports` | Event select, table load, search, pagination, export | `working with caveats` | Read/list flow is backed by `GET /api/payments-report`; summary math is inaccurate and audit logging POST is unsupported. |
| `/crfv/payment-reports` | Column picker | `broken` | Button/dropdown are rendered but never initialized. |
| `/crfv/payment-reports` | Save/Delete in details modal | `broken` | Unsupported routes and missing role bootstrap. |
| Protected admin pages while logged out | Direct access | `auth-blocked as designed` | `isAdminOrManager` route guard protects event-create, admin-register, reports, attendanceSummary, audittrail, and payment-reports. |

## Legacy and maintenance drift to clean up
- `public/crfv/js/event-reports.js` and `public/crfv/js/reportsTabs.js` are present in the repo but are not loaded by `routes/crfvPagesRoutes.js`.
- `public/crfv/js/reportscounter.js` still contains dead `paymentStatusList` rendering logic, but `views/pages/crfv/reports.ejs` does not render that target.
- `public/crfv/js/event-agreement.js` still contains removed agreement-acceptance controls (`acceptBtn`, `agreementCheckbox`).
- The CRFV surface mixes current page scripts with stale fallback markup and older inline-handler patterns, which is the main regression source in this subsystem.

## Recommended next steps
1. Fix the `payment-reports` page first: either implement the missing mutation endpoints and role bootstrap or convert the page to explicitly read-only UI.
2. Remove the dead `eventSelect` and `/api/timeslots` paths from `attendance.js`, or restore the matching UI/API if multi-event selection is still required.
3. Fix `admin-register.js` to stop dereferencing `adminRegisterForm`, then verify the bulk upload listeners initialize after page load.
4. Replace remaining inline handlers in active CRFV pages, especially audit-trail pagination, so the subsystem survives future CSP enforcement.
5. Delete or archive the unused CRFV scripts and dead helper paths after the active pages are stabilized.
