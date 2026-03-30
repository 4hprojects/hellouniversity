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
- ClassRush live-game builder, hosting, and completed-session reporting
- ClassRush self-paced assignment and student completion flow
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
- ClassRush now has a stronger live-game baseline:
  - builder support for multiple choice, true/false, poll, and type-answer questions
  - saved randomize-question and randomize-answer controls
  - class-linked academic sessions, join locking, and pause/resume
  - class-aware launch paths from the teacher class board and class overview
  - richer completed-session analytics plus single-session CSV export
  - teacher-assigned self-paced ClassRush with modal assignment setup, resumable student attempts, and assignment detail reporting
  - important boundary: self-paced ClassRush is now real, but it is still a first-wave baseline rather than the full long-range ClassRush roadmap

### Test Baseline

- The repo has a real smoke suite under `tests/smoke/`.
- Current verification run:
  - `npm run test:smoke`
  - result: `43` passing suites, `269` passing tests
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

### 6. Expanded ClassRush Into a Stronger Academic Live-Game Baseline

- ClassRush P1 and P2 are now implemented in the live-game stack
- builder support now includes `poll` and `type_answer` in addition to multiple-choice and true/false
- saved games now support `randomizeQuestionOrder` and `randomizeAnswerOrder`
- hosted sessions preserve randomized order consistently through the session and reconnect flow
- report detail now includes richer poll and typed-answer analytics plus single-session CSV export

### 7. Finished the ClassRush Rollout Polish Wave

- ClassRush P3 is now implemented in the teaching workspace
- teachers can launch a new ClassRush game directly from the teacher class board and class overview
- the builder now supports class-aware launch context through `linkedClassId` and `launchContext=class-workspace`
- class-aware builder launches preselect the class in create mode, keep the selection editable, and add a `Back to Class` path without changing the main ClassRush route structure

Relevant files:

- `views/pages/teacher/classes/overview.ejs`
- `public/js/teacherClassesDashboard.js`
- `public/js/teacherClassOverview.js`
- `public/js/liveGames/teacherGameBuilder.js`
- `views/pages/teacher/live-games/builder.ejs`
- `utils/classInsights.js`
- `tests/smoke/teacherClassesApi.test.js`
- `tests/smoke/teacherClassesPage.test.js`
- `tests/smoke/liveGamePages.test.js`

Relevant files:

- `routes/liveGameBuilderApiRoutes.js`
- `app/socketManager.js`
- `utils/liveGameHelpers.js`
- `views/pages/teacher/live-games/builder.ejs`
- `views/pages/teacher/live-games/host.ejs`
- `views/pages/teacher/live-games/report-detail.ejs`
- `views/pages/play.ejs`
- `public/js/liveGames/teacherGameBuilder.js`
- `public/js/liveGames/hostController.js`
- `public/js/liveGames/playerClient.js`
- `public/js/liveGames/teacherGameReports.js`
- `tests/smoke/liveGameBuilderApi.test.js`
- `tests/smoke/liveGamePages.test.js`
- `tests/smoke/socketManager.test.js`

### 8. Added The First Self-Paced ClassRush Assignment Layer

- teachers can now assign a saved ClassRush game to 1 class at a time from the ClassRush dashboard or edit page
- the shared assignment modal supports whole-class or selected-student targeting, open date, due date, due policy, and scoring profile
- students now get authenticated self-paced ClassRush through `/classrush/assignments/:assignmentId` instead of through `/play`
- students can resume 1 in-progress attempt, save progress question-by-question, and submit once
- student activity, class detail, and dashboard summaries now include self-paced ClassRush rows with the correct CTA instead of assuming everything is a quiz
- teacher reports now include self-paced assignment summaries plus dedicated assignment detail pages

Relevant files:

- `routes/liveGameAssignmentsApiRoutes.js`
- `routes/studentClassRushApiRoutes.js`
- `utils/liveGameSelfPaced.js`
- `views/pages/teacher/live-games/assignment-detail.ejs`
- `views/pages/student/classrush-assignment.ejs`
- `views/partials/live-game-assignment-modal.ejs`
- `public/js/liveGames/liveGameAssignmentModal.js`
- `public/js/liveGames/selfPacedPlayer.js`
- `public/js/liveGames/teacherGameDashboard.js`
- `public/js/liveGames/teacherGameBuilder.js`
- `public/js/liveGames/teacherGameReports.js`
- `public/js/activities.js`
- `public/js/studentClasses.js`
- `public/js/studentDashboard.js`
- `routes/studentWebRoutes.js`
- `tests/smoke/liveGameAssignmentsApi.test.js`
- `tests/smoke/studentClassRushApi.test.js`
- `tests/smoke/studentClassRushActivitiesApi.test.js`
- `tests/smoke/studentClassRushPage.test.js`

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

### 5. Run Manual Browser QA On the Expanded ClassRush Flow

The current ClassRush runtime now includes a larger builder, host, live player, self-paced player, assignment modal, and report-detail surface than earlier notes reflected.

Recommended action:

- run desktop, tablet, and phone browser QA with live resize checks across:
  - `/teacher/classes`
  - `/teacher/classes/:classId`
  - `/teacher/live-games`
  - `/teacher/live-games/new`
  - `/teacher/live-games/:gameId/edit`
  - `/teacher/live-games/:gameId/host`
  - `/teacher/live-games/:gameId/assignments/:assignmentId`
  - `/teacher/live-games/:gameId/reports/:sessionId`
  - `/play`
  - `/activities`
  - `/classes/:classId`
  - `/classrush/assignments/:assignmentId`
- verify class-workspace launch links, builder prefill behavior, invalid class fallback, poll, type-answer, pause/resume, join-lock, class-linked access, self-paced assignment modal behavior, self-paced resume/submit flow, and CSV export behavior in the browser

### 6. Self-Paced ClassRush Needs Follow-Up QA And Product Decisions

The first self-paced ClassRush wave is now implemented, but it still needs browser verification and deliberate follow-up scoping rather than casual expansion.

Current follow-up areas:

- browser QA for the teacher assignment modal, self-paced student player, and assignment detail layout
- decide whether the next follow-up should prioritize:
  - retakes or multiple attempts
  - full post-submit answer review
  - self-paced export/report expansion
  - multi-class assignment in 1 action

Recommended action:

- finish the browser pass first, then scope the next self-paced ClassRush follow-up as a separate wave

## Product Areas Still Partial

These are real capabilities-in-progress rather than missing foundations:

- academic structure beyond class-level fields
- full assignment workflow separate from quiz assignment
- expanded self-paced ClassRush review/export/retake depth
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
2. Run the full browser pass on the expanded ClassRush live and self-paced flow
   - assignment modal, self-paced player, report detail, builder prefill, invalid-class fallback, and live resize checks
3. Finish partial teacher and admin product areas
   - manual grading
   - teacher lesson authoring
   - admin import/report gaps
4. Build the real gradebook and release workflow
   - teacher grade entry and review
   - faculty-controlled release
   - audit trail and visibility rules
5. Continue cleanup and refactor
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
- `routes/liveGameAssignmentsApiRoutes.js`
- `routes/studentClassRushApiRoutes.js`
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
- ClassRush builder, host, player, and report detail expansion
- ClassRush class-workspace launch integration
- ClassRush self-paced assignment modal, student player, and activity/report integration
- footer/sitemap/doc updates
- responsive guide-page behavior across desktop, tablet, and phone widths
- teacher-POV and create-first CTA refinement for `/teacher-guide` and `/classrush-guide`

That work should be QA-checked before push, but it does not change the main analysis above.
