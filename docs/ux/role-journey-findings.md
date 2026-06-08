# Role Journey Findings

Updated: 2026-06-08

## How this was produced

This doc is grounded in an actual click-through of the running app (`npm run dev`, `localhost:3100`) as four kinds of users — public visitor, student, teacher, admin — driven headlessly at **desktop (1280×800)**, **tablet (768×1024)**, and **mobile (375×812)** widths, with screenshots taken at each scroll position. Three seeded test accounts (`role: student/teacher/admin`) were used to reach authenticated areas. Every finding below cites an observed screen and, where relevant, the file/line that produces it — nothing here is speculative.

This doc covers **UX, IA, and friction** only. It does not duplicate:
- `../css-audit.md` (stylesheet-level cleanup)
- `../webapp-improvement-checklist.md` (structural/security refactor tracker)
- `../hellouniversity.md` / `../hellouniversity-prd.md` (feature roadmap)

See `navigation-ia-audit.md` for the IA-specific deep dive, `mobile-responsiveness-audit.md` for per-width layout issues, and `ux-refactor-roadmap.md` for the prioritized action list that synthesizes all of this.

---

## ⚠️ Read this first: a single bug breaks most of the authenticated product

Before getting into per-role UX notes: **the student and teacher journeys below are currently dominated by one cross-cutting bug, not by design/IA problems.** It's documented in full under [Student → Friction point 1](#1-critical--core-student-data-never-loads-this-is-a-bug-not-a-design-problem) because that's where it's most visible, but it also breaks ClassRush and the Quiz Dashboard for teachers (see [Teacher → Friction point 1](#1-the-same-root-cause-bug-breaks-classrush-and-quiz-builder-for-teachers)). It is **not specific to the seeded test accounts** — it's a router-mount-order bug that affects any real student or teacher session. Until it's fixed, no amount of IA polish will make these pages feel "intuitive," because the pages are not actually loading their data. It is the #1 item in `ux-refactor-roadmap.md`.

---

## Public Visitor

**Journey walked:** Home → About / Features / How it works → Teacher guide / Student guide / ClassRush guide → Lessons → Blogs → Login / Signup entry points.

### What works
- Visual identity (green/teal palette, card-based sections) is consistent across every public page at all three widths — the brand feels coherent, not stitched-together.
- Home, About, and Features pages explain the product in the "digital academic platform, not a university" framing that `hellouniversity.md` calls for, and the public guide pages (`/teacher-guide`, `/student-guide`) speak in user POV per `../content-style-guide.md`.
- `/lessons` presents a clear "start with one path, browse the catalog after" structure (`7 lesson tracks`, `76 public lessons`) that orients a first-time visitor quickly.

### Friction points

**1. Home page "quick links" grid truncates its own labels on mobile.**
The 6-card quick-link grid (Features / Teacher Guide / Student Guide / How It Works / Lessons / ClassRush) renders as a fixed 3-column grid that's too narrow for its labels at 375px — text clips mid-word: "Featu...", "Teac... Guid...", "Stud... Guid...", "How... Work...", "Class...".
- Screenshot: `home__mobile__s1.png`
- *Why confusing:* a visitor has to guess what a card leads to before tapping it — the truncation defeats the purpose of a "quick links" shortcut grid, which is to let people scan and choose without trial-and-error.
- *Suggested direction:* switch to a 2-column (or single-column) layout below ~480px, or let card labels wrap to two lines instead of clipping.

**2. The signup form is one long, undifferentiated scroll on mobile.**
`/signup` presents Account Type → First/Last Name → Student ID Number → Email → Institution Type → school search-or-manual-entry → Password/Confirm Password → Terms checkbox → reCAPTCHA → Submit as a single continuous column with only one inline sub-heading ("How do you want to add your school?"). There's no step indicator, section grouping, or progress cue.
- Screenshots: `signup__mobile__s0.png`, `signup__mobile__s1.png`
- *Why confusing:* on a small screen this reads as an unbroken wall of fields. A first-time visitor (especially a student signing up on a phone, which is the likely majority case for this audience) has no sense of how much is left, which increases perceived effort and abandonment risk.
- *Suggested direction:* group the form into visually distinct steps or sections (e.g., "Account type" → "Your details" → "Your school" → "Set a password"), even if it stays a single scroll — a sectioned layout with sub-headers and spacing communicates progress without needing a multi-step wizard.

**3. Icon-only quick-link rows appear with no visible label at small widths.**
`/lessons` (and other pages — see `navigation-ia-audit.md`) renders a row of 4 icon-only buttons above the main content with no on-screen text, relying on `title`/`aria-label` attributes that aren't visible on touch devices (no hover tooltip equivalent).
- Screenshot: `lessons__mobile__s0.png`; markup at `views/pages/lessons/index.ejs:43-46`
- *Why confusing:* a sighted mobile user can't tell what these icons do without tapping one and seeing where it goes — effectively turning navigation into guesswork.
- *Suggested direction:* show short text labels under/beside icons at narrow widths, or replace the row with a labeled horizontal scroll/chip list.

---

## Student

**Journey walked:** Login → `/dashboard` → `/classes` → `/activities` → `/attendance` → `/grades`.

### What works
- The "Hello, [Name]." hero greeting on each page gives the workspace a personal, welcoming tone, and each page opens with a one-line description of what it's for.
- The dashboard's "Join a Class — use your teacher's class code" panel puts the single most important first action front and center.

### Friction points

#### 1. CRITICAL — core student data never loads. This is a bug, not a design problem.

Every primary student page (`/dashboard`, `/classes`, `/activities`, `/attendance`) shows **"0" for every stat and the literal word "Forbidden" rendered as if it were normal page copy**:

- On `/dashboard` (mobile), the three stat rows read: **"JOINED CLASSES — 0 — Forbidden"**, **"OPEN ACTIVITIES — 0 — Forbidden"**, **"OVERDUE WORK — 0 — Forbidden"** — "Forbidden" appears as the *description line* under each stat, exactly where friendly explanatory text ("Classes currently linked to your account") should be. Screenshot: `student-dashboard__mobile__s0.png`.
- On `/classes`, a pill-styled badge reading **"Forbidden"** sits directly beside the "Student" role badge and "Student ID: 9000001" pill — visually identical in styling to a status indicator, so it reads as if the platform is telling the student their account has been denied something. Screenshot: `student-classes__mobile__s0.png`.

**This is not an artifact of the seeded test accounts — it's a real, reproducible production bug** that will hit any logged-in student (and teacher; see below). Root cause, traced end-to-end via live network interception and source reading:

1. `routes/reportsApi.js:22` defines `const requirePrivilegedRole = requireRole('admin', 'manager');` and `routes/reportsApi.js:29` applies it as a **blanket, unscoped `router.use(requirePrivilegedRole)`** — meaning *every* request that enters this router, regardless of which of the router's own routes it's headed for, hits this admin/manager-only check first.
2. `app/registerRoutes.js:145` mounts this router at the generic prefix `app.use('/api', reportsApi)` — and crucially, this happens **before** `app/registerRoutes.js:202` mounts `createStudentWebRoutes(...)` (whose routes live at `/api/student/*`), and before several other `/api/*` routers registered at lines 146-209 and 318.
3. Express tries routers in **registration order**, not specificity order. So a request to `GET /api/student/classes` reaches `reportsApi` first (because `/api` is a prefix of `/api/student/classes`), runs into `requirePrivilegedRole`, and — because a student's role isn't `admin` or `manager` — gets an immediate `403 {"success":false,"message":"Forbidden"}` response. The request **never reaches** `routes/studentWebRoutes.js`'s actual handlers (confirmed by reading `studentWebRoutes.js:546-709` in full: none of those handlers ever emit a 403, and `tests/smoke/studentClassesApi.test.js` proves they return 200 when the router is mounted directly with the correct guard).
4. Live network trace confirms the exact failing calls and byte-identical responses:
   ```
   GET /api/student/classes    -> 403 {"success":false,"message":"Forbidden"}
   GET /api/student/activities -> 403 {"success":false,"message":"Forbidden"}
   GET /api/student/attendance -> 403 {"success":false,"message":"Forbidden"}
   ```
5. The frontend then takes that raw `{message: "Forbidden"}` and **renders it verbatim as page copy**:
   - `public/js/studentDashboard.js:178` → `setText(selectors.joinedClassMeta, error.message || ...)`
   - `public/js/studentDashboard.js:215,217` → writes `error.message` into `openActivityMeta` and `overdueMeta`
   - `public/js/studentClasses.js:615-617` throws `new Error(data.message || ...)`, then `public/js/studentClasses.js:650-661` writes that raw message into the hero status pill, results meta, and empty-state text via `setText(selectors.studentClassesHeroStatus, error.message || ...)`

*Why confusing:* A student opening their dashboard sees "0" everywhere and the word "Forbidden" stamped next to their own name and ID. The natural reading is **"something is wrong with my account"** — not "the platform has a bug." That's actively damaging to trust in a product whose core value is helping students track their own academic standing.

*Suggested direction:* This is a **functional bug fix**, not a UX-polish item — see `ux-refactor-roadmap.md` P1. At minimum it requires (a) scoping `reportsApi`'s guard to its own routes instead of a blanket `router.use`, or moving its mount to a narrower prefix that doesn't shadow `/api/student/*`, `/api/teacher/*`, `/api/quiz-builder/*`, and `/api/live-games/*`; and (b) replacing raw `error.message` rendering with friendly fallback copy regardless of what the backend returns, so that a future backend error never again surfaces as raw JSON text in the UI.

#### 2. `/grades` has a real layout overlap bug on mobile

Scrolling the `/grades` page at 375px shows the "Quick Access — Student Tools" card visually overlapping the card above it: text from the "Review your grade records..." panel ("R...G...D...S...cours...") bleeds through behind the tools tile grid, and continuing to scroll shows the tools grid sliding back over the empty-state text ("No re...cor...are availa...yet").
- Screenshots: `student-grades__mobile__s0.png`, `student-grades__mobile__s1.png`
- *Why confusing:* this looks like a broken/half-loaded page rather than a finished feature — the kind of visual glitch that makes a student question whether the data on the page is trustworthy.
- *Suggested direction:* likely a missing top margin or incorrect stacking-context (`z-index`/`position`) between adjacent cards in `views/pages/student/grades.ejs` and its associated styles — see `mobile-responsiveness-audit.md` for the full breakdown.

#### 3. `/grades` is reachable but not part of the student's primary navigation

The global nav (`views/partials/nav.ejs:34-38`) gives authenticated students exactly four links: Dashboard, Classes, Attendance, Activities. **Grades is absent** — it's reachable only via a quick-access tile inside the dashboard.
- *Why confusing:* Grading/grade access is one of the platform's five core pillars (`../hellouniversity.md`, "Core Pillars" → "Grading and Student Academic Access"), yet a student has to already be on the dashboard to discover the page exists. New students scanning the top nav for "where do I see my grades?" won't find it there.
- *Suggested direction:* add `/grades` to the primary student nav alongside Dashboard/Classes/Attendance/Activities (see `navigation-ia-audit.md`).

---

## Teacher

**Journey walked:** Login → `/teacher/dashboard` → `/teacher/classes` → `/teacher/classes/new` → `/teacher/quizzes` → `/teacher/live-games` (ClassRush).

### What works
- The dashboard's collapsible sidebar groups destinations into a sensible set (Overview / Classes / Quizzes / ClassRush) and the hero clearly states the page's purpose ("manage classes, build quizzes, and host ClassRush live games from one supported workspace").
- `/teacher/classes/new` lays its fields out clearly with one purpose per screen.

### Friction points

#### 1. The same root-cause bug breaks ClassRush and Quiz Builder for teachers

The `reportsApi` shadowing bug described in [Student → Friction point 1](#1-critical--core-student-data-never-loads-this-is-a-bug-not-a-design-problem) is **not limited to student-facing endpoints** — it shadows *every* `/api/*` router registered after `app/registerRoutes.js:145`, which includes the teacher-facing ones too. Confirmed live for the teacher account:

```
GET /api/quiz-builder/quizzes          -> 403 {"success":false,"message":"Forbidden"}
GET /api/live-games?page=1&limit=20    -> 403 {"success":false,"message":"Forbidden"}
```

The two breakages look very different on screen, which makes this worth calling out as **two distinct symptoms of one cause**:

- **`/teacher/live-games` (ClassRush)** gets stuck on **"Loading games..."** with a red **"Forbidden"** toast pinned to the bottom-right corner of the viewport — at least *some* visible signal that something failed. Screenshot: `teacher-classrush__mobile__s0.png`.
- **`/teacher/quizzes` (Quiz Dashboard)** shows **no error at all** — it silently renders "Total Quizzes: 0", "Published: 0", "Draft: ..." as if the teacher genuinely has zero quizzes. Screenshot: `teacher-quiz-builder__mobile__s0.png`. This is arguably **worse** than the visible "Forbidden" badge: a teacher has no way to know the fetch failed — they'd reasonably conclude the platform lost their quizzes, or that quiz creation didn't work, when in fact the request to `GET /api/quiz-builder/quizzes` (called from `public/js/teacherQuizDashboard.js:31`) never even reached its handler.
- The teacher dashboard's own class/quiz counts are affected the same way — `public/js/teacherDashboard.js:53,78` call `/api/teacher/classes` and `/api/quiz-builder/quizzes`, and `routes/teacherClassManagementApiRoutes.js` is mounted at `/api/teacher/classes` via `app/registerRoutes.js:318-319` — also after `reportsApi` at line 145, so also shadowed.

*Why confusing:* From the teacher's seat, three different core workflows — viewing classes, building quizzes, hosting ClassRush — all silently return zero or error out, with no consistent signal about why. A teacher would reasonably conclude the platform doesn't actually support these features yet, when in fact they're implemented and tested (per `tests/smoke/studentClassesApi.test.js` and the working route handlers) but unreachable due to a middleware-ordering bug.

*Suggested direction:* same fix as the student-side finding — see `ux-refactor-roadmap.md` P1. Additionally, once the routing bug is fixed, the Quiz Dashboard should surface a visible error/retry state on fetch failure (matching the pattern ClassRush already has, just with friendlier copy) instead of silently rendering a zero-state that's indistinguishable from "you have no quizzes yet."

#### 2. Two stacked icon-only navigation groups in the dashboard sidebar look identical but behave differently

The teacher dashboard sidebar renders two adjacent icon+label rows that are visually almost indistinguishable:

- An **in-page anchor nav** (`views/pages/teacher/dashboard.ejs:54-71`): Overview / Classes / Quizzes / ClassRush — each link scrolls to a `#section` anchor on the same page.
- A **page-navigation shortcut row** directly below it (`views/pages/teacher/dashboard.ejs:72-89`): Classes / Quiz Dashboard / Create Quiz / Create ClassRush — each link navigates to a different URL (`/teacher/classes`, `/teacher/quizzes`, etc).

Both groups use the same icon-and-label visual treatment, and **"Classes" appears in both** — one scrolls to `#teacherClassesSection` on the current page, the other navigates away to `/teacher/classes`. Screenshot: `teacher-dashboard__mobile__s0.png`.

*Why confusing:* there's no visual cue that one group means "jump to a part of this page" and the other means "go to a different page entirely" — and the repeated "Classes" label makes it actively ambiguous which one a teacher should tap. This is exactly the kind of redundant-entry-point problem `navigation-ia-audit.md` digs into further.

*Suggested direction:* differentiate the two groups visually and by label (e.g., "On this page" vs. "Quick actions"), or collapse them into one coherent set; rename the duplicated "Classes" entry so its destination is unambiguous (e.g., "Jump to Classes" vs. "Open Class Manager").

---

## Admin

**Journey walked:** Login → `/admin_dashboard` → `/admin/users`.

### What works
- The Admin Overview frames itself honestly as "Live summary of the tools currently wired in this application" — a refreshingly direct statement of what the page actually does.
- `/admin/users` follows a familiar table-management pattern: search bar, bulk-select checkboxes, sortable columns.

### Friction points

**1. Admin Overview stat tiles are permanently stuck on "-" with no explanation, and one leaks a raw API path into the copy.**
Three of the four overview tiles read just **"-"**: "Users loaded from `/api/admin/users`", "Grade rows from latest grade search", "Attendance rows from latest summary view." They apparently only populate after the admin performs a search elsewhere in the app — but the page gives no hint that input is required.
- Screenshot: `admin-dashboard__mobile__s0.png`
- *Why confusing:* a permanent "-" with no call-to-action reads as "broken," not "waiting for you to do something." Worse, the description text for the first tile literally contains the backend route path — `` `/api/admin/users` `` — wrapped in backticks, exactly the kind of developer-POV string `../content-style-guide.md` says shouldn't reach end users.
- *Suggested direction:* replace the "-" with explicit empty-state copy that tells the admin what to do ("Run a user search to see live counts here") and rewrite "Users loaded from `/api/admin/users`" in plain product language ("Total registered users").

**2. The user management table doesn't reflow for narrow viewports, and its primary interaction assumes a mouse.**
At 375px, the `/admin/users` table keeps its full desktop column set (ID Number, Last Name, First Name, Email, …) and simply clips the overflow — visible cells show truncated fragments like "En..." and "he...". The page's instruction also reads "**Double-click** a row to view details or change a role," which has no direct touch equivalent (a double-tap is not a standard mobile gesture for this kind of action).
- Screenshot: `admin-users__mobile__s0.png`
- *Why confusing:* an admin trying to manage users from a phone or tablet can't see key columns (notably Email) without horizontal scrolling that isn't visually signposted, and the documented way to open a row's detail view doesn't translate to touch.
- *Suggested direction:* below a width threshold, switch to a stacked card-per-user layout (or a horizontally scrollable table with a visible "scroll for more" affordance), and add an explicit, always-visible row action (e.g., a "View" button or row-tap) instead of relying on double-click — see `mobile-responsiveness-audit.md` for the detailed breakdown across admin surfaces.

---

## Cross-cutting observations (appear in more than one role)

- **Raw backend strings reaching the UI** is not a one-off — it shows up as "Forbidden" badges across student pages, a "Forbidden" toast on ClassRush, and a literal API path in the admin overview copy. A single shared rule — "never render `error.message` or backend route strings directly; always map to friendly, role-appropriate copy" — would close all of these at once. See `ux-refactor-roadmap.md`.
- **Icon-only navigation without visible labels at narrow widths** appears on the public `/lessons` page and inside the teacher dashboard sidebar. Both rely on `title`/`aria-label` attributes that aren't visible to a sighted touch user.
- **Silent vs. visible failure is inconsistent** — the same underlying 403 produces a visible (if unfriendly) "Forbidden" badge on `/classes` and ClassRush, but a completely silent zero-state on the Quiz Dashboard and admin overview tiles. Once the root-cause bug is fixed, the app still needs one consistent pattern for "this fetch failed — here's what that looks like to the user."
