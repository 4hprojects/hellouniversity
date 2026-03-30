# ClassRush Development Task Breakdown by Module

## Document Purpose
This document turns the ClassRush PRD into a build-ready development breakdown for Hellouniversity.

It is organised by module so you can assign work by feature area, sequence the build properly, and avoid starting front-end work before the required data and API foundations are ready.

---

## 1. Build Objective
ClassRush will be an interactive learning feature inside Hellouniversity that supports:

- live teacher-hosted quiz sessions
- self-paced assignments
- student join by PIN, QR, or direct link
- multiple activity modes such as Classic, Accuracy, Team, and Lecture
- question and slide-based activity building
- reports, analytics, and course-linked result tracking
- verified academic identity for graded activities

---

## 2. Recommended Technical Direction for Hellouniversity
Since Hellouniversity already works as an LMS-style platform, the safest build approach is to split responsibilities clearly.

### Suggested responsibility split
- **PostgreSQL / Supabase**
  - academic terms
  - classes
  - courses
  - enrolments
  - gradebook records
  - release settings
- **MongoDB**
  - ClassRush activities
  - activity blocks
  - live sessions
  - real-time participant state
  - responses
  - reports snapshots
  - question banks

### Suggested server responsibilities
- **Express / Node.js**
  - REST APIs
  - session validation
  - permissions
  - activity publishing
  - report generation
  - live session orchestration
- **Socket layer**
  - live join updates
  - participant counters
  - question transitions
  - answer submissions
  - leaderboard updates

### Suggested UI responsibilities
- **Teacher views**
  - dashboard pages
  - builder pages
  - reports pages
  - host control room
- **Student views**
  - join flow
  - lobby
  - player screen
  - assignment screen
  - result view

---

## 3. Delivery Strategy
Do not build everything at once.

### Recommended sequence
1. Foundations and data model
2. Activity builder
3. Live session engine
4. Student join and play flow
5. Scoring and leaderboard
6. Self-paced assignment mode
7. Reports and analytics
8. Question bank and reuse
9. Gradebook integration
10. Admin and optimisation layer

---

## 4. Module Breakdown

# Module 0. Project Foundation and Architecture

## Objective
Prepare the system structure before feature development begins.

## Main Tasks
- create the ClassRush feature folder structure in the project
- define route groups for teacher, student, session, reports, and admin flows
- decide naming conventions for models, controllers, services, and sockets
- define MongoDB collections and indexes
- define Supabase tables or references needed for academic linkage
- define shared utility services for permissions, validation, timers, and scoring
- define environment variables and feature flags
- create error handling pattern for ClassRush routes and sockets
- set up audit logging for important actions

## Deliverables
- folder structure
- initial route map
- model map
- socket event map
- environment variable checklist
- architecture notes

## Dependencies
- none

## Suggested Owner
- lead developer / backend architect

---

# Module 1. Data Model and Database Layer

## Objective
Create the core data structure for activities, sessions, participants, and responses.

## Main Entities
- Activity
- ActivityBlock
- Session
- SessionParticipant
- Response
- ReportSnapshot
- QuestionBankItem
- Workspace
- ActivityShare
- GradebookMapping

## Main Tasks
- design Activity schema
- design ActivityBlock schema for mixed block types
- design Session schema with mode, delivery type, host, PIN, status, timing, and settings
- design SessionParticipant schema with identity mode, nickname, join status, team, and score fields
- design Response schema with answer payload, correctness, score awarded, and response time
- design ReportSnapshot schema for cached session analytics
- design QuestionBankItem schema and search fields
- add indexes for PIN lookup, host lookup, course lookup, report lookup, and assignment lookup
- decide archival strategy for old live sessions and response data

## Recommended Fields

### Activity
- activityId
- ownerId
- courseId optional
- classId optional
- title
- description
- tags
- status
- visibility
- supportedModes
- createdAt
- updatedAt

### ActivityBlock
- blockId
- activityId
- blockType
- title
- instructions
- media
- choices
- correctAnswers
- scoringRule
- timeLimitSeconds
- orderIndex
- explanation
- tags
- difficulty

### Session
- sessionId
- activityId
- hostId
- classId
- deliveryMode
- scoringProfile
- activityMode
- joinPin
- joinLinkToken
- qrPayload
- isLocked
- status
- startTime
- endTime
- currentBlockIndex
- settings

### SessionParticipant
- participantId
- sessionId
- userId optional
- nickname
- identityMode
- joinedAt
- isConnected
- teamId optional
- totalScore
- accuracy
- completed

### Response
- responseId
- sessionId
- participantId
- activityBlockId
- submittedAnswer
- isCorrect
- scoreAwarded
- responseTimeMs
- submittedAt

## Deliverables
- schema definitions
- indexes
- migration notes
- sample test data

## Dependencies
- Module 0

## Suggested Owner
- backend developer

---

# Module 2. Permissions, Identity, and Academic Context Integration

## Objective
Make ClassRush work properly inside Hellouniversity classes and roles.

## Main Tasks
- map Hellouniversity roles to ClassRush permissions
- define teacher, co-teacher, student, department admin, and system admin capabilities
- integrate verified student identity using Hellouniversity login
- support nickname mode for non-graded live sessions
- connect sessions to course, class section, and academic term
- validate enrolment before showing graded assignments
- validate teacher ownership or shared access before editing or hosting activities
- define permission checks for viewing reports
- define visibility rules for personal, course, department, and institution workspaces

## Deliverables
- permission middleware
- role capability matrix
- enrolment validation service
- identity mode rules

## Dependencies
- Module 1

## Suggested Owner
- backend developer

---

# Module 3. Activity Builder

## Objective
Allow teachers to create mixed-sequence ClassRush activities.

## Builder Scope
- slides
- multiple choice
- true or false
- poll
- type answer
- short open response
- puzzle / sequence
- image hotspot or pin question

## Main Tasks
- create activity library page
- create activity creation page
- create activity edit page
- build left-side block navigator
- build central editor area for selected block
- build right-side settings panel
- support add block actions
- support duplicate block action
- support drag-and-drop block reordering
- support draft save
- support activity preview
- support activity publish and unpublish
- validate required fields before publish
- support tags, difficulty, time limit, and explanation per block
- support media upload and media removal

## UI Components
- activity header
- save draft button
- publish button
- add block dropdown
- sortable block list
- question form components
- media uploader
- preview modal or preview route

## API Requirements
- create activity
- update activity metadata
- add block
- update block
- reorder blocks
- duplicate block
- delete block
- publish activity
- archive activity
- fetch activity preview data

## Deliverables
- teacher activity library UI
- activity builder UI
- activity builder APIs
- validation rules

## Dependencies
- Modules 1 and 2

## Suggested Owner
- full-stack developer

---

# Module 4. Live Session Engine

## Objective
Enable teachers to host a live ClassRush session in real time.

## Main Tasks
- create host setup modal or page
- allow teacher to choose:
  - activity mode
  - scoring profile
  - identity mode
  - question randomisation
  - answer randomisation
  - timer settings
  - reactions on or off
  - team mode on or off
  - join lock behaviour
- generate session PIN, link, and QR payload
- create live session record
- build host control room page
- show participant count in real time
- allow host to start, pause, resume, skip, and end session
- keep current block state in sync for all connected participants
- handle late joins where allowed
- handle reconnect logic
- allow host to remove a participant
- allow host to lock joining after the game starts

## Socket Events to Design
- session:created
- session:joined
- session:left
- session:locked
- session:started
- session:paused
- session:resumed
- session:blockChanged
- session:ended
- participant:removed
- leaderboard:updated

## Deliverables
- host setup flow
- host control room UI
- live session creation API
- socket event layer
- reconnect behaviour

## Dependencies
- Modules 1, 2, and 3

## Suggested Owner
- backend developer plus front-end developer

---

# Module 5. Student Join Flow and Lobby Experience

## Objective
Make student entry fast and clear.

## Main Tasks
- create join by PIN page
- support direct join by link token
- support QR-based join
- validate whether session exists and is joinable
- show activity title and host details before entry
- support nickname input for nickname mode
- support automatic verified identity in account-linked mode
- prevent duplicate active join conflicts where needed
- build session lobby screen
- show waiting state before host starts
- show team assignment if team mode is enabled
- handle full session or locked session messages

## UI Components
- PIN input
- join button
- validation message area
- nickname field
- join confirmation state
- lobby screen with title and waiting message

## API Requirements
- validate join PIN
- join session
- reconnect participant
- fetch lobby state

## Deliverables
- join flow pages
- session lobby
- validation handling

## Dependencies
- Modules 2 and 4

## Suggested Owner
- front-end developer

---

# Module 6. Player Screen and Answer Submission

## Objective
Let students answer reliably on desktop and mobile.

## Main Tasks
- create live player screen for all supported block types
- render question text, media, timer, and answers clearly
- support multiple answer layouts depending on question type
- support slide-only display blocks
- confirm submitted answer visually
- disable repeated submissions unless block rules allow change
- store response time properly
- handle time-expiry behaviour
- handle answer validation for each question type
- handle reconnection without corrupting current state
- create end-of-question feedback state if enabled

## UI Components
- question area
- timer area
- answer controls
- submit confirmation state
- progress indicator
- result feedback card

## API and Socket Requirements
- receive current block payload
- submit answer
- acknowledge answer receipt
- receive block transition
- receive score update

## Deliverables
- player UI
- submission service
- validation logic for answer types

## Dependencies
- Modules 1, 4, and 5

## Suggested Owner
- front-end developer plus backend developer

---

# Module 7. Scoring, Leaderboard, and Team Logic

## Objective
Compute results correctly across multiple session styles.

## Main Tasks
- implement Classic scoring profile
- implement Accuracy scoring profile
- implement Graded scoring profile
- implement team score aggregation rules
- define leaderboard update frequency
- support hidden leaderboard sessions
- support no-score or low-pressure mode for lecture use
- compute accuracy and completion metrics per participant
- handle ties predictably
- create final podium or summary output

## Rules to Finalise
- speed weight formula for Classic mode
- correctness-only formula for Accuracy mode
- whether partial credit is allowed for multiple-select items
- how team averages or sums are computed
- whether polls and slides affect score

## Deliverables
- scoring service
- leaderboard service
- configurable scoring profile settings
- test cases for scoring consistency

## Dependencies
- Modules 4 and 6

## Suggested Owner
- backend developer

---

# Module 8. Self-Paced Assignment Mode

## Objective
Reuse the same activity for asynchronous completion.

## Main Tasks
- create assignment setup modal
- allow teacher to select:
  - class or classes
  - open date
  - due date
  - no-deadline mode
  - scoring profile
  - attempts policy
  - visibility in course feed
- show assigned activity on student course page
- allow student to start and complete assignment on their own time
- store assignment-specific result records
- decide whether students can review answers after submission
- define late submission behaviour
- support duplicate assignment creation from one activity

## UI Components
- assignment setup form
- student assignment card
- assignment instructions page
- self-paced player view
- submission confirmation view

## API Requirements
- create assignment
- list assignments for a class
- fetch assignments for a student
- submit self-paced response batch or per-question response
- close assignment after deadline

## Deliverables
- assignment publishing flow
- student assignment access flow
- assignment result storage

## Dependencies
- Modules 2, 3, and 6

## Suggested Owner
- full-stack developer

---

# Module 9. Reports and Analytics

## Objective
Give teachers usable insight after live and assigned activities.

## Report Views
- summary view
- participants view
- question view
- trend view

## Main Tasks
- create session summary metrics
- compute average score, accuracy, completion rate, and participation rate
- show per-student performance table
- show per-question performance table
- show answer distribution for choice-based items
- identify hardest questions
- show non-responders or incomplete participants
- support filtering by class, activity, teacher, date, and live versus assignment mode
- support export to spreadsheet
- create report snapshot generation so reports load faster
- create student progress trend view across sessions

## Deliverables
- reports dashboard UI
- report APIs
- export functionality
- report snapshot generation job or service

## Dependencies
- Modules 1, 6, 7, and 8

## Suggested Owner
- backend developer plus front-end developer

---

# Module 10. Question Bank and Reuse

## Objective
Make ClassRush efficient for repeated teaching use.

## Main Tasks
- allow teacher to save individual questions to question bank
- allow teacher to save full activity as reusable template
- create personal bank view
- create course bank view
- create department bank view
- create institution-approved bank view
- support search and filter by topic, subject, difficulty, owner, and tags
- support duplicate into my library
- support edit after duplication without changing original
- support sharing activity with co-teacher or workspace

## Deliverables
- question bank UI
- search and filter APIs
- sharing and duplication APIs

## Dependencies
- Modules 2 and 3

## Suggested Owner
- full-stack developer

---

# Module 11. Gradebook Integration

## Objective
Connect ClassRush to formal academic records when needed.

## Main Tasks
- define which ClassRush sessions can be marked as graded
- create grade mapping settings
- allow teacher to send selected result fields to gradebook
- support participation-only grading option
- support accuracy-based grading option
- support score percentage grading option
- respect released versus unreleased score logic already used by Hellouniversity
- support grade preview before posting
- log grade sync actions for audit

## Deliverables
- grade mapping UI
- grade sync service
- audit logs

## Dependencies
- Modules 2, 7, 8, and 9

## Suggested Owner
- backend developer

---

# Module 12. Notifications and Course Feed Integration

## Objective
Make sure students and teachers see ClassRush activities in the right places.

## Main Tasks
- show live session notifications in teacher and student views where relevant
- show self-paced assignment cards in course pages
- send in-app notification when a new assignment is published
- show due date reminders for unfinished assignments
- create completion notice for teachers if needed
- add quick launch link from course page to ClassRush activity library

## Deliverables
- notification triggers
- course feed cards
- due date reminder logic

## Dependencies
- Modules 2 and 8

## Suggested Owner
- full-stack developer

---

# Module 13. Admin, Governance, and Workspace Management

## Objective
Support shared institutional use without losing control.

## Main Tasks
- create workspace visibility rules
- create department admin approval workflow for shared templates if needed
- create institution-level featured content area
- define archival or retention rules for reports and sessions
- create usage analytics dashboard for admins
- define moderation workflow for inappropriate public-facing titles or content if you later allow broader sharing

## Deliverables
- workspace management UI
- admin analytics view
- retention policy rules

## Dependencies
- Modules 2, 9, and 10

## Suggested Owner
- backend developer plus admin-facing UI developer

---

# Module 14. Accessibility, Responsiveness, and UX Hardening

## Objective
Make the feature usable across device types and learner needs.

## Main Tasks
- ensure mobile-first layout for student player screens
- support keyboard navigation
- add focus states for all interactive controls
- support high-contrast mode
- support large text mode where practical
- support low-motion option for leaderboard and transitions
- support timer-off mode in eligible session types
- add alt text support for uploaded images
- test across desktop, tablet, and phone breakpoints

## Deliverables
- accessibility checklist
- responsive UI fixes
- QA notes by device size

## Dependencies
- touches Modules 3, 5, 6, and 9

## Suggested Owner
- front-end developer plus QA

---

# Module 15. QA, Testing, and Release Readiness

## Objective
Reduce bugs before rollout.

## Main Tasks
- write unit tests for scoring logic
- write API tests for session lifecycle
- test join flow with valid and invalid PINs
- test reconnect behaviour
- test multiple question types
- test live sessions with simulated multiple participants
- test late join behaviour
- test assignment completion and deadline logic
- test report generation and exports
- test permission boundaries by role
- test course integration and grade mapping
- create rollback and release checklist

## Deliverables
- QA test cases
- bug log
- release checklist
- MVP sign-off list

## Dependencies
- all core feature modules

## Suggested Owner
- QA and developers

---

## 5. Suggested API Grouping

### Teacher Activity APIs
- POST `/classrush/activities`
- GET `/classrush/activities`
- GET `/classrush/activities/:activityId`
- PUT `/classrush/activities/:activityId`
- POST `/classrush/activities/:activityId/publish`
- POST `/classrush/activities/:activityId/archive`

### Block APIs
- POST `/classrush/activities/:activityId/blocks`
- PUT `/classrush/blocks/:blockId`
- DELETE `/classrush/blocks/:blockId`
- POST `/classrush/activities/:activityId/reorder-blocks`
- POST `/classrush/blocks/:blockId/duplicate`

### Live Session APIs
- POST `/classrush/activities/:activityId/live-sessions`
- GET `/classrush/live-sessions/:sessionId`
- POST `/classrush/live-sessions/:sessionId/start`
- POST `/classrush/live-sessions/:sessionId/pause`
- POST `/classrush/live-sessions/:sessionId/resume`
- POST `/classrush/live-sessions/:sessionId/end`
- POST `/classrush/live-sessions/:sessionId/lock`

### Join and Participant APIs
- POST `/classrush/join/validate-pin`
- POST `/classrush/join/:sessionId`
- GET `/classrush/live-sessions/:sessionId/lobby`
- POST `/classrush/live-sessions/:sessionId/reconnect`

### Response APIs
- POST `/classrush/live-sessions/:sessionId/respond`
- POST `/classrush/assignments/:assignmentId/respond`

### Assignment APIs
- POST `/classrush/activities/:activityId/assign`
- GET `/classrush/classes/:classId/assignments`
- GET `/classrush/my-assignments`

### Reports APIs
- GET `/classrush/reports`
- GET `/classrush/reports/:reportId`
- GET `/classrush/reports/:reportId/export`

### Question Bank APIs
- GET `/classrush/question-bank`
- POST `/classrush/question-bank/save-question`
- POST `/classrush/question-bank/save-activity-template`
- POST `/classrush/question-bank/:itemId/duplicate`

### Gradebook APIs
- POST `/classrush/reports/:reportId/map-to-gradebook`
- POST `/classrush/reports/:reportId/post-grades`

---

## 6. Suggested Front-End Page Map

### Teacher Pages
- `/hellouniversity/classrush`
- `/hellouniversity/classrush/activities/new`
- `/hellouniversity/classrush/activities/:activityId/edit`
- `/hellouniversity/classrush/live/:sessionId/host`
- `/hellouniversity/classrush/reports`
- `/hellouniversity/classrush/reports/:reportId`
- `/hellouniversity/classrush/question-bank`

### Student Pages
- `/classrush/join`
- `/classrush/join/:token`
- `/classrush/live/:sessionId/lobby`
- `/classrush/live/:sessionId/play`
- `/classrush/assignments/:assignmentId`
- `/classrush/assignments/:assignmentId/result`

### Admin Pages
- `/hellouniversity/classrush/admin/workspaces`
- `/hellouniversity/classrush/admin/analytics`
- `/hellouniversity/classrush/admin/templates`

---

## 7. Priority Breakdown

## Must Build for MVP
- Module 0 Foundation
- Module 1 Data Model
- Module 2 Permissions and Identity
- Module 3 Activity Builder
- Module 4 Live Session Engine
- Module 5 Student Join Flow
- Module 6 Player Screen
- Module 7 Scoring and Leaderboard
- Module 8 Self-Paced Assignment Mode
- Module 9 Reports and Analytics
- Module 14 Accessibility and Responsiveness
- Module 15 QA and Release Readiness

## Should Build Soon After MVP
- Module 10 Question Bank and Reuse
- Module 11 Gradebook Integration
- Module 12 Notifications and Course Feed

## Can Follow Later
- Module 13 Admin Governance Layer
- advanced competition features
- AI-assisted content generation
- institution-wide challenge events

---

## 8. Suggested Sprint Order

## Sprint 1
- Module 0
- Module 1
- Module 2

## Sprint 2
- Module 3
- base media upload support
- builder validation

## Sprint 3
- Module 4
- Module 5

## Sprint 4
- Module 6
- Module 7

## Sprint 5
- Module 8
- Module 9

## Sprint 6
- Module 10
- Module 11
- Module 12

## Sprint 7
- Module 13
- Module 14
- Module 15 hardening and rollout

---

## 9. Team Assignment Suggestion

### Backend Developer
- Modules 0, 1, 2, 4, 7, 8, 9, 11, 13

### Front-End Developer
- Modules 3, 5, 6, 9, 14

### Full-Stack Developer
- Modules 3, 8, 10, 12

### QA / Tester
- Module 15 and validation coverage across all modules

### Project Lead
- sprint sequencing
- dependency control
- acceptance review
- release readiness

---

## 10. Acceptance Checklist for MVP

ClassRush MVP is ready for internal testing when:

- teacher can create and publish an activity
- teacher can host a live session and receive a PIN
- student can join through PIN and answer from mobile browser
- scoring updates properly during live play
- teacher can assign the same activity as self-paced work
- reports show participant and question results correctly
- verified sessions connect results to the correct student account
- UI works on mobile and desktop
- accessibility basics are present
- core permission checks prevent unauthorised access

---

## 11. Recommended Immediate Next Step
Before coding UI screens deeply, create these three first:

- final data model and indexes
- permission matrix and identity rules
- live session socket event contract

Why start there?

Because if those three shift late, your builder, host screen, student flow, reports, and grade mapping will all need rework.

---

## 12. Best Practical Build Advice
If you want ClassRush to feel stable in version 1, keep the first release tight.

Build these first:

- Multiple choice
- True or False
- Poll
- Type Answer
- Slide block
- Classic mode
- Accuracy mode
- Team mode
- Live hosting
- Self-paced assignment
- Reports

Delay these until later:

- advanced open response moderation
- heavy animation layers
- complex public content marketplace
- gamified avatar systems
- AI generation inside the builder

That approach gives Hellouniversity a strong, usable academic feature faster.
