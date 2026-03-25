# Quiz Builder MVP Plan
Updated: 2026-03-25

## Objective

Deliver a first usable version of the HelloUniversity quiz builder that teachers can use end-to-end:

- create a quiz
- add core question types
- publish to students
- collect responses
- auto-grade objective questions
- manually grade paragraph answers
- review basic analytics

## MVP Scope

### Included

- Teacher quiz dashboard
- Create/edit quiz
- Draft/publish/close lifecycle
- Question types:
  - multiple choice
  - checkbox
  - short answer
  - paragraph
  - true/false
- Required toggle
- Points per question
- Correct answers for objective items
- Student submission page
- One response per student
- Time limit
- Autosave in-progress attempt
- Teacher response list
- Manual grading for paragraph
- Basic analytics
- CSV export

### Excluded From MVP

- Shared question bank
- Matching type
- File upload
- Rubric grading
- Department sharing
- AI quiz generation
- Advanced anti-cheating
- Complex conditional sections
- Import tools

## Delivery Phases

### Phase 1: Data and Routing Foundation

Goal:
Define quiz storage, ownership rules, route boundaries, and status model.

Tasks:

- Create Mongo collections for quizzes, questions, assignments, responses, attempts
- Define status enums for quiz lifecycle and attempt lifecycle
- Add route mounts in `app/registerRoutes.js`
- Add teacher/admin guards for quiz management routes
- Add student guard logic for response routes
- Add audit logging hooks for quiz create/publish/close

Output:

- stable backend API contract
- stable storage model
- no UI yet or only stubbed UI

### Phase 2: Teacher Dashboard

Goal:
Give teachers a place to manage quizzes.

Tasks:

- Build `/teacher/quizzes`
- List quizzes owned by teacher
- Add search by title/course/class
- Add filter by status
- Add create quiz button
- Add duplicate, delete, preview, responses, analytics actions
- Show summary fields:
  - title
  - subject
  - class/section
  - status
  - question count
  - points
  - response count
  - updated date

Output:

- working teacher dashboard for quiz inventory

### Phase 3: Quiz Builder UI

Goal:
Allow teachers to create and edit quizzes.

Tasks:

- Build `/teacher/quizzes/new`
- Build `/teacher/quizzes/:quizId/edit`
- Add quiz header fields
- Add question cards
- Add question type picker
- Add duplicate/delete/reorder question controls
- Add answer option editing for objective questions
- Add required toggle and points
- Add autosave or explicit save draft
- Add teacher preview launch flow

Current implemented note:
- the builder now uses a unified bottom-fixed dock across desktop, tablet, and mobile
- the dock no longer centers around a `Review` builder action
- preview is now the primary dock preview action and opens the saved teacher preview in a new tab
- desktop keeps quick-add centered and groups `Preview`, `Save Draft`, and `Publish` together as the action cluster
- tablet and phone widths now share the same icon-first dock button treatment
- settings remain inside the builder rather than becoming the dock’s primary action

Output:

- teacher can build draft quizzes with core question types

### Phase 4: Settings and Publish Flow

Goal:
Allow teachers to configure delivery rules and publish.

Tasks:

- Add settings panel for:
  - one response per student
  - require login
  - enrolled-only access if supported by class data
  - time limit
  - start/end window
  - show score immediately or after review
- Add publish action
- Add close action
- Add validation so broken quizzes cannot publish

Output:

- quiz lifecycle usable for real classroom release

### Phase 5: Student Quiz Runner

Goal:
Let students answer quizzes reliably.

Tasks:

- Build `/quizzes/:quizId/take`
- Validate access and attempt eligibility
- Render quiz questions cleanly
- Add timer if configured
- Add autosave endpoint
- Add submit endpoint
- Add confirmation screen
- Enforce one-response rule

Output:

- students can complete quizzes end-to-end

Current distinction note:
- the saved teacher preview should not be treated as Phase 5 completion
- teacher preview is a saved teacher preview approximation
- the student quiz runner remains the actual attempt, autosave, and submission surface

### Phase 6: Response Review and Grading

Goal:
Give teachers usable response management.

Tasks:

- Build teacher response list page
- Add submission filters:
  - submitted
  - missing
  - late
- Add individual response view
- Auto-grade objective questions on submit
- Add manual grading UI for paragraph answers
- Recompute total score on teacher grading

Output:

- grading workflow usable for real classes

### Phase 7: Basic Analytics and Export

Goal:
Deliver usable teacher insight after submissions.

Tasks:

- Show total responses
- Show average/highest/lowest score
- Show submission rate
- Show most-missed questions
- Show per-question correctness
- Export results to CSV

Output:

- usable MVP analytics and reporting

## Route-Level MVP Proposal

### Teacher Pages

- `GET /teacher/quizzes`
- `GET /teacher/quizzes/new`
- `GET /teacher/quizzes/:quizId/edit`
- `GET /teacher/quizzes/:quizId/preview`
- `GET /teacher/quizzes/:quizId/responses`
- `GET /teacher/quizzes/:quizId/analytics`

### Student Pages

- `GET /quizzes/:quizId/take`
- `GET /quizzes/:quizId/submission/:attemptId`

### Teacher/Admin APIs

- `GET /api/quizzes`
- `POST /api/quizzes`
- `GET /api/quizzes/:quizId`
- `PUT /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/duplicate`
- `POST /api/quizzes/:quizId/publish`
- `POST /api/quizzes/:quizId/close`
- `POST /api/quizzes/:quizId/archive`
- `GET /api/quizzes/:quizId/responses`
- `GET /api/quizzes/:quizId/analytics`
- `PUT /api/quiz-responses/:responseId/grade`
- `GET /api/quizzes/:quizId/export.csv`

### Student APIs

- `POST /api/quizzes/:quizId/start`
- `PUT /api/quiz-attempts/:attemptId/save`
- `POST /api/quiz-attempts/:attemptId/submit`
- `GET /api/quiz-attempts/:attemptId`

## MVP Acceptance Criteria

The MVP is done when all of the following are true:

- teacher can create a draft quiz
- teacher can add at least five core question types
- teacher can publish a valid quiz
- student can open assigned quiz and submit one response
- objective items are auto-graded
- paragraph answers can be manually graded
- teacher can view scores and responses
- teacher can export response results to CSV

## Risks

### Risk: Overbuilding the Builder First

If the builder becomes too feature-rich before student submission and grading exist, the product will look impressive but still not be usable.

Mitigation:

- prioritize end-to-end flow over advanced editing controls

### Risk: Quiz Structure Keeps Changing

Changing question schema late will break responses and grading.

Mitigation:

- lock the MVP question model before response collection work starts

### Risk: Grading Rules Become Inconsistent

Auto-grading and manual overrides can drift if not modeled cleanly.

Mitigation:

- store both raw answer and final scored result separately

## Suggested Build Order

1. Data model and route mounts
2. Teacher dashboard
3. Quiz builder
4. Settings and publish flow
5. Student quiz runner
6. Response/grading pages
7. Analytics and export

## Post-MVP Direction

After MVP, the highest-value next steps are:

- sections
- matching type
- question bank
- richer analytics
- notification workflows

Those add meaningful teacher value without changing the core architecture too much.



