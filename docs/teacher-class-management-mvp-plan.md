# Teacher Class Management MVP Plan
Updated: 2026-03-14

## Objective

Deliver a first usable teacher class management flow that supports:

- class creation
- class editing
- join code generation
- basic student roster management
- module organization
- basic material uploads/links
- basic announcements
- archive/restore/duplicate flow

## MVP Scope

### Included

- Teacher class dashboard
- Create/edit class
- Draft/active/archive lifecycle
- Join code generation
- Class detail page
- Student roster view
- Add/remove students
- Module list and ordering
- Basic material entries
- Basic announcements
- Archive and restore
- Duplicate class for next term without students/grades/responses

### Excluded From MVP

- Pending enrollment approval workflow
- Full teaching team permissions
- Rich discussion/comments
- Full gradebook
- Deep analytics
- Email invite workflow
- Advanced material versioning
- Student access disabling per item

## Delivery Phases

### Phase 1: Data and Route Foundation

Goal:
Define class status model, route ownership, and collection boundaries.

Tasks:

- Define class lifecycle
- Add route mounts
- Add class page routes
- Add teacher ownership checks
- Add audit log event naming

Output:

- stable backend contract for class management

### Phase 2: Teacher Class Dashboard

Goal:
Give teachers a central place to see and manage owned classes.

Tasks:

- Build `/teacher/classes`
- Search classes by class name, code, section, term
- Filter by draft / active / archived
- Add create class action
- Show summary card fields:
  - class name
  - course code
  - term
  - section
  - status
  - student count
  - updated date

Output:

- usable teacher class inventory screen

### Phase 3: Class Create/Edit Flow

Goal:
Allow teachers to create and maintain class metadata.

Tasks:

- Build `/teacher/classes/new`
- Build `/teacher/classes/:classId`
- Add core class fields
- Add save draft
- Add activate/publish flow
- Add regenerate join code action
- Add self-enrollment toggle

Output:

- class lifecycle usable end-to-end

### Phase 4: Student Roster Management

Goal:
Let teachers control enrollment.

Tasks:

- Build `/teacher/classes/:classId/students`
- Show roster table
- Add manual student add
- Add CSV upload entry point
- Add remove student action
- Add status column

Output:

- practical roster management for teachers

### Phase 5: Modules and Materials

Goal:
Allow teachers to structure content and attach resources.

Tasks:

- Build `/teacher/classes/:classId/modules`
- Create/rename/reorder/hide/delete modules
- Build `/teacher/classes/:classId/materials`
- Add material entries
- Attach materials to modules

Output:

- class content structure becomes usable

### Phase 6: Announcements and Settings

Goal:
Allow class communication and class behavior configuration.

Tasks:

- Build `/teacher/classes/:classId/announcements`
- Post/pin announcements
- Build `/teacher/classes/:classId/settings`
- Add settings for:
  - self-enrollment
  - comments/discussion toggle
  - late submissions
  - grade visibility rules

Output:

- class communication and behavior controls

### Phase 7: Archive / Restore / Duplicate

Goal:
Support semester transition workflows.

Tasks:

- Archive class
- Restore archived class
- Duplicate class metadata/modules/materials
- Exclude students, grades, responses from duplication

Output:

- teacher semester rollover workflow

## MVP Route Proposal

### Teacher Pages

- `GET /teacher/classes`
- `GET /teacher/classes/new`
- `GET /teacher/classes/:classId`
- `GET /teacher/classes/:classId/students`
- `GET /teacher/classes/:classId/modules`
- `GET /teacher/classes/:classId/materials`
- `GET /teacher/classes/:classId/announcements`
- `GET /teacher/classes/:classId/settings`

### Teacher APIs

- `GET /api/teacher/classes`
- `POST /api/teacher/classes`
- `GET /api/teacher/classes/:classId`
- `PUT /api/teacher/classes/:classId`
- `POST /api/teacher/classes/:classId/generate-join-code`
- `POST /api/teacher/classes/:classId/activate`
- `POST /api/teacher/classes/:classId/archive`
- `POST /api/teacher/classes/:classId/restore`
- `POST /api/teacher/classes/:classId/duplicate`
- `GET /api/teacher/classes/:classId/students`
- `POST /api/teacher/classes/:classId/students`
- `DELETE /api/teacher/classes/:classId/students/:studentId`
- `GET /api/teacher/classes/:classId/modules`
- `POST /api/teacher/classes/:classId/modules`
- `PUT /api/teacher/classes/:classId/modules/:moduleId`
- `DELETE /api/teacher/classes/:classId/modules/:moduleId`
- `GET /api/teacher/classes/:classId/materials`
- `POST /api/teacher/classes/:classId/materials`
- `DELETE /api/teacher/classes/:classId/materials/:materialId`
- `GET /api/teacher/classes/:classId/announcements`
- `POST /api/teacher/classes/:classId/announcements`
- `PUT /api/teacher/classes/:classId/settings`

## MVP Acceptance Criteria

The MVP is done when:

- teacher can create a class draft
- teacher can activate a class and get a join code
- teacher can edit class details
- teacher can view and manage roster
- teacher can create modules
- teacher can attach basic materials
- teacher can post announcements
- teacher can archive and duplicate a class

## Risks

### Risk: Class Model Becomes Too Broad

Classes connect to many subdomains and can become bloated early.

Mitigation:

- keep metadata, roster, modules, materials, and announcements cleanly separated

### Risk: Existing Class Routes Become Hard to Extend

The current `classesRoutes.js` already mixes multiple concerns.

Mitigation:

- add new teacher class modules instead of overloading the current route file indefinitely

### Risk: Duplicate Flow Copies Too Much

Semester rollover duplication can accidentally carry over student or grading data.

Mitigation:

- explicitly whitelist duplicated entities

## Suggested Build Order

1. Class dashboard and create/edit flow
2. Join code and lifecycle state
3. Student roster management
4. Modules and materials
5. Announcements and settings
6. Archive/restore/duplicate

## Post-MVP Direction

After MVP, the highest-value next steps are:

- co-teacher and TA roles
- approval-based enrollment
- gradebook integration
- student activity analytics
- richer material workflows

That keeps the class system useful early while leaving space to grow into a full LMS-style teacher workspace.
