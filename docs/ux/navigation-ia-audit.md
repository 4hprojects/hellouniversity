# Navigation & Information Architecture Audit

Updated: 2026-06-08

## Scope and how to read this doc

This doc maps **how a logged-in or anonymous user actually finds their way around HelloUniversity today** — which navigation surfaces exist, what they contain, and where the structure itself (not the visuals, not bugs) creates friction. It does not re-derive route ownership — for "which file owns which route," see `../route-map.md`. For per-page mobile layout problems, see `mobile-responsiveness-audit.md`. For the prioritized fix list, see `ux-refactor-roadmap.md`.

Findings here are grounded in reading the actual nav templates (`views/partials/nav.ejs`, role dashboard EJS files) and in the click-through screenshots referenced in `role-journey-findings.md`.

---

## 1. The current IA, mapped

HelloUniversity doesn't have one navigation system — it has **four**, each scoped to a different layer:

### 1a. The global top nav (`views/partials/nav.ejs`)
Shared across every page (public and authenticated). Built from a `navItems` array (`views/partials/nav.ejs:8-38`) that's assembled conditionally based on `currentRole`:

| Always present | + if `teacher` | + if `teacher_pending` | + if `admin` | + if `manager` | + if other authenticated role |
|---|---|---|---|---|---|
| Home, Search, Blogs, Events, Lessons | Teacher Dashboard, ClassRush | Account Status | Admin Dashboard | CRFV Dashboard | Dashboard, Classes, Attendance, Activities |

Plus a trailing Log out / Sign In action.

### 1b. The student dashboard's "Quick Access — Student Tools" tile grid
Lives inside `/dashboard` only (`views/pages/student/dashboard.ejs:90-…`): Dashboard, Open classes, Attendance, Browse lessons, Join ClassRush, etc. — a second, page-local navigation surface that duplicates several items already in 1a.

### 1c. The teacher dashboard's collapsible sidebar
Lives inside `/teacher/dashboard` only (`views/pages/teacher/dashboard.ejs:35-91`) and itself contains **two stacked sub-groups** (detailed in finding 3 below): an in-page anchor-jump nav and a page-navigation shortcut row.

### 1d. The admin dashboard's full sidebar
Lives inside `/admin_dashboard` only (`views/pages/admin/dashboard.ejs:16-32`) and is structurally different again: a `<ul class="sidebar-nav">` that mixes **panel-toggle links** (`href="#" data-panel="dashboardPanel"` — Overview, Grade Search, Attendance, Imports) with **real page links** (`href="/admin/users"`, `href="/admin/teacher-verification"`), rendered as visually identical `nav-item` rows.

**Why this matters:** a user who learns "navigation lives in a sidebar" on one role's workspace has to re-learn a completely different pattern on another. There's no shared "workspace shell" component — each role's authenticated area invented its own secondary navigation independently, with different interaction models (anchor scroll vs. panel toggle vs. real navigation) wearing the same visual skin.

---

## 2. IA problems identified

### Problem 1 — Two stacked nav groups in the same sidebar look identical but do different things (teacher *and* admin)

This is the single clearest structural problem, and it appears **independently in two different role workspaces**, which suggests it's a pattern, not a one-off:

- **Teacher dashboard** (`views/pages/teacher/dashboard.ejs:54-71` vs. `:72-89`): an in-page anchor nav (Overview / Classes / Quizzes / ClassRush → `#teacherOverview`, `#teacherClassesSection`, etc.) sits directly above a page-navigation shortcut row (Classes / Quiz Dashboard / Create Quiz / Create ClassRush → `/teacher/classes`, `/teacher/quizzes`, etc). Both render as icon+label rows with the same CSS classes. **"Classes" appears in both, pointing to two different destinations** — one scrolls down the current page, the other navigates away entirely. See `role-journey-findings.md` → Teacher → Friction point 2 and `teacher-dashboard__mobile__s0.png`.
- **Admin dashboard** (`views/pages/admin/dashboard.ejs:25-32`): the sidebar mixes `href="#" data-panel="…"` items (Overview, Grade Search, Attendance, Imports — these swap a panel in place) with `href="/admin/users"` and `href="/admin/teacher-verification"` (these navigate to entirely different pages) — again, all rendered as identical `<li><a class="nav-item">` rows with no visual distinction between "this changes what you're looking at" and "this takes you somewhere else."

*IA-level read:* both sidebars conflate **"sections of the current view"** with **"destinations elsewhere in the app"** inside one undifferentiated list. A user can't predict, before clicking, whether they're about to scroll or navigate — and in the teacher case, two same-named items go to different places, which is the worst version of this problem (ambiguity, not just inconsistency).

*Suggested direction:* split each sidebar into two visually distinct groups with different headers/treatments — e.g. "On this page" (anchor links, maybe styled as a mini table-of-contents) vs. "Go to" (real navigation, styled like the rest of the app's links/buttons) — and rename the duplicated "Classes" entries so their destinations are unambiguous.

### Problem 2 — Redundant entry points that *look* like distinct destinations

On the student dashboard, two separate stat tiles — **"Open Activities"** and **"Overdue Work"** (`views/pages/student/dashboard.ejs:21` and `:26`) — each with their own count and description, both link to the exact same URL: `/activities`. There's no filtered/overdue-specific view behind the second link; the destination is identical.

*IA-level read:* this presents two distinct *promises* ("show me what's open" vs. "show me what's overdue") that resolve to one undifferentiated page. A student who taps "Overdue Work" expecting a filtered list lands on the same generic activities page as someone who tapped "Open Activities" — the IA over-promises relative to what the destination actually delivers.

*Suggested direction:* either make `/activities` support a query param / anchor that pre-filters to overdue items and link the "Overdue Work" tile there (`/activities?filter=overdue` or similar), or — if that's a larger lift than this audit's scope — at minimum point both tiles at the same place *and* make that consistent across the rest of the dashboard's promises, so the IA never implies more granularity than the destination provides.

### Problem 3 — `/grades` has no place in the primary student nav

As detailed in `role-journey-findings.md` (Student → Friction point 3), the global nav's authenticated-student branch (`views/partials/nav.ejs:34-38`) lists Dashboard, Classes, Attendance, Activities — but not Grades, despite Grading being one of the platform's five core pillars (`../hellouniversity.md` → "Core Pillars of the System"). The only path to `/grades` is a tile inside `/dashboard`.

*IA-level read:* this creates an inconsistency in "what counts as a top-level destination" — Attendance (arguably a narrower feature) is in the primary nav, but Grades (a named core pillar) isn't. A student scanning the nav for "where are my grades" has no reason to expect it's one level deeper, behind the dashboard.

*Suggested direction:* add `/grades` alongside the other four student nav items in `views/partials/nav.ejs:34-38`.

### Problem 4 — Every authenticated student page uses an identical greeting as its `<h1>`, burying the page's actual identity in a small label

Each student page — Dashboard, Classes, Activities, Attendance, Grades — opens with the same large `<h1>Hello, <Name>.</h1>`, and the page's actual identity ("My Classes," "Grades," etc.) is relegated to a small uppercase "eyebrow" label above it (e.g. `views/pages/student/classes.ejs:10-11` → eyebrow "My Classes" + `<h1>Hello, Uxa Student.</h1>`).

*IA-level read:* the most visually prominent element on every page — the big bold heading — carries no information about *which* page you're on; that information is in the smallest, lowest-contrast text on the screen. For a user moving quickly between Dashboard → Classes → Activities → Attendance (exactly the journey the nav encourages), the pages can blur together at a glance, and the only reliable "where am I" signal is the much-quieter eyebrow text (or the nav's active-state highlight, which itself is subtle — see Problem 5).

*Suggested direction:* this doesn't need to sacrifice the friendly greeting — promote the page-identity label to share visual weight with (or replace) the repeated greeting in the `<h1>`, e.g. `<h1>My Classes</h1>` with `Hello, {Name} — here's what's happening in your classes.` as supporting copy, so the most prominent text on the page actually answers "what page is this."

### Problem 5 — Active-state wayfinding in the global nav is subtle and icon-led

`views/partials/nav.ejs:70-81` does correctly compute and apply an active state (`app-nav-link-active` + `aria-current="page"`) — which is good practice and worth preserving. However, every nav item is rendered as icon + label with no breadcrumb trail anywhere in the app (confirmed: no breadcrumb partial exists in `views/partials/`). For nested destinations — e.g., a class detail page reached via Classes → a specific class — there's no secondary wayfinding to show the user how they got there or how to step back up a level beyond the browser's back button.

*IA-level read:* this is fine for the current shallow IA (most authenticated areas are one level deep), but it will become a real gap as soon as deeper flows are used more (e.g., `/classes/:classId` → materials → a specific material). `route-map.md` already documents these nested routes exist; the IA currently has no answer for "how do I get back up" beyond browser-back.

*Suggested direction:* not urgent at the current depth, but worth adding lightweight breadcrumbs (Home / Classes / {Class Name} / Materials) to the deeper authenticated views before the product adds more nesting — flagging this now so it's considered alongside any new nested-page work rather than retrofitted later.

---

## Summary table

| # | Problem | Where | Severity | Cross-ref |
|---|---|---|---|---|
| 1 | Two visually identical nav groups (anchor-scroll vs. page-nav) with overlapping/duplicate labels | Teacher dashboard sidebar, Admin dashboard sidebar | High — actively ambiguous, not just inconsistent | `role-journey-findings.md` (Teacher #2) |
| 2 | Two dashboard tiles promise different views but resolve to the same page | Student dashboard (`Open Activities` / `Overdue Work` → both `/activities`) | Medium | — |
| 3 | Core-pillar feature (Grades) missing from primary nav | Student nav (`nav.ejs:34-38`) | Medium | `role-journey-findings.md` (Student #3) |
| 4 | Identical greeting `<h1>` on every student page hides page identity | All student pages | Medium | `role-journey-findings.md` |
| 5 | No breadcrumbs for nested destinations | App-wide (currently low-impact; will grow) | Low (for now) | `../route-map.md` |

See `ux-refactor-roadmap.md` for how these are prioritized alongside the journey findings and mobile findings.
