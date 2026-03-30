# ClassRush Current State and Next Update Scope

## Purpose

This document is the practical implementation companion for ClassRush.

It exists to bridge the gap between the larger ClassRush planning documents and the current HelloUniversity codebase state.

It should be used before implementation work so the team can clearly distinguish:

- what ClassRush already ships today
- what is still not part of the live product
- what the next implementation wave will cover
- what remains deferred after that update

When older ClassRush planning documents conflict with the current runtime, the current codebase should be treated as the source of truth for shipped behavior.

This file does not replace the PRD, wireframe spec, schema draft, or development task breakdown.

For the reviewable implementation order of the next wave, see `docs/classrush/classrush-next-update-backlog.md`.

Status note:

- ClassRush P1 was implemented on 2026-03-30.
- ClassRush P2 was implemented on 2026-03-30.
- ClassRush P3 was implemented on 2026-03-30.
- The first self-paced ClassRush assignment wave was implemented on 2026-03-30.
- This file now reflects the current shipped baseline after the live-game rollout wave and the first self-paced assignment wave.

## Current Shipped ClassRush

ClassRush is already a real live-session feature inside HelloUniversity.

### Teacher routes

Current teacher-facing ClassRush routes:

- `/teacher/live-games`
- `/teacher/live-games/new`
- `/teacher/live-games/:gameId/edit`
- `/teacher/live-games/:gameId/host`
- `/teacher/live-games/:gameId/reports`
- `/teacher/live-games/:gameId/reports/:sessionId`
- `/teacher/live-games/:gameId/assignments/:assignmentId`

### Public route

Current public player route:

- `/play`

### Authenticated student route

Current student self-paced route:

- `/classrush/assignments/:assignmentId`

The public player flow supports:

- PIN-based join
- optional prefilled PIN from query string
- nickname entry
- in-page login modal when the live session requires authentication
- automatic join retry after successful in-page login
- waiting screen
- live answer screen
- per-question result state
- final result state
- kicked and cancelled screens

### Current live interfaces

Current live API interfaces:

- `GET /api/live-games`
- `POST /api/live-games`
- `GET /api/live-games/:gameId`
- `PUT /api/live-games/:gameId`
- `DELETE /api/live-games/:gameId`
- `POST /api/live-games/:gameId/duplicate`
- `GET /api/live-games/:gameId/qr`
- `GET /api/live-games/:gameId/reports`
- `GET /api/live-games/:gameId/reports/:sessionId`
- `GET /api/live-games/:gameId/reports/:sessionId/export.csv`
- `GET /api/live-games/:gameId/assignment-targets`
- `PUT /api/live-games/:gameId/assignments`
- `GET /api/live-games/:gameId/assignments`
- `GET /api/live-games/:gameId/assignments/:assignmentId`
- `DELETE /api/live-games/:gameId/assignments/:assignmentId`

Current student self-paced API interfaces:

- `GET /api/student/classrush/assignments/:assignmentId`
- `PUT /api/student/classrush/assignments/:assignmentId/progress`
- `POST /api/student/classrush/assignments/:assignmentId/submit`

Current socket runtime is served through the `/game` Socket.IO namespace.

Current auth flow supporting ClassRush includes:

- safe shared `returnTo` support on `GET /login`, `POST /login`, and `POST /auth/login`
- full-page redirect back to the exact protected ClassRush route after login
- public `/play` login modal handling for login-required live-session joins

### Current gameplay model

Current shipped gameplay now has 2 real delivery modes:

- live-hosted ClassRush sessions
- authenticated self-paced ClassRush assignments

Clarification:

- class-linked ClassRush sessions are still teacher-hosted live sessions
- self-paced ClassRush is a separate assignment layer on top of saved games
- self-paced ClassRush does not reuse `/play`; it uses the authenticated student route `/classrush/assignments/:assignmentId`

Teachers can:

- create and save game decks
- edit saved games
- duplicate games
- launch a new ClassRush game from the class board and class overview with the current class preselected
- link a saved game to an active class as a default academic session target
- host a live session
- confirm or override the linked class before a session opens
- share access through a stable game PIN and QR code
- run live sessions with saved question and answer randomization when enabled
- review completed session reports later
- assign a saved ClassRush game to 1 class at a time from the ClassRush dashboard or edit page
- configure self-paced assignment scope, open date, due date, due policy, and scoring profile
- target the whole class or selected students only
- reopen the same game/class pair and update or remove the assignment later
- review self-paced assignment detail, progress counts, leaderboard state when applicable, per-question analytics, and per-student results

Students can:

- join through `/play`
- enter a PIN and nickname
- log in from the `/play` modal when a live session requires authentication and retry the same join automatically
- reconnect to the same live session when supported by the current reconnect logic
- answer questions on their own device during a live teacher-hosted game
- receive self-paced ClassRush items through the student activity workspace
- open or resume self-paced ClassRush from `/activities`, class detail, dashboard summaries, and the direct assignment route
- complete 1 resumable self-paced attempt per assignment
- move question-by-question with saved progress before final submission
- submit late when the assignment due policy allows it
- see post-submit completion, score, percent, and rank when the scoring profile supports rank

### Current builder

Current shipped builder capabilities:

- multiple choice questions
- true/false questions
- poll questions
- type-answer questions
- class-workspace launch context with editable class prefill
- drag-and-drop question reordering
- question title editing
- option editing
- accepted-answer and alias editing for type-answer questions
- per-question time limit
- game title and description
- optional default class linkage for academic sessions
- self-paced assignment launch from the dashboard and edit page
- hidden `Assign` action on create until the first save completes and the page becomes edit mode

### Current settings

Current shipped game/session settings:

- require login to join
- show leaderboard after each question
- max players
- randomize question order
- randomize answer order
- optional default linked class on saved games
- roster-only join enforcement for class-linked sessions
- automatic join lock after live session start
- live question pause and resume

Current shipped self-paced assignment settings:

- assign to whole class or selected students
- open date
- due date
- due policy:
  - `lock_after_due`
  - `allow_late_submission`
- scoring profile:
  - `accuracy`
  - `timed_accuracy`
  - `live_scoring`

### Current runtime strengths

The strongest shipped ClassRush behaviors today are:

- reconnect and recovery handling for host and player sessions
- stable PIN and QR join path
- recoverable `/play` login-required flow through the in-page login modal and automatic join retry
- host preflight for class-linked academic sessions
- class-linked session snapshots for linked class and roster membership
- roster-only join enforcement for linked academic sessions
- automatic join lock after start plus pause/resume controls during questions
- class-aware launch paths from the teacher class board and class overview
- session-scoped question and answer randomization that stays stable through reconnects
- auto-graded type-answer support and unscored poll handling
- duplicate-session cleanup and stale-lobby handling
- completed-session reporting with non-responder, response-time, poll-distribution, and typed-answer visibility
- single-session CSV export from report detail
- teacher CRUD flow for saved games
- modal-based self-paced assignment setup from the dashboard and edit page
- dedicated assignment and attempt persistence with 1 assignment per game/class and 1 attempt per student/assignment
- authenticated self-paced student runtime with resume, due-window enforcement, and single final submission
- self-paced scoring profiles for `accuracy`, `timed_accuracy`, and `live_scoring`
- student activity integration so self-paced ClassRush shows up in dashboard, class detail, and activities instead of living in an isolated module
- teacher reporting that shows submitted, in-progress, not-started, overdue, and leaderboard state for self-paced assignments
- safe `returnTo` redirects for protected ClassRush pages so logged-out deep links return to the exact page after authentication

## Not Shipped Yet

The following ClassRush ideas appear in the broader planning docs but are not part of the currently shipped runtime:

- bulk assignment to multiple classes in a single modal action
- multiple self-paced attempts or retakes per student
- full student answer-review screens after self-paced submission
- question bank or shared libraries
- slide blocks or mixed activity sequences
- team mode
- graded mode or gradebook integration
- class or course publishing flow
- department or admin analytics
- export beyond the current live-session report detail and CSV flow
- broader academic structure linkage beyond teacher-owned live games
- institution-wide collaboration and approvals

## Next Update Scope

The planned P1-P3 ClassRush rollout wave is implemented.
The first self-paced ClassRush assignment wave is also implemented.

Current follow-up work is verification and future planning only:

- run the manual browser pass across the live and self-paced ClassRush surfaces
- confirm the self-paced assignment modal and student player layout at desktop, tablet, phone, and edge widths
- keep ClassRush docs aligned with the shipped runtime after QA findings
- choose any future work from the deferred list below or a new scoped backlog

## Deferred After This Update

The following items should remain explicitly deferred after the next update so they are not mistaken as immediate scope:

- bulk self-paced assignment across multiple classes in 1 action
- retakes or multiple self-paced attempts per student
- full post-submit answer review for self-paced attempts
- slide blocks or mixed lecture sequences
- team mode
- question banks and shared content libraries
- department or institution adoption dashboards
- gradebook sync or release workflows
- institution-wide collaboration and approval workflows
- AI-assisted generation or import flows
- broader competency mapping and mastery analytics
- institution event or tournament layers

## Source Of Truth

This document was grounded against the current runtime owners and current smoke coverage.

### Runtime owners

- `routes/liveGamePagesRoutes.js`
  - current teacher ClassRush pages, assignment detail page, and public `/play`
- `routes/liveGameBuilderApiRoutes.js`
  - current saved-game CRUD, QR, duplicate, and report endpoints
- `routes/liveGameAssignmentsApiRoutes.js`
  - current teacher self-paced assignment target, upsert, list, detail, and delete endpoints
- `routes/studentClassRushApiRoutes.js`
  - current student self-paced load, progress-save, and submit endpoints
- `routes/authWebRoutes.js`
  - current shared login handling, safe `returnTo`, and login-page redirect behavior
- `app/socketManager.js`
  - current live-session runtime, reconnect handling, and host/player socket flow
- `utils/returnTo.js`
  - current shared safe `returnTo` sanitization and login redirect construction
- `utils/liveGameSelfPaced.js`
  - current self-paced assignment normalization, attempt evaluation, rank calculation, and teacher/student report payloads
- `public/js/liveGames/teacherGameBuilder.js`
  - current builder capability, current question/settings behavior, and edit-mode assign entry
- `public/js/liveGames/liveGameAssignmentModal.js`
  - current self-paced assignment modal behavior on dashboard and builder pages
- `public/js/liveGames/teacherGameReports.js`
  - current live-report rendering, self-paced assignment reporting, and CSV export action surface
- `public/js/liveGames/selfPacedPlayer.js`
  - current authenticated student self-paced player flow
- `public/js/authClient.js`
  - current AJAX login handling for the login page and `/play` login modal
- `public/js/auth/loginPage.js`
  - current full-page login form client with `returnTo` support
- `views/pages/play.ejs`
  - current public player join, login modal, and live player UI states
- `views/pages/teacher/live-games/report-detail.ejs`
  - current teacher report detail layout and export entry point
- `views/pages/teacher/live-games/assignment-detail.ejs`
  - current teacher self-paced assignment detail layout
- `views/pages/student/classrush-assignment.ejs`
  - current student self-paced ClassRush player page

### Smoke coverage used for grounding

- `tests/smoke/liveGameBuilderApi.test.js`
- `tests/smoke/liveGamePages.test.js`
- `tests/smoke/liveGameAssignmentsApi.test.js`
- `tests/smoke/socketManager.test.js`
- `tests/smoke/studentClassRushApi.test.js`
- `tests/smoke/studentClassRushActivitiesApi.test.js`
- `tests/smoke/studentClassRushPage.test.js`
- `tests/smoke/authWebRoutes.test.js`
- `tests/smoke/playerClient.test.js`

If future implementation changes the current runtime, this document should be updated alongside the ClassRush code and tests so it remains the practical planning companion for the feature.
