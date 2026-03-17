# Teacher Class Management Architecture Note
Updated: 2026-03-17

## Goal

Document the current teacher class management shape in HelloUniversity and the class-communication pieces that are now live:

- class creation
- enrollment control
- teacher workspace navigation
- announcements
- assessment attachment
- student class detail integration
- class lifecycle management

This module now connects naturally with quizzes, student class pages, and the shared announcement feed.

## Product Shape

The class management module currently behaves as a teacher-facing domain with these primary surfaces:

1. Class dashboard
2. Class overview workspace
3. Student roster management
4. Teaching team management
5. Assessment attachment and announcement management
6. Class archive and duplication flows

Each class acts like a teacher workspace with lifecycle, ownership, and communication state.

## High-Level Architecture

### Frontend Areas

Current teacher-facing pages:

- `Class Dashboard`
  List of teacher-owned classes with search, status, and quick actions
- `Class Overview`
  Overview, schedule, join code, activity, and quick management actions
- `Class Students`
  Roster, enrollment actions, access control
- `Class Announcements`
  Teacher-owned communication area with flat discussion under each announcement

Scaffolded but not live yet:

- `Class Modules`
- `Class Materials`
- `Class Settings`

### Backend Areas

The backend is currently split by responsibility across a few concrete modules:

- class metadata and lifecycle
- roster and enrollment
- teaching team
- announcements
- student class read models
- archival and duplication

## Current Server Modules

Active route/module split:

- `routes/teacherPagesRoutes.js`
  Teacher class pages, including `/teacher/classes/:classId/announcements`
- `routes/teacherClassManagementApiRoutes.js`
  Teacher class dashboard, detail, roster, team, archive, restore, duplicate, join-code regeneration
- `routes/classAnnouncementsRoutes.js`
  Shared class announcement feed, comments, and likes under `/api/classes/:classId/announcements*`
- `routes/studentWebRoutes.js`
  Student class hub and class detail data, with announcements loaded separately from the shared feed API

Current page routes:

- `/teacher/classes`
- `/teacher/classes/new`
- `/teacher/classes/:classId`
- `/teacher/classes/:classId/students`
- `/teacher/classes/:classId/team`
- `/teacher/classes/:classId/announcements`
- `/classes`
- `/classes/:classId`

## Frontend Component Direction

Current component direction:

- `ClassDashboardShell`
- `ClassCard`
- `ClassHeaderSummary`
- `JoinCodeCard`
- `RosterTable`
- `ModuleTree`
- `MaterialList`
- `AnnouncementComposer`

The teacher class overview acts as the management hub. The student class detail page now embeds the announcement feed above the activity board.

## Persistence Model

Use MongoDB as the source of truth for class management data, consistent with the rest of the current app.

Current design:

- one main class document for metadata, ownership, roster, and teaching team
- separate collections for announcements, announcement comments, and announcement reactions
- denormalized student/team counts on teacher summaries for dashboard speed

Announcements were intentionally split out of the class document first because they carry their own feed ordering, comment volume, and reaction state.

## Lifecycle Model

### Class Statuses

Recommended class statuses:

- `draft`
- `active`
- `archived`

Rules:

- `draft` classes are teacher-visible only and not joinable
- `active` classes can accept students and publish content
- `archived` classes are read-only by default and block new announcements, comments, and likes

### Enrollment States

Recommended enrollment states:

- `active`
- `pending`
- `disabled`
- `removed`

This will matter once pending approval and disabled student access are supported.

## Relationship to Other Modules

### Quizzes

Classes should be able to own or reference assigned quizzes, but quiz authoring should remain in the quiz module.

### Assignments

Assignments can be attached to classes through a class-assessment link rather than stored directly in the class document.

### Gradebook

Gradebook should read class enrollment and assessment outcomes, not duplicate them.

### Announcements

Announcements are class-scoped and now live as a shared communication module:

- teachers post from `/teacher/classes/:classId/announcements`
- students read and respond from `/classes/:classId`
- comments are flat, not threaded
- reactions are `like` only in v1

## Access Control

### Teacher

- can create and manage owned classes
- can manage enrolled students in owned classes
- class owner can create, edit, and delete announcements
- class owner can delete any announcement comment in the class

### Co-Teacher / Teaching Assistant

- permissions should be role-based per class, not global
- current implementation allows read access to the announcement feed
- co-teachers and admins are read-only in announcement threads for v1

### Admin

- can inspect all classes
- can archive/restore
- can audit ownership and class activity
- can read the announcement feed but cannot post/comment/react in v1

### Student

- can join active classes if allowed
- can only access enrolled class content
- enrolled students can comment and like announcements in active classes

## Audit and Logs

Important class events should be logged:

- class created
- class published/activated
- join code regenerated
- students added/removed
- class archived/restored
- collaborator added/removed
- module deleted
- announcement posted

The existing `tblLogs` collection can support initial system tracking, but class activity logs should use consistent action names and details.

## MVP Technical Constraints

Current v1 constraints:

- no drafts, scheduling, or pinning for announcements
- no attachments or rich text
- no threaded replies
- no co-teacher announcement authoring

Current live focus:

- class create/edit
- class listing
- join code
- teacher-owned class detail page
- student roster management
- teaching team management
- basic announcements
- student responses through comments and likes
- archive and duplicate

## Recommended File Organization

Current implementation paths:

- `routes/teacherPagesRoutes.js`
- `routes/teacherClassManagementApiRoutes.js`
- `routes/classAnnouncementsRoutes.js`
- `views/pages/teacher/classes/dashboard.ejs`
- `views/pages/teacher/classes/editor.ejs`
- `views/pages/teacher/classes/overview.ejs`
- `views/pages/teacher/classes/students.ejs`
- `views/pages/teacher/classes/announcements.ejs`
- `public/js/teacherClassesDashboard.js`
- `public/js/teacherClassAnnouncements.js`
- `public/js/studentClasses.js`

## Current Status and Next Likely Expansions

Teacher dashboard, overview, roster, team management, archive/duplicate, student class hub, and class announcements are live.

The most natural next class-management expansions are modules, materials, and richer collaborator policy once the communication flow is stable.
