# Mobile & Tablet Responsiveness Audit

Updated: 2026-06-08

## Scope and how to read this doc

This doc captures **concrete, observed layout problems** at three widths — **desktop (1280×800)**, **tablet (768×1024)**, and **mobile (375×812)** — gathered by driving the running app headlessly and screenshotting each page at each width (full-page captures for the tablet pass, viewport-clipped scroll captures for the desktop/mobile pass, referenced by filename below).

This is the *experienced* counterpart to `../css-audit.md`, which already tracks stylesheet-level cleanup (duplicate rules, naming, file consolidation). Where a problem here clearly traces to something `css-audit.md` already lists, it's cross-referenced rather than repeated. This doc is about **what a user sees and feels at each width**, organized by feature area; `ux-refactor-roadmap.md` turns both into a prioritized fix list.

---

## Cross-cutting pattern: tablet (768px) gets a stretched mobile layout, not an intermediate one

Before the per-area notes — one pattern shows up almost everywhere at 768px and is worth naming once: pages don't have a true tablet-width layout. Cards and sections that are clearly designed to sit side-by-side at desktop width simply **stack into a single column with wide empty margins on either side**, as if the mobile single-column layout were stretched horizontally rather than given a 2-column intermediate treatment.

**Update 2026-06-08:** A targeted responsive pass addressed the highest-impact examples called out below: home quick links, `/lessons` mobile labels, `/login` placeholder clipping, `/signup` sectioning, `/grades` stacking/active nav, `/admin/users` mobile row cards, teacher dashboard sidebar grouping, and ClassRush mobile toast placement. A compact viewport matrix passed at 375×812, 768×1024, 1024×768, and 1280×800 for the verified public pages plus `/grades` and `/admin/users`.

- Home page at 768px (`home__tablet.png`): every content card stacks vertically, each occupying roughly 60% of the viewport width with large unused side margins — there's clearly room for a 2-column grid that never appears.
- `/classes` (student) at 768px (`student-classes__tablet.png`): same single-column stacking; the stat tiles (Joined Classes / Active Classes / Classes With Work / Overdue Work) that sit in a 2×2 or 4-across grid at desktop collapse to one-per-row here, leaving large gaps.

*Why it matters:* tablet users (and anyone in a narrow desktop window, foldable device, or split-screen view) get a layout that wastes the screen real estate they have rather than one tuned for it. This is the kind of thing a `768px`-anchored breakpoint set would fix in one pass — see `ux-refactor-roadmap.md` and cross-reference any existing breakpoint inventory in `../css-audit.md`.

---

## Public site

| Page / area | Width | Issue | Evidence |
|---|---|---|---|
| Home — "quick links" 6-card grid | Mobile (375px) | Fixed 3-column grid is too narrow for card labels; text clips mid-word ("Featu...", "Teac... Guid...", "Class...") | `home__mobile__s1.png` |
| Home | Tablet (768px) | Stretched single-column layout with large unused side margins (see cross-cutting note above) | `home__tablet.png` |
| `/lessons` — top quick-link row | Mobile (375px) | Four icon-only buttons render with no visible text label; relies on `title`/`aria-label` (not visible on touch) | `lessons__mobile__s0.png`; markup `views/pages/lessons/index.ejs:43-46` |
| `/login` — input fields | Mobile (375px) | Placeholder text "Enter your Student ID, Employee I..." is wider than the input and clips — the full hint ("...D, or Email") never becomes visible until the user starts typing | `login__mobile__s0.png` |
| `/signup` | Mobile (375px) | ~12 form sections (account type, name, ID, email, institution type + search/manual entry, password, confirm, terms, captcha) run as one continuous unsectioned column with no progress/step cue | `signup__mobile__s0.png`, `signup__mobile__s1.png`; full detail in `role-journey-findings.md` (Public → Friction point 2) |

**Status 2026-06-08:** The public-site rows above were addressed in the targeted responsive pass: home quick links now wrap in a two-column phone layout, `/lessons` labels are visible on touch widths, `/login` uses shorter hint copy, and `/signup` is grouped into four semantic sections.

**What's working well here:** `/teacher/classes/new` ("Create Class") shows the pattern this audit would like to see *more* of — fields are grouped under clear sub-headers ("Identity — Define the class name, course code, and section") with one purpose per visual group, and it holds up cleanly at 375px (`teacher-new-class__mobile__s0.png`). The signup form and other long forms could follow this same grouping convention.

---

## Auth

Covered above under "Public site" (`/login`, `/signup` are reachable both logged-out and via nav). No additional authenticated-only auth surfaces were found beyond the password-reset flow, which wasn't separately screenshotted in this pass — worth a follow-up look if a deeper auth-flow audit is ever scheduled (see `../auth-flow-notes.md` for the structural side of that flow).

---

## Student workspace

| Page | Width | Issue | Evidence |
|---|---|---|---|
| `/dashboard` | Mobile (375px) | Stat tiles render literal backend error text ("Forbidden") as their description line — **this is the cross-cutting bug from `role-journey-findings.md`, not a layout issue**; flagged here only because it's the dominant thing visible on the page at this width | `student-dashboard__mobile__s0.png` |
| `/classes` | Mobile + Tablet | Same "Forbidden" badge issue, plus at 768px the 2×2 stat-tile grid collapses to one-per-row with large gaps (see cross-cutting tablet note) | `student-classes__mobile__s0.png`, `student-classes__tablet.png` |
| **`/grades`** | **Mobile (375px)** | **Real layout bug**: the "Quick Access — Student Tools" card visually overlaps the card above it. Scrolling shows text from the grades-summary panel bleeding through behind the tools tile grid, and the reverse — the tools grid sliding back over empty-state text — a few hundred px further down. This reads as a broken/half-rendered page. | `student-grades__mobile__s0.png`, `student-grades__mobile__s1.png`; full detail in `role-journey-findings.md` (Student → Friction point 2). Likely cause: missing top-margin or incorrect stacking context (`z-index`/`position`) between adjacent `.dashboard-…-card`-style elements in `views/pages/student/grades.ejs` and its styles — worth checking against any "card spacing" or "z-index" items already in `../css-audit.md`. |

**Status 2026-06-08:** `/grades` no longer overlaps in the verified mobile matrix, and `/classes`/student workspace grids now retain useful intermediate columns until phone widths where space requires a single column.

---

## Teacher workspace

| Page | Width | Issue | Evidence |
|---|---|---|---|
| `/teacher/dashboard` — sidebar | Mobile (375px) | Two icon+label nav groups stack with no visual differentiation between "scroll to a section" and "navigate to a page," and a duplicated "Classes" label points to two different destinations — a layout symptom of the IA problem documented in `navigation-ia-audit.md` (Problem 1) | `teacher-dashboard__mobile__s0.png` |
| `/teacher/live-games` (ClassRush) | Mobile (375px) | Page gets stuck on "Loading games…" with a red "Forbidden" toast pinned to the bottom-right corner — **this is the cross-cutting bug**, but the *toast placement* is also worth a layout look: a fixed bottom-right toast on a 375px viewport sits close to the thumb-reach zone and could overlap future bottom navigation or action buttons | `teacher-classrush__mobile__s0.png` |
| `/teacher/quizzes` | Mobile (375px) | No layout issue per se — the cards render cleanly — but because the underlying fetch silently fails (cross-cutting bug), there's no visual distinction between "this area is empty" and "this area failed to load," which is as much a missing-responsive-state problem as a data problem | `teacher-quiz-builder__mobile__s0.png` |
| `/teacher/classes/new` | Mobile (375px) | **Positive example** — clean single-column form with grouped sections and sub-headers; holds up well at 375px | `teacher-new-class__mobile__s0.png` |

**Status 2026-06-08:** The teacher dashboard sidebar now separates "On this page" from "Go to" destinations and shows labels at narrow widths. The ClassRush toast is also centered/inset on mobile instead of being pinned to the bottom-right edge.

---

## Admin

| Page | Width | Issue | Evidence |
|---|---|---|---|
| `/admin_dashboard` | Mobile (375px) | Overview stat cards are legible and stack cleanly — no layout complaint here — but three of four are permanently stuck on "-" with copy that leaks a raw API path (`` `/api/admin/users` ``); this is a content/state issue more than a layout one (see `role-journey-findings.md`, Admin → Friction point 1) | `admin-dashboard__mobile__s0.png` |
| **`/admin/users`** | **Mobile (375px)** | **Real responsive-table problem**: the table keeps its full desktop column set (ID Number, Last Name, First Name, Email, …) and clips overflow — visible cells truncate to fragments like "En...", "he...". No horizontal-scroll affordance is visible, and the page's "Double-click a row" instruction has no touch equivalent. | `admin-users__mobile__s0.png`; full detail in `role-journey-findings.md` (Admin → Friction point 2) |

**Status 2026-06-08:** `/admin/users` now switches to labeled card-style rows on mobile/tablet widths and includes an explicit `Manage` action that opens the existing account-detail modal.

---

## Summary: layout bugs vs. data/content issues vs. missing responsive treatment

It's worth separating these three categories, because they need different fixes and different owners:

1. **Genuine CSS/layout bugs** (need a styling fix):
   - `/grades` mobile card-overlap (`student-grades__mobile__s*.png`)
   - Home page mobile quick-link label clipping (`home__mobile__s1.png`)
   - Login input placeholder clipping (`login__mobile__s0.png`)
   - Tablet-width single-column stretching across multiple pages (cross-cutting note above)

2. **Missing responsive treatment** (need a new breakpoint-specific layout, not a bug fix):
   - `/admin/users` table needs a stacked/card or scrollable treatment below ~600px
   - Long forms (`/signup`) need sectioning/grouping at narrow widths
   - Icon-only nav rows (`/lessons`, teacher dashboard) need visible labels at narrow widths

3. **Data/content issues that only *look* like layout problems** (these are the cross-cutting bug from `role-journey-findings.md` — fixing the layout around them won't help until the underlying fetch succeeds):
   - "Forbidden" badges on student dashboard/classes/activities/attendance
   - Stuck "Loading games…" + "Forbidden" toast on ClassRush
   - Silent zero-state on Quiz Dashboard
   - Stuck "-" placeholders on admin overview

`ux-refactor-roadmap.md` sequences these three categories so that the highest-leverage fix (category 3, the routing bug) lands first — it's pointless to polish responsive layouts around data that isn't loading.
