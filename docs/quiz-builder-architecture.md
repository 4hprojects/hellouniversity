# Quiz Builder Architecture Note
Updated: 2026-03-26

## Goal

Build a quiz system for HelloUniversity that combines:

- Google Forms style quiz authoring
- LMS-style grading and response workflows
- school-specific role control
- reusable question bank and analytics over time

This note focuses on system shape, boundaries, and implementation direction.

## Current Implementation Snapshot

The quiz builder is now partially implemented and no longer exists only as a proposal.

Current production-safe slice:

- teacher quiz dashboard under `/teacher/quizzes`
- teacher quiz builder under `/teacher/quizzes/new` and `/teacher/quizzes/:quizId/edit`
- visible sectioned quiz authoring with section titles/descriptions
- teacher preview, responses, and analytics pages
- builder API under `/api/quiz-builder/quizzes*`
- student runtime API under `/api/quizzes*`
- optional class assignment sync for class-linked quizzes

Implemented constraints and behavior:

- quiz ownership is currently owner-only for teachers
- supported builder question types are:
  - `multiple_choice`
  - `checkbox`
  - `true_false`
  - `short_answer`
  - `paragraph`
- quizzes now persist inline `sections[]` plus flat `questions[]` with `sectionId`
- sections are visible to students in one continuous flow, not page-break steps
- the builder supports section reorder plus question reorder within/across sections
- desktop sorting uses drag-and-drop, while compact layouts expose explicit move controls
- teacher authoring now uses one shared bottom-fixed dock across desktop, tablet, and mobile instead of separate dock concepts
- desktop keeps the quick-add cluster centered while the dock action cluster remains right-aligned
- tablet and phone widths now share the same icon-first dock button treatment
- dock preview now saves first when needed and opens the saved teacher preview in a new tab
- dock action ordering now groups `Preview` beside `Save Draft` and `Publish`
- builder class selection is optional, so quizzes can be authored and published before being assigned
- `correctAnswers` is now the canonical answer field for all question types
- question settings are exposed through a dedicated submenu with progressive disclosure instead of always-visible inline controls
- question-level builder flags now include:
  - `shuffleOptionOrder`
  - `goToSectionBasedOnAnswer`
- publishing a class-linked quiz auto-upserts one assignment record in the class-quiz pivot, while publishing without `classId` leaves the quiz unassigned
- student quiz delivery uses a normalized runtime shape instead of trusting raw builder documents
- student quiz delivery now includes grouped section metadata while preserving flat answer submission by question id
- `randomizeQuestionOrder` keeps authored section order fixed and shuffles questions only inside each section
- student `start` now creates or reuses an attempt instead of only validating access
- scoring is full-credit-or-zero for the current supported question types
- open-text questions can now be authored without accepted answers to support teacher-managed manual review setup
- `paragraph` is currently auto-graded by exact text matching when accepted answers exist; a full manual grading workflow is still not implemented

Still not implemented from the broader architecture direction:

- separate section/question collections
- question bank
- manual grading workflow
- rubric-based paragraph or essay grading
- advanced analytics or cached analytics summaries
- scheduled publish lifecycle beyond the current publish action

## Product Shape

The quiz builder should be treated as a module with four primary surfaces:

1. Teacher authoring
2. Student delivery
3. Teacher grading and analytics
4. Admin oversight and audit

The first implementation should avoid trying to solve every quiz use case at once. The module should support the core lifecycle well:

- create quiz
- edit draft
- publish quiz
- accept responses
- grade responses
- review analytics
- close or archive quiz

## High-Level Architecture

The current implementation still uses two main route modules:

- `routes/quizBuilderApiRoutes.js`
- `routes/quizManagementRoutes.js`

That is acceptable for the current slice, but future expansion should still move toward the smaller-module split described below.

### Frontend Areas

The frontend should be split into distinct surfaces instead of one large page:

- `Quiz Dashboard`
  Teacher list/search/filter page for owned quizzes
- `Quiz Builder`
  Authoring UI for quiz header, questions, sections, settings, dock actions, and preview launch
- `Quiz Preview`
  Saved teacher preview that approximates the student-facing layout
- `Quiz Response Manager`
  Teacher-facing response summary, grading, and export views
- `Student Quiz Runner`
  Student answering flow with timing, autosave, and submit
- `Question Bank`
  Search and reuse saved questions

### Backend Areas

The backend should be split by responsibility:

- quiz metadata and lifecycle
- quiz question/section editing
- assignment and availability rules
- response collection and autosave
- grading
- analytics
- question bank
- audit logging

This should not be a single overloaded `quizRoutes.js` file. It should follow the current repo direction of smaller route modules.

## Recommended Server Modules

Suggested route/module split:

- `routes/quizDashboardRoutes.js`
  Teacher/admin quiz listing, search, duplication, archive
- `routes/quizBuilderRoutes.js`
  Create/update quiz structure, questions, sections, settings
- `routes/quizPublishRoutes.js`
  Draft/publish/close/archive transitions
- `routes/quizAssignmentRoutes.js`
  Class targeting, section targeting, availability, attempt rules
- `routes/quizResponseRoutes.js`
  Start attempt, autosave answers, submit attempt
- `routes/quizGradingRoutes.js`
  Manual grading, review state, score recomputation
- `routes/quizAnalyticsRoutes.js`
  Summary metrics, item analysis, charts
- `routes/questionBankRoutes.js`
  Save/reuse/search/tag questions

Suggested page routes:

- `routes/teacherQuizPagesRoutes.js`
  - `/teacher/quizzes`
  - `/teacher/quizzes/new`
  - `/teacher/quizzes/:quizId/edit`
  - `/teacher/quizzes/:quizId/preview`
  - `/teacher/quizzes/:quizId/responses`
  - `/teacher/quizzes/:quizId/analytics`
- `routes/studentQuizPagesRoutes.js`
  - `/quizzes/:quizId/respond`
  - `/quizzes/:quizId/submission/:attemptId`

## Frontend Component Direction

### Builder Layout

The builder UI should be componentized by domain, not by visual fragment only.

Recommended structure:

- `QuizBuilderShell`
- `QuizHeaderEditor`
- `QuizActionDock`
- `QuizSectionList`
- `QuizQuestionCard`
- `QuestionTypePicker`
- `QuestionOptionEditor`
- `QuizSettingsPanel`
- `QuestionSettingsMenu`
- `QuizPreviewPage`
- `QuestionBankPicker`

Current implementation note:

- the builder already behaves more like a compact structured editor than a broad form page
- the dock is now a central interaction surface, not just an accessory desktop toolbar
- preview is a separate saved teacher preview page, not an inline preview pane and not the student runtime itself

### Preview Surface Distinction

The current system has two different preview-like experiences that should not be conflated:

- `Teacher Preview`
  - route: `/teacher/quizzes/:quizId/preview`
  - purpose: saved teacher preview for authors
  - behavior: loads saved builder data and renders disabled answer surfaces
- `Student Quiz Runner`
  - purpose: actual attempt flow
  - route: `/quizzes/:quizId/respond`
  - behavior: starts attempts, captures answers, autosaves, and submits

Architectural implication:

- the teacher preview is a presentation surface for author validation
- the student runner remains the real delivery/runtime surface
- future work can improve fidelity between them, but they should still remain separate concerns unless the product intentionally merges them

### State Shape

The quiz builder will need local editing state before persistence. A normalized state model is better than deeply nested UI-only structures.

Current note:

- the implemented builder currently uses nested `sections[]` with in-memory question arrays because it simplified section-aware authoring and cross-section sorting
- a future normalized client state is still the better long-term direction if the builder grows into question banks, richer collaboration, or larger quizzes

Recommended client state groups:

- `quizMeta`
- `sectionsById`
- `sectionOrder`
- `questionsById`
- `questionOrderBySection`
- `draftSettings`
- `dirtyFlags`
- `saveStatus`

This reduces problems with drag-drop reorder, duplicate question, and question bank insertion.

Current implementation note:

- the current builder also maintains UI-only state for:
  - active question
  - drag preview
  - question description expansion
  - question secondary-panel expansion
  - unified dock status/readiness rendering
  - submenu positioning state derived from the viewport

## Persistence Model

Use MongoDB as the source of truth for quiz data, consistent with the rest of the current app.

Recommended design:

- one main quiz document for metadata and lifecycle
- separate collections for sections/questions/options/responses
- denormalized summary fields where needed for dashboard speed

Avoid storing the entire quiz, every response, and analytics all inside one giant document. That will become hard to query and update safely.

## Lifecycle Model

### Quiz Statuses

Recommended status machine:

- `draft`
- `published`
- `closed`
- `archived`

Rules:

- only `draft` quizzes are freely editable
- `published` quizzes can accept responses
- `closed` quizzes are read-only for students
- `archived` quizzes stay out of normal teacher lists unless filtered

### Attempt Lifecycle

Recommended attempt states:

- `not_started`
- `in_progress`
- `submitted`
- `late_submitted`
- `graded`
- `returned`

## Grading Model

Split grading into:

- objective auto-graded answers
- manually graded answers
- final computed score

Store:

- raw answer value
- auto-grade result if applicable
- teacher override if applicable
- per-question earned score
- total computed score snapshot

This is important so regrading and analytics can be done without losing original answers.

## Analytics Model

Do not fully compute analytics on every page request from raw answers once scale grows.

Recommended approach:

- initial version: compute on request for single quiz analytics
- later: cache summary metrics into `quiz_analytics`

Metrics to support:

- submission rate
- score distribution
- question correctness
- average completion time
- most-missed questions
- item difficulty

## Access Control

Role boundaries should stay strict.

### Teacher

- can create and manage own quizzes
- can publish own quizzes
- can view and grade responses for own quizzes

### Admin

- can view all quizzes
- can archive/restore
- can inspect audit logs
- can intervene in system-level quiz settings if needed

### Student

- can only access assigned quizzes
- can only view own submissions and scores when allowed

The backend must enforce ownership checks. Client-side hiding is not enough.

## Audit and Logs

Quiz activity should write to audit logs for important events:

- quiz created
- quiz published
- quiz closed
- quiz archived
- question deleted
- settings changed
- response submitted
- grade overridden

The current `tblLogs` approach can support initial quiz audit entries, but the schema should be made more structured for quiz events over time.

## MVP Technical Constraints

For the first version:

- do not build every question type
- do not build AI generation yet
- do not build complex anti-cheating first
- do not build shared departmental banks first

Focus on a reliable core:

- draft editing
- publish/close
- student response flow
- auto grading for objective items
- manual grading for paragraph/open-text items
- basic analytics

## Recommended File Organization

Suggested new paths:

- `routes/quizDashboardRoutes.js`
- `routes/quizBuilderRoutes.js`
- `routes/quizResponseRoutes.js`
- `routes/quizGradingRoutes.js`
- `routes/quizAnalyticsRoutes.js`
- `routes/questionBankRoutes.js`
- `views/pages/teacher/quizzes/dashboard.ejs`
- `views/pages/teacher/quizzes/builder.ejs`
- `views/pages/teacher/quizzes/responses.ejs`
- `views/pages/teacher/quizzes/analytics.ejs`
- `views/pages/student/quiz/take.ejs`
- `public/js/quizDashboard.js`
- `public/js/quizBuilder.js`
- `public/js/quizResponses.js`
- `public/js/quizAnalytics.js`
- `public/js/studentQuizRunner.js`
- `public/css/quizBuilder.css`
- `public/css/studentQuiz.css`

## Build Recommendation

Start with the backend data model and route boundaries first, then build the teacher dashboard and builder UI, then the student submission flow, then grading and analytics.

That order reduces rework because the quiz structure becomes stable before response handling and analytics are layered on top.
