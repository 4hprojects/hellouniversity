# ClassRush Wireframe Specification

## Parent Platform
Hellouniversity

## Feature Name
ClassRush

## Document Type
Screen-by-Screen Wireframe Specification

## Version
Draft 1.0

---

# 1. Purpose

This document translates the ClassRush PRD into a practical wireframe guide.

It defines the main screens, components, user actions, data needs, and expected behaviour for the first build of ClassRush inside Hellouniversity.

The goal is to help designers, developers, and stakeholders align on what each screen should contain before UI design and coding begin.

---

# 2. Design Principles

## 2.1 Product Principles

ClassRush should feel:

- fast to join
- easy to host
- simple to understand
- engaging for students
- academically useful for teachers
- native to Hellouniversity

## 2.2 UI Principles

The interface should:

- prioritise speed and clarity
- work well on desktop and mobile
- reduce steps before participation
- keep teacher controls visible during live sessions
- make grading and non-grading modes clearly different
- support accessibility from the start

## 2.3 Experience Principles

Students should be able to:

- join quickly
- understand what to do immediately
- answer with minimal friction
- know if the activity is graded, live, or practice

Teachers should be able to:

- create activities without training
- launch a live game quickly
- assign activities without rebuilding content
- review results from the same feature area

---

# 3. User Flows

## 3.1 Student Live Flow

1. Student opens ClassRush join page
2. Student enters PIN, scans QR, or opens join link
3. Student enters nickname or uses verified account
4. Student waits in lobby
5. Teacher starts session
6. Student answers questions on device
7. Student sees feedback and score based on settings
8. Student reaches end screen with results summary

## 3.2 Student Assignment Flow

1. Student opens course page or notification
2. Student sees assigned ClassRush activity
3. Student opens activity
4. Student completes questions on own device
5. Student submits and views completion state
6. Student sees feedback if allowed

## 3.3 Teacher Live Hosting Flow

1. Teacher opens activity library or course page
2. Teacher selects an activity
3. Teacher clicks Host Live
4. Teacher configures session settings
5. System generates PIN, QR, and join link
6. Students join
7. Teacher controls the session from host screen
8. Teacher ends session
9. Teacher opens report

## 3.4 Teacher Assignment Flow

1. Teacher selects an activity
2. Teacher clicks Assign
3. Teacher chooses class or classes
4. Teacher sets deadline or no deadline
5. Teacher publishes assignment
6. Students access activity from course
7. Teacher reviews results later

---

# 4. Global Navigation Structure

## 4.1 Student Entry Points

Students can access ClassRush from:

- direct join page
- QR code
- join link
- course page
- notifications
- dashboard widget in future phase

## 4.2 Teacher Entry Points

Teachers can access ClassRush from:

- course page
- ClassRush activity library
- shared question bank
- recent activities panel
- reports dashboard

## 4.3 Suggested Main Navigation Tabs

For teachers, the ClassRush module should include:

- Library
- Create
- Assignments
- Live Sessions
- Reports
- Question Bank
- Shared Content

---

# 5. Screen Specifications

# 5.1 Student Join Screen

## Screen Name
Join ClassRush

## Purpose
Allow students to enter a live session quickly.

## Main Components

- Hellouniversity logo or ClassRush branding
- page title: Join ClassRush
- PIN input field
- Join button
- option text for QR join
- option text for direct link join
- session validation message area
- help text for students
- responsive layout for mobile

## Primary Actions

- enter PIN
- submit PIN
- open camera for QR scan in later phase if supported
- continue to identity screen

## Behaviour

- validate whether the PIN exists
- validate whether the session is still open
- show clear error states
- keep the experience simple and uncluttered

## Empty and Error States

- invalid PIN
- session has ended
- session is locked
- network error

## Notes

This screen should feel lightweight and fast.
It should not require students to browse through menus.

---

# 5.2 Student Identity Screen

## Screen Name
Join Identity

## Purpose
Capture how the student will appear in the session.

## Main Components

- session title
- course or instructor label if available
- mode label:
  - Nickname Mode
  - Verified Mode
- nickname input field
- random nickname button if enabled
- Continue button
- student account confirmation if verified mode is required

## Primary Actions

- enter nickname
- generate random nickname
- confirm verified identity
- continue to lobby

## Behaviour

- in nickname mode, student can proceed with nickname
- in verified mode, the system should use authenticated Hellouniversity identity
- prevent duplicate display names if strict uniqueness is enabled

## Validation Rules

- nickname required in nickname mode
- nickname length limit
- disallow restricted words if moderation is enabled

---

# 5.3 Student Lobby Screen

## Screen Name
Waiting Lobby

## Purpose
Hold participants before the live session begins.

## Main Components

- session title
- class or course label
- instructor name
- nickname or verified name display
- waiting message
- participant joined confirmation
- animated waiting state kept minimal
- accessibility note if needed

## Primary Actions

- wait for session start
- leave session

## Behaviour

- update state when teacher starts
- allow late joining if teacher settings permit
- keep the lobby visually clean for projector and mobile understanding

---

# 5.4 Student Live Question Screen

## Screen Name
Live Question Player

## Purpose
Present each live question clearly on the student device.

## Main Components

- question number and total count
- timer
- question text
- media area for image or other supported media
- answer area depending on type
- progress indicator
- submit confirmation
- accessibility controls in future phase

## Answer Area by Type

### Multiple Choice
- answer buttons

### True or False
- two answer buttons

### Poll
- answer options with no correctness cues during answering

### Type Answer
- short answer field
- submit button

### Puzzle / Sequence
- draggable ordering blocks

### Pin / Hotspot
- interactive image area

## Behaviour

- disable changes after submission if session rules require it
- show submitted state instantly
- handle reconnection safely where possible
- timer behaviour follows teacher settings

---

# 5.5 Student Between-Question Feedback Screen

## Screen Name
Question Result

## Purpose
Show the result of the just-finished question.

## Main Components

- correctness message if allowed
- answer explanation if enabled
- updated score
- rank or leaderboard preview if enabled
- waiting state for next question

## Variants

### Fun Mode
- show score change
- show position or podium movement

### Class Mode
- show correct answer and explanation
- de-emphasise competition

### Graded Mode
- may hide comparative ranking
- may show only completion confirmation

---

# 5.6 Student Final Results Screen

## Screen Name
Session Complete

## Purpose
Summarise the student’s session result.

## Main Components

- completion message
- final score
- rank if enabled
- accuracy percentage
- number correct out of total
- teacher message or next step
- return to course button if relevant

## Optional Future Components

- badge earned
- topic insight
- mastery level

---

# 5.7 Student Assignment List Screen

## Screen Name
My ClassRush Assignments

## Purpose
Let students view assigned self-paced activities.

## Main Components

- list of assigned activities
- course filter
- status labels:
  - Not Started
  - In Progress
  - Completed
  - Overdue
- deadline label
- score visibility label if applicable

## Primary Actions

- open assignment
- resume assignment
- review submission state

---

# 5.8 Student Self-Paced Activity Screen

## Screen Name
Assigned Activity Player

## Purpose
Allow students to complete ClassRush activities independently.

## Main Components

- activity title
- instructions
- progress tracker
- question content area
- next and previous navigation if allowed
- submit final activity button
- timer only if enabled

## Behaviour

- present question on the student screen
- save progress safely in case of interruption
- enforce deadline and availability rules
- show feedback after submission if teacher allows it

---

# 5.9 Teacher Activity Library Screen

## Screen Name
ClassRush Library

## Purpose
Let teachers browse, search, and manage all activities.

## Main Components

- page title
- Create Activity button
- search bar
- filters:
  - course
  - term
  - status
  - owner
  - shared/private
  - activity type
- activity cards or table list
- quick actions on each activity:
  - Edit
  - Host Live
  - Assign
  - Duplicate
  - Archive
  - Delete

## Card or Row Data

- title
- description short preview
- owner
- last updated
- number of blocks
- tags
- visibility
- draft or published status

---

# 5.10 Teacher Create / Edit Activity Screen

## Screen Name
Activity Builder

## Purpose
Allow teachers to build and edit ClassRush activities.

## Recommended Layout

### Left Panel
- block list
- add block button
- drag-and-drop reordering

### Centre Panel
- active block editor
- preview of question or slide content

### Right Panel
- settings for selected block
- timing
- scoring
- answer configuration
- feedback and explanation

## Top Bar

- activity title field
- Save Draft
- Preview
- Publish
- More Actions

## Supported Block Types for MVP

- Slide
- Multiple Choice
- True or False
- Poll
- Type Answer
- Open Response
- Puzzle
- Image Pin

## Block Editing Fields

- block title
- instructions
- media upload area
- answer options if applicable
- correct answer logic if applicable
- timer
- points type
- explanation
- tags
- difficulty

## Behaviour

- autosave draft
- drag-and-drop reorder
- duplicate block
- delete block
- preview current flow
- keep unsaved change protection

---

# 5.11 Teacher Host Setup Modal or Page

## Screen Name
Host Live Setup

## Purpose
Configure a live session before launching it.

## Main Components

- activity summary
- class selection
- game mode selection:
  - Classic
  - Accuracy
  - Team
  - Lecture
- scoring profile selection
- settings toggles:
  - randomise questions
  - randomise answers
  - show leaderboard
  - show questions on student devices
  - nickname generator
  - verified identity required
  - allow late join
  - sound on or off
  - timer options
- Start Session button

## Behaviour

- generate PIN and link only after creation of session
- save chosen session settings to this session only

---

# 5.12 Teacher Live Host Control Room

## Screen Name
Live Host Dashboard

## Purpose
Give the teacher full control of the session in real time.

## Recommended Layout

### Top Bar
- session title
- course and section label
- session status
- participant count
- End Session button

### Left Area
- current question preview
- question progress
- upcoming block indicator

### Centre Area
- presentation display or question display
- large-screen friendly layout

### Right Area
- session controls
- participant panel
- settings shortcuts

## Main Controls

- Start
- Pause
- Resume
- Next
- End
- Lock Join
- Full Screen
- Remove Participant
- Toggle Leaderboard

## Join Information Panel

- live PIN
- QR code
- shareable link

## Behaviour

- show real-time participant count
- allow teacher to move session forward safely
- support projector-based teaching
- keep controls visible without clutter

---

# 5.13 Teacher Assignment Setup Modal or Page

## Screen Name
Assign Activity

## Purpose
Publish a self-paced ClassRush activity to one or more classes.

## Main Components

- activity summary
- class selector
- open date
- due date
- no-deadline option
- attempt rules in future phase
- scoring visibility rules
- feedback visibility rules
- Publish Assignment button

## Behaviour

- one activity can be assigned to multiple classes
- assigned activity should appear in course module and notifications

---

# 5.14 Teacher Reports Dashboard

## Screen Name
ClassRush Reports

## Purpose
Allow teachers to review activity performance.

## Main Components

- filter bar
- reports list or summary cards
- report type tabs:
  - Session Summary
  - Participants
  - Questions
  - Trends
- export button

## Summary View Components

- activity title
- session mode
- date and time
- total participants
- completion rate
- average score
- average accuracy
- average response time

## Participants View

- student name
- nickname if applicable
- score
- accuracy
- completion state
- response time

## Questions View

- question text preview
- percent correct
- answer distribution
- hardest questions
- skipped questions

## Trends View

- repeated activity performance in future phase
- topic mastery in future phase

---

# 5.15 Teacher Student Detail Report Screen

## Screen Name
Student Performance Detail

## Purpose
Show a single learner’s performance for one activity or across multiple sessions.

## Main Components

- student identity
- course and class context
- activity history
- latest score
- accuracy trend
- topic breakdown
- question-by-question view

## Notes

This screen is where Hellouniversity can go beyond simple game reporting.
It should support academic interpretation, not just entertainment metrics.

---

# 5.16 Question Bank Screen

## Screen Name
Question Bank

## Purpose
Let teachers browse and reuse individual questions or full activities.

## Main Components

- search bar
- filters:
  - subject
  - course code
  - topic
  - difficulty
  - owner
  - workspace
- list of reusable items
- preview panel
- actions:
  - Use in Activity
  - Duplicate
  - Save to Personal Bank

## Bank Levels

- Personal
- Course
- Department
- Institution

---

# 5.17 Shared Content Screen

## Screen Name
Shared Activities

## Purpose
Allow collaborative access to approved or shared ClassRush content.

## Main Components

- shared activity list
- owner or department label
- approval label
- duplicate action
- open in builder action
- preview action

## Notes

This should support co-teaching and institutional reuse.

---

# 5.18 Admin Analytics Screen

## Screen Name
ClassRush Adoption Dashboard

## Purpose
Provide department or institution-level insight.

## Main Components

- adoption summary cards
- usage over time charts
- most active teachers
- most used activities
- participation rate by course
- average accuracy by subject

## Audience

- department admin
- academic leadership
- system admin

---

# 6. Key Components Library

These reusable UI components should be designed once and reused across screens.

## Student Components

- PIN input card
- nickname input card
- answer button grid
- timer chip
- progress bar
- result card

## Teacher Components

- activity card
- block list item
- question editor form
- live settings panel
- participant table
- report summary card
- filter bar
- workspace badge

## Shared Components

- QR display card
- join link card
- confirmation modal
- empty state panel
- status badge
- error banner
- loading state panel

---

# 7. States to Design

Each major screen should include design states for:

- loading
- empty
- error
- success
- no-permission
- network interruption where relevant

## Important Examples

### Join Screen
- invalid PIN
- expired session
- locked session

### Library Screen
- no activities yet
- no search matches

### Reports Screen
- no results yet
- report still generating in future phase

### Builder Screen
- draft saved
- unsaved changes
- validation error on incomplete question

---

# 8. Accessibility Requirements for Wireframes

Wireframes must account for:

- keyboard navigation
- visible focus states
- readable contrast
- scalable text
- low-motion preference
- alt text support for uploaded images
- timer-independent mode where needed
- mobile button size suitable for touch

---

# 9. Mobile and Responsive Expectations

## Student Experience

Student-facing screens must be mobile-first.

Priority screens for mobile optimisation:

- join screen
- identity screen
- live question screen
- assignment player
- final results screen

## Teacher Experience

Teacher screens should be desktop-first but responsive.

Priority screens for responsive desktop and tablet support:

- activity library
- builder
- host dashboard
- reports dashboard

---

# 10. Wireframe Priorities for MVP

## Must Design First

- Student Join Screen
- Student Identity Screen
- Student Lobby Screen
- Student Live Question Screen
- Student Final Results Screen
- Teacher Activity Library
- Teacher Activity Builder
- Host Setup
- Live Host Dashboard
- Assignment Setup
- Reports Dashboard

## Can Be Designed Next

- Student Assignment List
- Student Self-Paced Activity Screen
- Student Detail Report
- Question Bank
- Shared Content
- Admin Analytics

---

# 11. Suggested Build Order

## Stage 1
Core participation

- Join screen
- Identity screen
- Lobby screen
- Live question player
- Final results screen

## Stage 2
Teacher authoring and hosting

- Activity library
- Activity builder
- Host setup
- Live host dashboard

## Stage 3
Assignments and reporting

- Assignment setup
- Student self-paced player
- Reports dashboard

## Stage 4
Reuse and institutional scaling

- Question bank
- Shared content
- Admin analytics

---

# 12. Notes for Designers and Developers

ClassRush should not look like a separate product bolted onto Hellouniversity.

It should feel like a native Hellouniversity feature with stronger classroom energy.

The biggest design challenge is balancing two needs:

- game-like engagement
- academic seriousness

That balance should appear in:

- visual tone
- leaderboard control
- verified identity modes
- report structure
- grading-aware session settings

---

# 13. Recommended Next Deliverable

After this wireframe specification, the next useful document is:

- a development task breakdown by module
- or a database schema draft for ClassRush

