# Product Requirements Document

## Product Name
ClassRush

## Parent Platform
Hellouniversity

## Document Version
Version 1.0 Draft

## 1. Product Summary

ClassRush is a live and self-paced interactive quiz and classroom engagement system built into Hellouniversity.

Its purpose is to make learning more active, measurable, and enjoyable during class sessions, remote classes, review sessions, recitations, and assignments.

ClassRush combines the speed and energy of a game-based quiz platform with the academic structure of an LMS. Unlike standalone engagement tools, ClassRush will connect directly to classes, terms, student accounts, quizzes, reports, and grading workflows inside Hellouniversity.

## 2. Problem Statement

Many LMS platforms support quizzes, but their standard quiz experience often feels slow, static, and isolated from live classroom energy.

Teachers need a tool that can do both:

- run fast live activities during class
- assign the same activity for self-paced completion later

Students need a tool that is easy to join, simple to understand, and motivating enough to keep them engaged.

Hellouniversity needs a feature that improves:

- classroom interaction
- formative assessment
- quick comprehension checks
- participation tracking
- course-level performance visibility

## 3. Product Vision

ClassRush will become the interactive learning engine of Hellouniversity.

It should let teachers move from lecture to participation in seconds.

It should let students join quickly, respond confidently, and see immediate results.

It should let institutions keep the academic benefits of an LMS while gaining the engagement of a live quiz platform.

## 4. Product Goals

### Primary Goals

- Increase student participation during live classes
- Improve formative assessment quality
- Reduce friction for starting classroom activities
- Support both live and self-paced activity delivery
- Connect activity results to the academic structure of Hellouniversity

### Secondary Goals

- Make classroom teaching more dynamic
- Provide reusable question banks for faculty
- Support collaborative content creation among instructors
- Build a signature feature that differentiates Hellouniversity from generic LMS platforms

## 5. Success Metrics

### Adoption Metrics

- Number of teachers who create at least one ClassRush activity
- Number of live sessions hosted per week
- Number of self-paced assignments created per week
- Percentage of active courses using ClassRush

### Engagement Metrics

- Average student join rate per live session
- Average completion rate per activity
- Average number of responses per student per session
- Percentage of students who finish assigned activities before deadline

### Learning Metrics

- Average accuracy per question
- Topic-level weak areas across a class
- Improvement between first attempt and later attempts
- Correlation between ClassRush performance and formal assessments

### Retention Metrics

- Percentage of teachers who reuse ClassRush after first use
- Number of activities duplicated or reused from question banks
- Frequency of repeated use in the same course

## 6. Users and Roles

### 6.1 Student

The student can:

- join live activities through PIN, QR, or link
- participate using nickname mode or verified account mode
- answer questions live or self-paced
- see score, accuracy, and ranking depending on settings
- review activity feedback if enabled
- access assigned ClassRush activities from their course

### 6.2 Teacher / Instructor

The teacher can:

- create ClassRush activities
- host live sessions
- assign self-paced sessions
- configure settings such as timers, answer order, question order, and identity requirements
- review reports
- reuse activities from a question bank
- share activities with co-teachers or departments

### 6.3 Department Admin / Academic Admin

The admin can:

- manage shared question banks
- approve institution-wide activity templates
- review usage analytics
- control feature availability based on department or institution rules

### 6.4 System Admin

The system admin can:

- manage platform settings
- define defaults for privacy, reporting, and access
- monitor system performance and security
- configure integrations with gradebook and course modules

## 7. Core Use Cases

### Teacher Use Cases

- As a teacher, I want to launch a live quiz in under one minute.
- As a teacher, I want students to join using a PIN or QR code.
- As a teacher, I want to run fun mode for engagement and graded mode for assessment.
- As a teacher, I want to assign the same activity as homework.
- As a teacher, I want to view per-student and per-question reports.
- As a teacher, I want to reuse and edit old activities instead of rebuilding them.

### Student Use Cases

- As a student, I want to join quickly without confusion.
- As a student, I want to know whether the activity is live, graded, or practice.
- As a student, I want to answer on my own device.
- As a student, I want immediate feedback when allowed.
- As a student, I want my graded participation to connect to my Hellouniversity account.

### Admin Use Cases

- As an admin, I want to see ClassRush adoption across courses.
- As an admin, I want to support shared content libraries by department.
- As an admin, I want academic reports to remain tied to verified student identities.

## 8. Product Scope

### 8.1 In Scope for Version 1

- Live teacher-hosted sessions
- Self-paced assignments
- Join by PIN
- Join by QR
- Join by direct link
- Verified account mode
- Nickname mode
- Activity builder
- Question bank
- Reports dashboard
- Basic leaderboard
- Accuracy-based mode
- Team-based mode
- Slide and question sequence support
- Course-level assignment publishing
- Gradebook-ready export structure

### 8.2 Out of Scope for Version 1

- Complex branded mini-game worlds
- Public marketplace of user-generated activities across all institutions
- AI auto-proctoring
- Voice-controlled answering
- Offline play mode
- Third-party consumer app launch
- Advanced gamified avatar economies

## 9. Benchmark-Informed Product Principles

ClassRush should follow the strongest patterns seen in current interactive quiz systems while going further on LMS integration.

Key product principles:

- quick joining matters
- live hosting must stay simple
- assignment mode must reuse the same activity
- question variety increases classroom use cases
- reporting is essential, not optional
- identity tracking becomes critical for academic use
- accessibility settings must be part of the product, not an afterthought

## 10. Feature Set

### 10.1 Participant Join Experience

#### Objective
Allow students to join a session in seconds.

#### Functional Requirements

- Student can join using:
  - PIN
  - QR code
  - direct link
- System validates whether the session is active
- Student sees session title before joining
- Student enters:
  - nickname, or
  - verified Hellouniversity identity
- Teacher can enable nickname generator
- Teacher can lock joining after session start
- Student can rejoin if connection drops
- System should handle duplicate nicknames safely

### 10.2 Activity Modes

#### Version 1 Modes

##### A. Classic Mode
- individual play
- score based on correctness and speed
- leaderboard shown between questions or at checkpoints

##### B. Accuracy Mode
- score based on correctness only
- reduced pressure
- suited for learning checks and inclusive classrooms

##### C. Team Mode
- students play in teams
- team score combines member performance
- team discussion time can be enabled

##### D. Lecture Mode
- teacher inserts instructional slides between questions
- used for live teaching with comprehension checks
- leaderboard optional

#### Future Modes

- confidence-based answering
- challenge tournaments
- department competitions
- review marathon mode

### 10.3 Delivery Modes

#### A. Live Session
Teacher hosts in real time.

#### B. Self-Paced Assignment
Teacher assigns activity with optional deadline.

#### Requirements

- Teacher chooses live or assign from the same activity
- Self-paced sessions can have:
  - start now
  - deadline
  - no deadline
- Students see the activity from:
  - course page
  - notifications
  - direct link
- Teacher can publish the same activity in multiple classes

### 10.4 Question Types

#### Version 1 Question Types

- Multiple choice
- True or False
- Poll
- Type Answer
- Short open response
- Slide block
- Ordered sequence / puzzle
- Image-based hotspot or pin question

#### Requirements

Each question should support:

- question title
- instructions
- optional media
- answer choices if applicable
- timer
- scoring rule
- explanation or feedback
- tags or topic labels
- difficulty level
- reorder by drag-and-drop

### 10.5 Slide and Activity Sequence Builder

#### Objective
Make ClassRush usable for both teaching and testing.

#### Requirements

- Builder supports mixed sequence:
  - slide
  - question
  - slide
  - poll
  - question
- Teacher can drag to reorder blocks
- Teacher can duplicate blocks
- Teacher can preview the activity before publishing
- Teacher can save draft and publish later

### 10.6 Teacher Host Control Room

#### Requirements

The live host screen must include:

- session title
- session code / PIN
- QR code
- join link
- participant counter
- start session button
- pause and resume controls
- next question control
- question progress indicator
- option to end session
- remove participant action
- lock joining toggle
- fullscreen option

#### Live Settings

- randomise question order
- randomise answer order
- timer on or off where supported
- show questions on participant devices
- reactions on or off
- sound on or off
- theme selection
- nickname generator
- verified identity requirement
- team discussion time
- accessibility options

### 10.7 Scoring System

#### Version 1 Scoring Profiles

##### Fun Profile
- correctness + speed
- leaderboard emphasis
- podium at the end

##### Class Profile
- correctness-first
- softer leaderboard
- better for quick checks

##### Graded Profile
- correctness only
- verified identity required
- export-ready result set
- optional hidden leaderboard

#### Requirements

- Teacher selects scoring profile per session
- Teacher can hide leaderboard
- Teacher can disable score display
- Teacher can enable question explanations after each item
- Team score must be computed consistently
- System stores raw answers, final score, accuracy, and response time

### 10.8 Reports and Analytics

#### Teacher Reports

- session summary
- participant list
- score ranking
- per-question accuracy
- response distribution
- completion rate
- non-responders
- average response time
- difficult topics
- export to spreadsheet
- export to PDF in future phase

#### Student Progress Reporting

Because ClassRush is part of Hellouniversity, it should go further than standalone quiz platforms by showing:

- topic mastery trend
- class participation trend
- improvement across multiple sessions
- weak competency areas
- gradebook alignment
- released versus unreleased score visibility

#### Department / Institutional Analytics

- most-used activities
- most-active instructors
- average accuracy by course
- course-level participation patterns
- adoption dashboard

### 10.9 Question Bank and Reuse

#### Requirements

- Teacher can save activity as template
- Teacher can save individual questions to personal bank
- Teacher can browse:
  - personal bank
  - course bank
  - department bank
  - institution-approved bank
- Teacher can duplicate and edit shared content
- Teacher can tag items by:
  - subject
  - course code
  - topic
  - difficulty
  - term
- Teacher can search by keyword and filter by owner

### 10.10 Collaboration and Workspace Structure

#### Proposed ClassRush Structure

##### Private Workspace
- personal drafts
- personal reports
- personal question bank

##### Course Workspace
- shared with co-teachers of one course
- shared activity library
- shared reports if permissions allow

##### Department Workspace
- approved reusable activities
- common assessment templates

##### Institution Workspace
- institution-level featured activities
- standardised review sets
- approved academic event quizzes

### 10.11 Accessibility

#### Requirements

- keyboard navigation
- high-contrast mode
- screen reader friendly labels
- timer-off mode where supported
- larger text option
- low-motion mode
- readable colour combinations
- alt text for teacher-uploaded images
- responsive design across device sizes

### 10.12 Identity and Academic Integrity

#### Requirements

- session can run in nickname mode or verified mode
- graded sessions must support verified mode
- verified mode should use Hellouniversity login identity
- teacher can enable student ID confirmation in strict mode
- activity result must remain tied to course enrolment where applicable
- logs must store join time, answer activity, and submission completion
- suspicious duplicate sessions should be flagged

## 11. User Experience Requirements

### 11.1 Student Experience Principles

- join in under 15 seconds under normal network conditions
- minimal steps before first question
- clear distinction between live and assigned mode
- clear visibility of whether scores are graded or just for fun
- simple answer interface on mobile
- immediate response confirmation after selection
- low cognitive load

### 11.2 Teacher Experience Principles

- create activity without training
- launch live session from course page quickly
- access reports without searching across modules
- duplicate activities in a few clicks
- manage settings without leaving the host screen

## 12. Functional Requirements by Screen

### 12.1 Student Join Screen

- input field for PIN
- join button
- alternate entry by QR or link
- validation errors
- institution branding
- responsive layout

### 12.2 Session Lobby Screen

- activity title
- instructor name
- course name
- waiting message
- avatar or nickname preview
- ready state
- start notice

### 12.3 Question Screen

- question text
- media area
- timer
- answer choices or response area
- submission confirmation
- progress position
- accessibility controls if enabled

### 12.4 End Screen

- final score
- rank or summary
- accuracy
- badges or achievement markers in future phase
- teacher-defined review message

### 12.5 Activity Builder

- question list on left
- editing canvas on centre
- settings panel on right
- preview button
- save draft
- publish
- duplicate
- import options in later phase

### 12.6 Reports Screen

- filter by class
- filter by date
- filter by activity
- filter by live or assignment
- student table
- question analytics
- export action

## 13. Non-Functional Requirements

### Performance

- support stable live answering for typical class sizes
- host screen updates should feel real time
- report generation should complete quickly for standard sessions

### Security

- verified results must be tied to authenticated users
- activity data must follow institutional privacy settings
- permissions must control who can view reports and edit activities

### Scalability

- architecture should support small classes first
- future-ready for institution-wide quiz events

### Reliability

- temporary network interruption should not crash the whole session
- autosave for activity builder
- retry-safe answer submission

### Compatibility

- mobile browser support
- desktop browser support
- tablet-friendly design
- projector-friendly host layout

## 14. Data Requirements

### Core Entities

- User
- Course
- Class Section
- Academic Term
- Activity
- Activity Block
- Session
- Session Participant
- Response
- Report
- Question Bank Item
- Workspace
- Team / Department
- Gradebook Mapping

### Key Fields

#### Activity
- activityId
- title
- description
- ownerId
- courseId optional
- mode availability
- visibility
- tags
- status draft or published

#### Activity Block
- blockId
- activityId
- blockType
- orderIndex
- content
- scoringRule
- timeLimit

#### Session
- sessionId
- activityId
- hostId
- classId
- deliveryMode
- scoringProfile
- joinPin
- joinLink
- isLocked
- startTime
- endTime

#### Response
- responseId
- sessionId
- participantId
- blockId
- submittedAnswer
- isCorrect
- responseTime
- scoreAwarded

## 15. Permissions Matrix

### Student
- join
- answer
- view own result where allowed

### Teacher
- create
- edit own activity
- host
- assign
- view reports for owned or shared content

### Co-Teacher
- edit shared content if granted
- host shared activities
- view class reports if granted

### Department Admin
- manage shared bank
- view department analytics
- approve templates

### Platform Admin
- full control

## 16. Integrations

### Required Internal Integrations

- Hellouniversity user accounts
- class enrolment system
- course pages
- notifications
- gradebook
- analytics dashboard

### Future Integrations

- LMS calendar
- attendance system
- AI quiz generation tool
- file upload to generate quiz drafts
- question import from slides or document content

## 17. Risks and Product Challenges

### Product Risks

- too much focus on competition may discourage some learners
- nickname mode may conflict with graded academic use
- leaderboards may not fit all class types
- teachers may want simplicity more than feature depth

### Technical Risks

- live session syncing at scale
- mobile responsiveness under classroom conditions
- ensuring reliable submissions in unstable networks
- report aggregation across repeated sessions

### Mitigation

- provide multiple modes
- allow accuracy-first and graded modes
- make leaderboard optional
- make verified mode available for academic activities
- use autosave and retry logic

## 18. MVP Definition

ClassRush MVP should include:

- join by PIN
- live hosting
- self-paced assignment
- classic mode
- accuracy mode
- team mode
- multiple choice
- true or false
- poll
- type answer
- slide blocks
- teacher host controls
- basic leaderboard
- reports dashboard
- verified student mode
- course integration
- export-ready results

## 19. Phase Plan

### Phase 1
MVP launch

- core builder
- live host
- self-paced assignment
- reports
- course integration

### Phase 2
Academic deepening

- richer reports
- gradebook sync
- department question banks
- reusable templates
- open response moderation
- activity duplication across terms

### Phase 3
Differentiation

- AI-assisted generation
- competency mapping
- mastery analytics
- institution events
- branded tournaments
- advanced collaboration workflows

## 20. Why ClassRush Matters for Hellouniversity

ClassRush should combine the best parts of interactive quiz systems with the structure of a real academic platform.

It should not feel like a copied quiz toy.

It should feel like a native Hellouniversity learning engine.
