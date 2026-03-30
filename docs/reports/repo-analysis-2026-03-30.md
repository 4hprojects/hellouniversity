# Repo Analysis - 2026-03-30

## Scope

This note captures the current state of the HelloUniversity repository based on a full repo scan of:

- runtime bootstrap and route wiring
- public, student, teacher, admin, and CRFV surfaces
- current docs and roadmap notes
- smoke-test coverage
- unfinished or transitional paths still visible in code

## Overall Assessment

HelloUniversity is already a working application, not a prototype shell.

The strongest implemented areas are:

- modular server bootstrap and route registration
- role-aware authentication and workspace routing
- teacher class management
- quiz builder and student responder flow
- student class, activity, attendance, and grade views
- public learning/content pages

The current repo direction is correct.
The main need is not a product reset.
The first stability and release-safety pass is now implemented.
The repo mostly needs completion work for still-partial teacher, admin, and grade-governance workflows.

## What Is Already Strong

### Runtime Structure

- `server.js` is now bootstrap-oriented rather than carrying large inline route blocks.
- route mounting is split through:
  - `app/configureSession.js`
  - `app/setupCoreMiddleware.js`
  - `app/registerRoutes.js`
  - `app/registerErrorHandlers.js`
- route ownership is documented in `docs/route-map.md`.

### Product Areas With Solid Foundations

- Teacher class management is broadly implemented:
  - dashboard
  - create/edit
  - roster
  - teaching team
  - modules
  - materials
  - announcements
  - settings
  - archive/restore/duplicate
- Quiz workflows are substantially implemented:
  - teacher dashboard
  - builder
  - preview
  - responses
  - analytics
  - canonical student responder page
- Student workspace is substantially implemented:
  - dashboard
  - classes
  - class detail
  - attendance
  - activities
  - grades
- Public site now has a meaningful product-facing surface:
  - home
  - features
  - teacher guide
  - student guide
  - how-it-works
  - classrush guide
  - lessons
  - blogs
  - books
  - events
  - support/legal pages
- The public guide layer is moving in the right direction:
  - `/teacher-guide` now reads closer to a teacher decision aid than a generic product summary
  - `/classrush-guide` now pushes teachers toward creating a game instead of stopping at explanation-only copy

### Test Baseline

- The repo has a real smoke suite under `tests/smoke/`.
- Current verification run:
  - `npm run test:smoke`
  - result: `39` passing suites, `234` passing tests
- Known note from the verification run:
  - the ClassRush smoke path still emits non-fatal QR-storage warnings when R2 credentials are not configured in test runs

## What Was Implemented In This Pass

### 1. Retired the Broken Transitional Class-Records Runtime Path

- `/classrecords` and `/classrecords.html` no longer depend on retired `public/classrecords.html`
- authenticated users are redirected to `/grades`
- unauthenticated users are redirected to `/login`

Relevant files:

- `routes/studentAcademicRoutes.js`
- `app/registerRoutes.js`

### 2. Re-aligned Env Validation, Tests, and Docs

- `app/validateEnv.js` remains the source of truth
- `tests/smoke/validateEnv.test.js` now matches the active R2 + Resend requirements
- `docs/env.required.md` now documents the current env set rather than the older SendGrid-era keys

Relevant files:

- `app/validateEnv.js`
- `tests/smoke/validateEnv.test.js`
- `docs/env.required.md`

### 3. Made Search Record Queries Safe By Default

- `routes/searchRoutes.js` now escapes regex input before building Mongo filters
- the `GET /api/search-records` response shape was kept unchanged

Relevant file:

- `routes/searchRoutes.js`

### 4. Hid Unsupported Teacher and Admin Placeholder Surfaces

- `/teacher/lessons/new` now redirects to `/teacher/dashboard`
- teacher dashboard placeholder grading, lesson, and analytics panels were removed from the visible surface
- admin dashboard actions that depended on missing attendance import or shortcut-only reports were hidden

Relevant files:

- `routes/teacherPagesRoutes.js`
- `views/pages/teacher/dashboard.ejs`
- `views/pages/admin/dashboard.ejs`

### 5. Added Release Guardrails and Reduced Immediate Maintenance Risk

- added project-level smoke CI in `.github/workflows/smoke.yml`
- expanded smoke coverage for public guides, `/grades`, admin pages, ClassRush pages, `/play`, search escaping, and `/classrecords` redirect behavior
- extracted public product and guide pages into `routes/publicInfoPagesRoutes.js`
- extracted student academic routes into `routes/studentAcademicRoutes.js`
- removed the duplicate unused email helper path `utils/emailService.js`

Relevant files:

- `.github/workflows/smoke.yml`
- `routes/publicInfoPagesRoutes.js`
- `routes/studentAcademicRoutes.js`
- `tests/smoke/publicBrandingPages.test.js`
- `tests/smoke/studentAcademicRoutes.test.js`
- `tests/smoke/studentGradesPage.test.js`
- `tests/smoke/adminPages.test.js`
- `tests/smoke/liveGamePages.test.js`
- `tests/smoke/searchRoutes.test.js`
- `tests/smoke/teacherDashboardPage.test.js`

## What Still Needs To Be Completed

### 1. Finish Teacher Manual Grading

Teacher quiz creation is solid, but grading and review are still not fully productized.

Visible remaining gaps:

- no real manual grading queue for short-answer and paragraph review
- no teacher-facing score override and recomputation workflow
- no backed grading-state summaries feeding the dashboard

Relevant files:

- `views/pages/teacher/dashboard.ejs`
- `docs/quiz-builder-architecture.md`

### 2. Build the Real Teacher Lesson Authoring Flow

The old placeholder lesson authoring route is now hidden, but the actual teacher lesson workflow still does not exist.

Needed work:

- create and edit lesson flow
- publish and visibility controls
- route and navigation restoration only after the flow is functional

### 3. Finish Admin Operational Workflows

The admin area is now more honest, but the missing workflows still need to be built if they remain in scope.

Remaining gaps:

- attendance import
- generated reports and exports
- deeper attendance summary and operational filters

Relevant file:

- `views/pages/admin/dashboard.ejs`

### 4. Replace the Transitional Student Grade Portal With a Real Gradebook and Release Model

Students can now use `/grades` as the canonical current page, but grade governance is still incomplete.

Needed work:

- teacher gradebook
- faculty-controlled release
- clearer score visibility rules
- audit trail for grade changes

Relevant doc:

- `docs/hellouniversity.md`

## What Still Needs Refinement And Update

### 1. Standardize Validation Strategy More Broadly

The search route is now fixed, but request validation is still inconsistent across the repo.

Recommended action:

- introduce shared validators and sanitizers
- expand validation consistency beyond `routes/searchRoutes.js`

### 2. Continue Cleaning the Mixed Old/New UI Footprint

The repo still contains a mixture of:

- new shared-layout pages
- older standalone views
- legacy CSS files retained for safety

Concrete examples:

- older `views/teacher/*.ejs` still exist beside `views/pages/teacher/*`
- `docs/css-audit.md` already flags legacy CSS files for later removal

Recommended action:

- continue converging on the shared EJS page/layout system
- archive or remove clearly unused legacy view and CSS assets after verification

### 3. Continue Reducing Hotspot File Size Before Further Expansion

The first route split is done, but several files are still maintenance hotspots:

- `routes/quizBuilderApiRoutes.js`
- `routes/teacherClassManagementContentApiRoutes.js`
- `public/js/teacherQuizBuilder.js`
- `app/socketManager.js`

Recommended action:

- continue splitting by feature responsibility before adding more major behavior

### 4. Run Manual Browser QA On the Current Public-Site Worktree Changes

The repo still has in-progress public-facing work centered on:

- homepage refinement
- `/features`
- `/classrush-guide`
- footer and sitemap updates

Recommended action:

- run a logged-out browser pass across those pages on desktop, tablet, and phone widths before push

## Product Areas Still Partial

These are real capabilities-in-progress rather than missing foundations:

- academic structure beyond class-level fields
- full assignment workflow separate from quiz assignment
- teacher gradebook and grade release controls
- notifications/reminders
- invitation and membership automation
- deeper analytics
- AI-assisted workflows

These align with the current roadmap notes and should remain framed as roadmap work rather than live finished product areas.

## Recommended Next Order Of Work

1. QA the currently edited public-facing pages before push
   - `/`
   - `/features`
   - `/classrush-guide`
   - footer and sitemap changes
2. Finish partial teacher and admin product areas
   - manual grading
   - teacher lesson authoring
   - admin import/report gaps
3. Build the real gradebook and release workflow
   - teacher grade entry and review
   - faculty-controlled release
   - audit trail and visibility rules
4. Continue cleanup and refactor
   - legacy CSS/view removal
   - hotspot file decomposition

## Evidence Notes

Important references used during this analysis:

- `docs/hellouniversity.md`
- `docs/webapp-improvement-checklist.md`
- `docs/route-map.md`
- `docs/css-audit.md`
- `docs/quiz-builder-architecture.md`
- `docs/teacher-class-management-mvp-plan.md`
- `routes/studentWebRoutes.js`
- `routes/studentAcademicRoutes.js`
- `routes/webPagesRoutes.js`
- `routes/publicInfoPagesRoutes.js`
- `routes/teacherPagesRoutes.js`
- `routes/liveGamePagesRoutes.js`
- `app/registerRoutes.js`
- `app/validateEnv.js`
- `tests/smoke/validateEnv.test.js`
- `.github/workflows/smoke.yml`

## Current Worktree Note

The repo already has in-progress public-site and docs changes in the working tree.
That work appears centered on:

- homepage/public guide refinement
- `/features`
- `/classrush-guide`
- footer/sitemap/doc updates
- responsive guide-page behavior across desktop, tablet, and phone widths
- teacher-POV and create-first CTA refinement for `/teacher-guide` and `/classrush-guide`

That work should be QA-checked before push, but it does not change the main analysis above.
