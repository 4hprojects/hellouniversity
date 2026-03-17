# Index Page EJS Migration Plan
Date: 2026-02-27
Status legend: `TODO` | `IN_PROGRESS` | `BLOCKED` | `DONE`

## Goal
Move home page rendering from static `public/index.html` to EJS (`views/pages/home/index.ejs`) with no behavior regression.

## Scope
- In scope:
  - Home page (`/`)
  - Shared header/footer composition used by home page
  - Route + controller path for EJS home rendering
  - Existing JS-driven homepage features (blogs, session link update, search overlay, mobile menu, tabs)
- Out of scope (for this plan):
  - Full site-wide HTML->EJS migration
  - CRFV page migration
  - API changes unrelated to home page rendering

## Current State (Verified)
- `public/index.html` is the current home page source.
- EJS views already exist in `views/` for other features.
- `server.js` has static and catch-all HTML route handling, including `app.get('/*', ...)`.
- EJS is now configured in `server.js` and `GET /` now renders `views/pages/home/index.ejs`.

## Pre-Change Task List (Must Finish First)

| ID | Task | Status | Output |
|---|---|---|---|
| PRE-01 | Baseline current home behavior and capture dependencies | DONE | See `docs/plans/index-ejs-baseline.md` |
| PRE-02 | Confirm IDs required by JS (`latestBlogContainer`, `randomBlogsContainer`, `signinLink`, `mobileSigninLink`, etc.) | DONE | See `docs/plans/index-ejs-baseline.md` |
| PRE-03 | Define target EJS files and route wiring contract | DONE | See section: `PRE-03 Target File Map and Render Contract` |
| PRE-04 | Define rollback plan (switch route back to static index) | TODO | One-command rollback steps |
| PRE-05 | Confirm rebrand placeholders strategy on home page (legacy brand -> `HelloUniversity`) | TODO | Migration note for copy/domain fields |

## Implementation Plan

| Phase | Task | Status | Notes |
|---|---|---|---|
| P1 | Create `views/pages/home/index.ejs` from current refined `public/index.html` | DONE | Script-dependent IDs preserved |
| P1 | Create reusable partials for home shell (`views/partials/head.ejs`, `header.ejs`, `footer.ejs`) if missing | DONE | Added: `views/partials/home/head.ejs`, `header.ejs`, `scripts.ejs` and refactored home view to includes |
| P1 | Add base layout `views/layouts/main.ejs` (or temporary include pattern) | DONE | Added `views/layouts/main.ejs` scaffold for future adoption |
| P2 | Configure EJS in app bootstrap (`app.set('view engine','ejs')`, views path) | DONE | Added in `server.js` |
| P2 | Add home web route (`GET /`) -> controller -> `res.render('pages/home/index', data)` | DONE | Added before static middleware |
| P2 | Keep static `public/index.html` as fallback until verification complete | TODO | No immediate deletion |
| P3 | Move page-specific script to stable path if needed (`public/js/indexPage.js`) | TODO | Already present; verify reference in EJS |
| P3 | Ensure search overlay, blogs rendering, and session link behavior match baseline | TODO | Behavior parity check |
| P4 | Validate desktop/mobile rendering + navigation + scripts + ads slot load | TODO | Manual QA checklist |
| P4 | Cut over `/` to EJS and document changes | TODO | Update docs checklist and changelog |
| P5 | Optional cleanup: retire `public/index.html` after cooling period | TODO | Do only after sign-off |

## Route Order Requirement
`GET /` EJS route must be registered before generic catch-all handlers like:
- `app.get('/*', ...)`
- `app.get('/:folder/:page', ...)`

Otherwise, EJS home route may be shadowed.

## Acceptance Criteria
- `GET /` renders from EJS, not static file.
- No broken styles/scripts on home page.
- Dynamic blog sections still populate.
- Auth link still changes to dashboard when session is active.
- Mobile nav + tabs + search overlay still function.
- Rollback path confirmed.

## Risks
- Catch-all route precedence could override new EJS route.
- Existing global scripts may assume static HTML paths.
- Mixed legacy/new markup may break selectors if IDs/classes drift.

## Rollback
1. Disable or remove EJS home route mount.
2. Re-enable static home handling (existing static/catch-all path).
3. Restart app and verify `GET /` serves previous page.

## Immediate Next Actions
1. Finalize `PRE-03` with exact file map and render contract.
2. Build initial `index.ejs` with parity markup.
3. Wire EJS config and safe `GET /` route before catch-alls.

## PRE-03 Target File Map and Render Contract

### Target files
- `views/pages/home/index.ejs`
- `views/layouts/main.ejs` (or minimal include shell for first pass)
- `views/partials/head.ejs`
- `views/partials/header.ejs`
- `views/partials/footer.ejs`
- `routes/web.routes.js` (or existing server route section if not yet modularized)
- `controllers/home.controller.js` (optional in phase 1; can start inline then extract)

### Render contract (phase 1 minimal)
`res.render('pages/home/index', {`
- `title: 'HelloUniversity - All-in-One Educational Platform'`
- `description: 'Welcome to HelloUniversity...'`
- `canonicalUrl: 'https://hellouniversity.online/'`
- `brandName: 'HelloUniversity'`
- `legacyBrandName: 'Legacy Brand'`
`})`

### Required invariants during migration
- Preserve DOM IDs required by existing scripts:
  - `signinLink`, `mobileSigninLink`, `latestBlogContainer`, `randomBlogsContainer`, `scrollToTopBtn`, `searchOverlay`, `overlaySearchInput`, `mobileMenuBtn`, `mobileNav`
- Keep current script includes and load order equivalent to existing home behavior.
- Do not remove static `public/index.html` until post-cutover sign-off.
