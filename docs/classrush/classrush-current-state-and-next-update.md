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
- This file now reflects the current shipped baseline after the planned P1-P3 rollout wave.

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

### Public route

Current public player route:

- `/play`

The public player flow supports:

- PIN-based join
- optional prefilled PIN from query string
- nickname entry
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

Current socket runtime is served through the `/game` Socket.IO namespace.

### Current gameplay model

Current shipped gameplay is live-hosted sessions only.

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

Students can:

- join through `/play`
- enter a PIN and nickname
- reconnect to the same live session when supported by the current reconnect logic
- answer questions on their own device during a live teacher-hosted game

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

### Current runtime strengths

The strongest shipped ClassRush behaviors today are:

- reconnect and recovery handling for host and player sessions
- stable PIN and QR join path
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

## Not Shipped Yet

The following ClassRush ideas appear in the broader planning docs but are not part of the currently shipped runtime:

- self-paced assignments
- question bank or shared libraries
- slide blocks or mixed activity sequences
- team mode
- graded mode or gradebook integration
- class or course publishing flow
- department or admin analytics
- export beyond the current single-session report detail and CSV flow
- broader academic structure linkage beyond teacher-owned live games
- institution-wide collaboration and approvals

## Next Update Scope

The planned P1-P3 ClassRush rollout wave is now implemented.

Current follow-up work is verification and future planning only:

- run the manual browser pass in `docs/classrush/classrush-p3-qa-checklist.md`
- keep ClassRush docs aligned with the shipped runtime after QA findings
- choose any future work from the deferred list below or a new scoped backlog

## Deferred After This Update

The following items should remain explicitly deferred after the next update so they are not mistaken as immediate scope:

- self-paced assignment mode
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
  - current teacher ClassRush pages and public `/play`
- `routes/liveGameBuilderApiRoutes.js`
  - current saved-game CRUD, QR, duplicate, and report endpoints
- `app/socketManager.js`
  - current live-session runtime, reconnect handling, and host/player socket flow
- `public/js/liveGames/teacherGameBuilder.js`
  - current builder capability and current question/settings behavior
- `public/js/liveGames/teacherGameReports.js`
  - current report detail rendering and CSV export action surface
- `views/pages/play.ejs`
  - current public player join and live player UI states
- `views/pages/teacher/live-games/report-detail.ejs`
  - current teacher report detail layout and export entry point

### Smoke coverage used for grounding

- `tests/smoke/liveGameBuilderApi.test.js`
- `tests/smoke/liveGamePages.test.js`
- `tests/smoke/socketManager.test.js`

If future implementation changes the current runtime, this document should be updated alongside the ClassRush code and tests so it remains the practical planning companion for the feature.
