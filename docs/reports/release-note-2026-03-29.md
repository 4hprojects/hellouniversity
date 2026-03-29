# Release Note - 2026-03-29

## Summary

This release simplifies the public events archive so visitors can find old event pages and results with less navigation overhead.

## Included Changes

- `/events` now uses a lighter archive layout:
  - the sidebar, KPI strip, maintenance-style notes, and extra CTA panel were removed
  - the page keeps a shorter hero, compact featured collections, and one flat searchable/filterable catalog
  - event cards now focus on the core fields only: series, page type, date, venue, summary, and one CTA
- `/events/:slug` pages are more direct:
  - event detail pages now include a breadcrumb back path to `/events`
  - top action buttons are reduced to the most relevant contextual links
  - the spotlight-card band was removed to reduce repetition with the summary and facts panel
- The events data layer was aligned to the new UI:
  - the landing page now renders from a flattened catalog contract instead of section-grouped cards
  - event and detail CTA wording was normalized for consistency
- Product notes were updated:
  - `docs/reports/session-log.md`
  - `docs/webapp-improvement-checklist.md`

## Verification

Verified with:

```powershell
npm test -- tests/smoke/eventsPages.test.js --runInBand
```

Result: `/events`, one noindex event detail page, and one indexable event detail page all passed smoke coverage.

Additional check:

```powershell
npm test -- tests/smoke/eventsPages.test.js tests/smoke/homePage.test.js --runInBand
```

Result: the new `/events` coverage passed; `homePage.test.js` still failed on a pre-existing CTA-copy expectation unrelated to this release.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`

---

## Update 2 - Student Workspace Refresh And Shared Study Picks

### Summary

This same-day update refreshes the student-facing workspace flow and extracts the lesson/book recommendation surface into a reusable `Study Picks` component shared across student and public pages.

### Included Changes

- Student dashboard UX was simplified:
  - `Focus Now` and the old duplicated attention layout were replaced with a clearer `Notifications` panel
  - the overview now uses compact clickable summary rows for joined classes, open activities, and overdue work
  - `Join a Class` remains available directly on the dashboard as a collapsible block
  - `Quick Access` was narrowed to lightweight student tools, while lesson/book discovery moved into the shared `Study Picks` panel
- Student academic navigation was restructured:
  - grade detail moved out of `/dashboard` into the dedicated `/grades` page
  - related student page links were updated to point to `/grades`
  - `/classes` and `/classes/:id` were refreshed to match the lighter student workspace direction
- Shared public/student discovery UI was added:
  - `views/partials/studyPicksPanel.ejs`
  - `public/js/studyPicksPanel.js`
  - `public/css/study_picks_panel.css`
  - the component now appears on `/dashboard`, `/`, and `/blogs`
  - `/blogs` now places the `Keep Learning` panel at the end of the main content flow
- Quality and trust issues were fixed:
  - broken separator output was replaced with ASCII-safe formatting
  - invalid or zero grade timestamps no longer render epoch dates such as `Jan 1, 1970`
  - outdated smoke-test expectations were aligned with the current dashboard and home-page structure

### Verification

Verified with:

```powershell
npm test -- tests/smoke/studentDashboardPage.test.js tests/smoke/studentClassesPage.test.js tests/smoke/blogPages.test.js tests/smoke/homePage.test.js --runInBand
```

Result: 11 tests passed across 4 suites.

Additional checks:

```powershell
node --check public/js/studentDashboard.js
node --check public/js/studentClasses.js
node --check public/js/studentGrades.js
node --check public/js/studyPicksPanel.js
```

Result: all updated client files parsed successfully.

### Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`

---

## Update 3 - Lesson And Book Detail Image Sizing

### Summary

This same-day update reduces oversized imagery on lesson and book detail pages so educational content reads more like an article and less like a banner-led landing page.

### Included Changes

- Lesson detail routes now load a dedicated shared stylesheet:
  - `public/css/lessonDetail.css`
  - the stylesheet is attached only to lesson detail pages through `routes/webPagesRoutes.js`
  - this keeps blog article styling unchanged while allowing lesson images to be resized independently
- Lesson page media was normalized:
  - top lesson images that previously rendered as wide `w-full h-64 object-cover` banners are now centered, width-capped, and no longer forced into a cropped height
  - inline lesson screenshots and diagrams are also constrained to a readable content width instead of stretching across the full article column
- Book detail media was reduced through the shared detail surface:
  - `public/css/bookDetail.css` now caps the extracted hero image so it remains distinct without dominating the card
  - inline book-content images now render as centered content media rather than wide banner-like visuals
- The `/lessons` and `/books` hub pages were intentionally left unchanged because the oversized-image issue was isolated to the detail pages

### Verification

Verified with:

```powershell
node --check routes/webPagesRoutes.js
```

Render checks:

- `/lessons/mst24/mst24-lesson1`
- `/books`
- `/books/7-habits/scp1-be-proactive`

Result: lesson detail pages include `/css/lessonDetail.css`, the `/books` hub does not, and representative lesson/book detail pages still render successfully.

### Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `pending at authoring time`
