# UX Refactor Roadmap

Updated: 2026-06-08

## What this is

A single prioritized action list synthesizing the findings docs in this folder:
- `role-journey-findings.md` — per-role walkthroughs and friction points
- `navigation-ia-audit.md` — information-architecture problems
- `mobile-responsiveness-audit.md` — per-width layout issues
- `content-creation-workflows.md` — index into five code-traced "create a [blog|lesson|class|assignment|quiz]" workflow docs (`blog-creation-workflow.md`, `lesson-creation-workflow.md`, `class-creation-workflow.md`, `assignment-workflow.md`, `quiz-creation-workflow.md`), each ending in a "What to work on" checklist; includes a confirmed dead end (`/teacher/lessons/new`) and overloaded terminology ("assignment", "quiz") not yet folded into the prioritized list below

This roadmap is **UX-driven** — it extends, and explicitly does not duplicate, the existing structural/security tracker (`../webapp-improvement-checklist.md`) or the stylesheet tracker (`../css-audit.md`). Where an item here overlaps one already tracked there, it's referenced by ID rather than re-listed (e.g. don't re-litigate `STR-04` or CSS file consolidation here — go to those docs for that work).

**Priority key:** P1 = blocks core experience / actively damages trust, fix first. P2 = clear friction, fix soon. P3 = polish, fix when convenient.
**Effort key:** S = small (hours, single file/area), M = medium (a few files, needs some design thought), L = large (cross-cutting, needs a shared component or pattern).

---

## P1 — Fix first (these dominate everything else)

### P1-1. Fix the `reportsApi` router-shadowing bug that breaks most of the authenticated product
**Status:** ✅ Fixed 2026-06-08 — replaced the blanket `router.use(requirePrivilegedRole)` with per-route guards on all 13 `reportsApi` routes (same protection, no longer shadows `/api/student/*`, `/api/teacher/*`, `/api/quiz-builder/*`, `/api/live-games/*`). Added a regression suite in `tests/smoke/reportsApi.test.js` mounting `reportsApi` and `studentWebRoutes` together in production order — confirms a non-privileged student session reaches `/api/student/classes` (200) while CRFV's own admin/manager-only routes still correctly return 403.

**Why it's #1:** This single bug is the reason the student and teacher journeys read as "broken" rather than "rough around the edges." Until it's fixed, no IA or layout polish on these pages matters — the pages aren't loading their data. It is **not specific to test accounts**; it affects every real student and teacher session.

- **What's wrong:** `routes/reportsApi.js:22,29` applies a blanket, unscoped `router.use(requirePrivilegedRole)` (where `requirePrivilegedRole = requireRole('admin', 'manager')`) to its entire router. `app/registerRoutes.js:145` mounts this router at the generic prefix `app.use('/api', reportsApi)` — **before** `createStudentWebRoutes` (line 202), `createTeacherClassManagementApiRoutes` (line 318), and the quiz-builder/live-games/lesson-quiz/student-ethnicity routers (lines 146-209). Because Express dispatches routers in registration order and `/api` is a prefix-match for all of these, every request from a non-admin/non-manager session gets intercepted by this guard first and receives an immediate `403 {"success":false,"message":"Forbidden"}` — the intended handlers are never reached.
- **Confirmed broken in production for student AND teacher roles** (live-traced, not test-account artifacts):
  - `GET /api/student/classes`, `/api/student/activities`, `/api/student/attendance` (student dashboard, classes, activities, attendance)
  - `GET /api/quiz-builder/quizzes` (teacher quiz dashboard — fails *silently*, see P1-2)
  - `GET /api/live-games` (teacher ClassRush)
  - `GET /api/teacher/classes` (teacher dashboard class count, via `routes/teacherClassManagementApiRoutes.js` mounted at line 318)
- **Affected files:** `routes/reportsApi.js:22,29`, `app/registerRoutes.js:145` (and the mount-order relationship to lines 146-209, 202, 318)
- **Suggested fix shape:** scope `requirePrivilegedRole` to `reportsApi`'s own routes only (apply it per-route or via `router.get(path, requirePrivilegedRole, handler)` instead of a blanket `router.use`), **or** mount `reportsApi` at a narrower, CRFV/reports-specific prefix that can't shadow `/api/student/*`, `/api/teacher/*`, `/api/quiz-builder/*`, `/api/live-games/*`. Either fix should be paired with a regression test asserting that a non-privileged session can still reach `/api/student/classes`, `/api/teacher/classes`, `/api/quiz-builder/quizzes`, and `/api/live-games` (the existing `tests/smoke/studentClassesApi.test.js` shows the pattern for this).
- **Effort:** S–M (the fix itself is likely small; verifying it doesn't regress `reportsApi`'s own CRFV routes, and adding the missing route-level coverage, is the bulk of the work)
- **Detail:** `role-journey-findings.md` → "Read this first" + Student #1 + Teacher #1

### P1-2. Stop rendering raw backend error strings as page copy — across the whole app
**Status:** ✅ Fixed 2026-06-08 — swept `error.message`/`data.message`/raw `err.message` renders out of `studentDashboard.js`, `studentClasses.js`, `activities.js`, `attendance.js`, `studentGrades.js`, and `teacherGameDashboard.js`, replacing them with role-appropriate friendly fallback copy (raw errors are still `console.error`'d for debugging). Rewrote the admin overview's hardcoded developer-facing strings (e.g. "Users loaded from `/api/admin/users`") into plain product language in `views/pages/admin/dashboard.ejs`. Left untouched the join-class flows and announcement handlers in `studentDashboard.js`/`studentClasses.js`, which intentionally render legitimate backend validation messages (e.g. "You're already enrolled in this class") rather than raw technical errors — confirmed a final grep shows zero literal `"Forbidden"` strings remain in any client-rendered path.

**Why it matters:** Even after P1-1 is fixed, this pattern will resurface the next time *any* fetch fails for *any* reason — and right now it surfaces as things like "Forbidden" badges next to a student's name, a "Forbidden" toast on ClassRush, and a literal route path (`` `/api/admin/users` ``) in the admin overview copy. This is also a `../content-style-guide.md` violation (developer-POV strings reaching end users).

- **Where it shows up today:**
  - `public/js/studentDashboard.js:178,215,217` — writes `error.message` into `joinedClassMeta`/`openActivityMeta`/`overdueMeta`
  - `public/js/studentClasses.js:615-617,650-661` — throws and then renders `data.message`/`error.message` into the hero status pill, results meta, and empty states
  - Likely the same pattern in `public/js/activities.js`, `public/js/attendance.js`, and the teacher ClassRush JS — worth a quick grep for `error.message` / `setText(.*error` across `public/js/` to catch every instance in one pass
  - `views/pages/admin/dashboard.ejs` overview copy ("Users loaded from `/api/admin/users`") — a hardcoded developer-facing string, not a fetch-error artifact, but the same underlying anti-pattern (raw technical text in user-facing copy)
- **Suggested fix shape:** introduce one shared helper (or convention) for "fetch failed → friendly message," e.g. `friendlyFetchError(context)` that always returns role-appropriate copy ("We couldn't load your classes right now — try again in a moment") regardless of what the backend returned, and use it everywhere `error.message` is currently rendered. Separately, rewrite the admin overview's hardcoded copy in plain product language.
- **Effort:** M (mostly mechanical once the shared helper exists, but needs a careful sweep of `public/js/` to catch every instance)
- **Detail:** `role-journey-findings.md` → Student #1, Teacher #1, Admin #1; "Cross-cutting observations"

### P1-3. Fix the `/grades` mobile card-overlap layout bug
**Status:** ✅ Fixed 2026-06-08 — root cause was a CSS specificity conflict in `public/css/student_dashboard.css`: the always-on two-class rule `.student-dashboard-grid.dashboard-main-grid` (specificity 0,2,0, forcing a 320px-minimum second column) was outranking the single-class collapse rules inside `@media (max-width: 980px)` (specificity 0,1,0, `grid-template-columns: 1fr`), so the grid never actually collapsed to one column on phones. Raised the responsive rule's selector to match the base rule's specificity — a 2-line change. Verified with a standalone harness loading the real stylesheet against the actual `/grades` markup at 375px: the two cards now stack vertically with zero overlap (measured bounding boxes confirm no intersection). Also confirmed `/dashboard` (uses the higher-specificity `.dashboard-utility-grid` combo, already single-column) and `/classes` (doesn't use this grid) aren't affected by the same bug.

**Why it's P1, not P2:** unlike most layout issues, this one makes the page look *broken* (overlapping, half-rendered cards), not just unpolished — and Grades is a named core pillar of the product. A glitch this visible on a trust-sensitive page (viewing one's own academic records) does outsized damage.

- **What's wrong:** at 375px, the "Quick Access — Student Tools" card overlaps the card above it — text from the grades-summary panel bleeds through behind the tools tile grid (and the reverse happens further down the scroll).
- **Affected files:** `views/pages/student/grades.ejs` and its associated styles — likely a missing top-margin or incorrect stacking context (`z-index`/`position`) between adjacent cards. Check whether `../css-audit.md` already has a "card spacing" or "z-index" item this should be filed under instead of opened fresh.
- **Effort:** S (almost certainly a spacing/z-index fix once the offending rule is found)
- **Detail:** `role-journey-findings.md` → Student #2; `mobile-responsiveness-audit.md` → Student workspace table

---

## P2 — Clear friction, fix soon

### P2-1. Differentiate "scroll to a section" from "go to a different page" in the teacher and admin sidebars
**Status:** ✅ Fixed 2026-06-09 — the teacher dashboard sidebar already separated in-page anchors under "On this page" from real navigation under "Go to" (with "Classes" disambiguated into "Class summary" vs. "Class Management"); the admin dashboard sidebar (`views/pages/admin/dashboard.ejs:25-37`) now gets the same treatment: the four `data-panel` toggles (Overview/Grade Search/Attendance/Imports) sit under an "On this page" heading, and the two real-navigation links (User Management, Teacher Verification) sit under "Go to," styled via new `.sidebar-nav-heading`/`.sidebar-nav-compact`/`.sidebar-nav-links` rules in `admin_dashboard.css`. Verified visually via the same static-HTML harness technique used for P2-4 (loads real CSS against the changed markup); `adminPages.test.js` passes.

**Why it matters:** this is the clearest pure-IA problem found — two icon+label rows that look identical but behave differently, including a duplicated "Classes" label pointing at two different destinations. It actively misleads, rather than just looking rough.

- **Where:** `views/pages/teacher/dashboard.ejs:54-71` (anchor nav) vs. `:72-89` (page-nav shortcuts); `views/pages/admin/dashboard.ejs:25-32` (mixes `href="#" data-panel="…"` panel-toggles with `href="/admin/users"` real navigation in one undifferentiated list)
- **Suggested fix shape:** visually separate the two groups with distinct headers/treatments (e.g. "On this page" vs. "Quick actions" / "Go to"), and rename the duplicated "Classes" entries so their destinations are unambiguous before a user clicks
- **Effort:** M (mostly markup/CSS restructuring within two existing templates; no new routes needed)
- **Detail:** `navigation-ia-audit.md` → Problem 1; `role-journey-findings.md` → Teacher #2

### P2-2. Add `/grades` to the primary student navigation
**Status:** Fixed 2026-06-08 — added `Grades` to the authenticated student branch in `views/partials/nav.ejs`, fixed the shared layout's current-path handoff, and corrected the active-state attribute so `/grades` receives `aria-current="page"` correctly.

**Why it matters:** Grading is a named core pillar (`../hellouniversity.md` → Core Pillars → "Grading and Student Academic Access"), but it's currently reachable only via a dashboard tile — a student scanning the top nav for "where are my grades" won't find it.

- **Where:** `views/partials/nav.ejs:34-38` (authenticated-student branch currently lists Dashboard, Classes, Attendance, Activities — add Grades)
- **Effort:** S (one-line addition to an existing array, plus confirming the active-state matcher handles `/grades`)
- **Detail:** `navigation-ia-audit.md` → Problem 3; `role-journey-findings.md` → Student #3

### P2-3. Surface a visible error/retry state on the Quiz Dashboard (and audit other silent-failure surfaces)
**Status:** ✅ Fixed 2026-06-08 — a failed `/api/quiz-builder/quizzes` load now renders a dedicated error card in the cards area ("We couldn't load your quizzes right now... try again") with an inline **Try again** button wired straight back to `loadQuizzes()`, instead of the misleading "No quizzes found for the current filters" empty-state. The four KPI tiles reset to `-` (their loading placeholder) rather than `0` on failure, so a load error no longer reads as "you have zero quizzes." Also fixed a leftover P1-2-pattern instance found in the same code path: the status line was still rendering the raw `error.message` from the backend — replaced with the same friendly "We couldn't load your quizzes — try again in a moment" copy used elsewhere (raw error still `console.error`'d for debugging).

**Why it mattered:** once P1-1 is fixed, fetches will mostly succeed — but the *next* time one fails (network blip, server hiccup), the Quiz Dashboard would have silently shown "Total Quizzes: 0" with a raw backend string in the status line and an empty-state that reads as "you have no quizzes," not "something went wrong." That's strictly worse than ClassRush's (unfriendly but at least visible and honest) "Forbidden" toast — it actively misleads a teacher into thinking their workspace is empty.

- **Where:** `public/js/teacherQuizDashboard.js` — `loadQuizzes()` catch block, plus new `renderLoadError()` / `resetSummary()` helpers
- **Suggested follow-up:** audit other dashboards/lists for the same silent-zero-state pattern (the admin overview's stuck "-" tiles are the other clear instance — see P2-4) and apply the same visible-state convention everywhere
- **Effort:** S–M
- **Detail:** `role-journey-findings.md` → Teacher #1; `mobile-responsiveness-audit.md` → "Data/content issues" summary

### P2-4. Replace the admin overview's stuck "-" placeholders with real empty-state guidance
**Status:** ✅ Fixed 2026-06-08 — the "Total registered users" tile now loads its real count via a lightweight `GET /api/admin/users?limit=1` fetch on dashboard init (`adminDashboardPanels.js:loadUserCountSummary`) instead of sitting on a permanent "-" (falls back to "Open Users to see this" on a load error, never a raw error string). The grade/attendance tiles — which genuinely have no data until the admin runs a search on those panels — now show "Awaiting search" in a smaller, muted style (new `.stat-placeholder` class in `admin_dashboard.css`) instead of a bare "-", and `updateSummary()` clears that styling and fills in the real count the moment a search returns results (including a real `0` when a search legitimately finds nothing).

**Why it mattered:** three of four admin overview tiles permanently showed "-" with no indication that the admin needed to run a search elsewhere first — it read as broken, not as "waiting for input," and the user-count tile in particular promised a "Total registered users" stat that could never actually appear without a page reload after visiting `/admin/users`.

- **Where:** `views/pages/admin/dashboard.ejs` overview tiles, `public/js/adminDashboardPanels.js`, `public/css/admin_dashboard.css`
- **Effort:** S
- **Detail:** `role-journey-findings.md` → Admin #1

### P2-5. Make `/admin/users` usable on narrow viewports
**Status:** Fixed 2026-06-08 — `/admin/users` now renders mobile/tablet rows as labeled cards below the mobile breakpoint and exposes an explicit `Manage` action that opens the existing user-detail modal, so touch users no longer depend on double-click.

**Why it matters:** the table currently keeps its full desktop column set and clips overflow at 375px (Email truncates to "he..."), and "Double-click a row" has no touch equivalent — an admin can't actually manage users from a phone or tablet today.

- **Where:** `views/pages/admin/users.ejs` and its table styles
- **Suggested fix shape:** below a width threshold, switch to a stacked card-per-user layout or a horizontally scrollable table with a visible "scroll for more" affordance; add an explicit, always-visible row action (a "View" button, or single-tap-to-expand) alongside or instead of double-click
- **Effort:** M (table → card transformation at a breakpoint is a real layout change, not a tweak)
- **Detail:** `role-journey-findings.md` → Admin #2; `mobile-responsiveness-audit.md` → Admin table

### P2-6. Section the `/signup` form so it doesn't read as one undifferentiated wall of fields on mobile
**Status:** Fixed 2026-06-08 — the signup form is grouped into four semantic sections (`Account type`, `Your details`, `Your school`, `Set a password`) using the existing `auth.css` visual system, without changing field ids/names or backend submission behavior.

**Why it matters:** ~12 form sections run together with only one inline sub-heading; on a 375px screen this is a long, undifferentiated scroll that increases perceived effort right at the moment a new user is deciding whether to commit.

- **Where:** `views/pages/auth/signup.ejs` (see `../route-map.md` → Auth and Account → `routes/signupApi.js` for the backend side)
- **Suggested fix shape:** group fields into visually distinct labeled sections ("Account type" → "Your details" → "Your school" → "Set a password") with spacing and sub-headers — `/teacher/classes/new` (`views/pages/teacher/classes/editor.ejs:15-16`, eyebrow "Class Editor" + grouped "Identity" section) already demonstrates this grouping pattern well and can be used as the reference
- **Effort:** M
- **Detail:** `role-journey-findings.md` → Public #2; `mobile-responsiveness-audit.md` → Public site table

---

## P3 — Polish, fix when convenient

### P3-1. Fix the home page's mobile quick-link card label clipping
**Status:** Fixed 2026-06-08 — the quick-link panel switches to two columns on narrow phones, allows labels to wrap, and keeps each card's tag visible so labels no longer clip mid-word.

Switch the 6-card grid to 2 columns (or allow label wrapping) below ~480px so "Featu...", "Class..." etc. become readable. **Effort: S.** Detail: `role-journey-findings.md` → Public #1; `mobile-responsiveness-audit.md`.

### P3-2. Add visible labels to icon-only nav rows at narrow widths
**Status:** Fixed 2026-06-08 for `/lessons` and the teacher dashboard sidebar — labels are now visible at narrow widths instead of being hover-only tooltips.

`/lessons` top quick-link row and the teacher dashboard sidebar both rely on `title`/`aria-label` that aren't visible to sighted touch users. Show short text labels (or switch to a labeled chip/scroll list) below the breakpoint where icons currently run alone. **Effort: S–M** (multiple locations, same fix pattern). Detail: `role-journey-findings.md` → Public #3, "Cross-cutting observations"; `navigation-ia-audit.md`.

### P3-3. Promote page identity out of the small "eyebrow" label and into the `<h1>` on student pages
**Status:** ✅ Fixed 2026-06-09 — `classes.ejs`, `grades.ejs`, `attendance.ejs`, and `activities.ejs` now lead with `<h1>My Classes</h1>` / `<h1>Grades</h1>` / `<h1>Attendance</h1>` / `<h1>Activities</h1>`, with the personalized "Hi, {Name}" greeting demoted to the small eyebrow chip above it (swapped roles — page identity promoted to the prominent slot, greeting becomes supporting context, per the suggested fix shape below). `dashboard.ejs` intentionally keeps its `<h1>Hello, {Name}.</h1>` as-is — as the actual landing/home page, a personalized greeting there is the right call and it's now the only page that shows one, so it no longer collides with four identical-looking utility-page headers. Found and fixed a `display: inline-flex` whitespace-collapse quirk on the attendance/activities eyebrow pills along the way (needed `&nbsp;` after the comma). Verified visually via the same static-HTML harness technique as P2-4/P2-1; updated two smoke-test assertions (`studentAttendancePage.test.js`, `studentActivitiesPage.test.js`) that checked for the old `'Student Attendance'`/`'Student Activities'` eyebrow strings to check for the new `<h1>` text instead.

Every student page used to open with an identical `<h1>Hello, {Name}.</h1>`, with the actual page identity ("My Classes," "Grades," etc.) tucked into a much smaller, lower-contrast eyebrow label above it — making pages hard to tell apart at a glance while navigating quickly. Consider restructuring so the most prominent text answers "what page is this" (e.g. `<h1>My Classes</h1>` with the greeting as supporting copy). **Effort: M** (touches five page templates + their copy). Detail: `navigation-ia-audit.md` → Problem 4.

### P3-4. Resolve the "two tiles, one destination" promise on the student dashboard
"Open Activities" and "Overdue Work" are presented as distinct stat tiles with separate counts, but both link to the same `/activities` URL with no filtering — the IA over-promises relative to what the destination delivers. Either add a filter param the "Overdue Work" tile can target (`/activities?filter=overdue`), or otherwise align what's promised with what's delivered. **Effort: S–M** depending on whether `/activities` already supports server-side filtering. Detail: `navigation-ia-audit.md` → Problem 2.

✅ **Fixed 2026-06-09** — The "Overdue Work" tile now links to `/activities?filter=overdue` (the "Open Activities" tile keeps the plain `/activities` link, since it represents the unfiltered set). On the activities page, `activities.js` reads the `filter` query param via `URLSearchParams`, and — before the first `applyFilters()` call — pre-selects the matching `<option>` in `#activitiesStatusSelect` if one exists, so the page opens already narrowed to overdue items. Verified end-to-end with a stub HTTP server + Puppeteer (not just a static screenshot): confirmed both that the dropdown pre-selects `overdue` and that the results list and "Showing N filtered activity item(s)" summary correctly narrow from 3 total rows to 1 overdue row.

### P3-5. True tablet-width (768px) layouts instead of stretched mobile layouts
**Status:** Partially fixed 2026-06-08 — the home quick-link area and student class/grades workspace grids now keep useful intermediate tablet layouts where space allows. A broader breakpoint inventory is still worthwhile for pages outside this targeted pass.

Multiple pages (home, student classes, likely others) render a single-column mobile layout stretched across the full tablet width with large unused side margins, instead of a 2-column intermediate treatment. This is best tackled as a deliberate breakpoint pass rather than page-by-page — likely worth coordinating with whatever breakpoint inventory exists in `../css-audit.md`. **Effort: L** (cross-cutting, needs a shared breakpoint convention). Detail: `mobile-responsiveness-audit.md` → "Cross-cutting pattern."

### P3-6. Add lightweight breadcrumbs to deeper authenticated views
The IA is currently shallow enough that this isn't urgent, but as soon as nested flows (e.g. `/classes/:classId` → materials → a specific material — already documented in `../route-map.md`) get more use, the lack of any breadcrumb/wayfinding beyond the browser back button will start to matter. Worth planning for now so it's built alongside new nested-page work rather than retrofitted. **Effort: M** (needs a shared breadcrumb partial + per-template wiring). Detail: `navigation-ia-audit.md` → Problem 5.

### P3-7. Surface the single-class-per-quiz constraint before a teacher hits it
A quiz can only be linked to one class at a time (`quizBuilderApiRoutes.js:119`, `syncQuizClassAssignment`). If a teacher re-links a quiz to a different class — or clears the class entirely — and then publishes, all existing student assignments for the old class are silently deleted (the publish route calls `classQuizCollection.deleteMany({ quizId, classId: { $ne: newClassId } })`). There is no warning at the point where this destruction actually occurs. The tooltip on the class `<select>` says "Leave this blank if you want to assign the quiz to a class later" — which accidentally implies that clearing the class is safe. **Effort: S** (surface the warning) / **L** (lift the one-class limit entirely, which requires changing `quiz.classId` to a `classIds[]` array, updating all downstream queries, and migrating existing data).

✅ **Fixed 2026-06-09 (surface path)** — `teacherQuizBuilder.js` now captures `state.loadedClassId` when a quiz loads in edit mode. The existing `change` listener on `#teacherQuizClassId` calls a new `updateClassChangeWarning()` function that shows a red warning label (`#quizClassChangeWarning`) whenever the current value differs from what was loaded — alerting the teacher before they publish that changing the linked class will permanently remove all existing student assignments. The warning disappears automatically if the teacher reverts to the original class. The "lift the constraint" path remains a separate, larger item if multi-class quiz assignment ever becomes a feature requirement.

### P3-8. Decide on the direction for assignment-editor convergence
The quiz-assignment flow and the live-game (ClassRush) assignment editor have diverged into very different patterns: the live-game editor is a single modal with class + student targeting + start/due dates + due policy + scoring profile all in one place; the quiz-assignment flow splits targeting (in the "Manage Access" modal on the Quiz Dashboard) from dates (in the quiz builder's Settings tab), forcing a teacher to leave the assignment flow and re-open the builder just to change when the quiz is available. **Effort for full convergence: M–L** (shared component, different data models). **Effort for minimum-viable date move: M** (add start/due date inputs to the "Manage Access" modal, write them to `classQuizCollection` directly rather than via `quiz.settings`).

**Direction (2026-06-09):** Full technical convergence of the two editors into a single shared component would be a forced abstraction — the data models are different collections and the UX concerns differ (live games have real-time scoring and lock-after-due logic that has no equivalent in the quiz flow). The right, minimum fix is to move start/due date fields into the "Manage Access" modal (`public/js/teacherQuizDashboard.js`) so a teacher can set who-gets-it AND when in one place, without touching the builder. Not yet implemented; leave as a tracked next-step when the assignment modal is next touched.

---

## How this roadmap relates to the other trackers

- **`../webapp-improvement-checklist.md`** already owns structural/security items like `STR-04` (audit unused route files — note that `middleware/authMiddleware.js` was confirmed dead/unused during this audit and would be a good concrete entry for that item) and `UI-02` (hiding unfinished placeholder surfaces). This roadmap doesn't duplicate those — it adds the *experience-shaped* items that tracker doesn't cover (IA, navigation consistency, mobile layout, copy/tone in error states).
- **`../css-audit.md`** owns stylesheet-level cleanup. Several P1/P2 items here (the `/grades` overlap, the tablet stretching pattern, the admin table) will likely resolve into specific file/rule changes that belong in that doc's per-file recommendations — when picking these up, check there first for an existing entry before opening a new one.
- **`../hellouniversity.md`** / **`../hellouniversity-prd.md`** own the feature roadmap. Nothing here proposes new features — every item is about making existing, already-planned functionality easier to find, trust, and use on the screen sizes people actually have.

## Suggested sequencing

1. **P1-1 first, alone.** Everything else about the student/teacher experience is unverifiable until this lands — don't spend roadmap effort on pages whose data isn't loading.
2. **P1-2 and P1-3 next**, in either order — both are isolated, well-scoped fixes that immediately remove the most visibly "broken-looking" things in the product.
3. **P2 items** can proceed in parallel once P1 is clear — they're independent of each other and of the bug fix.
4. **P3 items** are genuinely lower-stakes polish — good candidates for "pick up when touching the relevant template for another reason" rather than a dedicated pass, except P3-5 (tablet layouts), which benefits from being planned as one deliberate cross-cutting pass rather than page-by-page patches.
