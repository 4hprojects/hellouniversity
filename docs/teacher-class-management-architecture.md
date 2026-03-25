# Teacher Class Management Architecture Note
Updated: 2026-03-24

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
  Overview, schedule, join code, activity, insights, and quick management actions
- `Class Students`
  Roster, enrollment actions, access control
- `Class Team`
  Teaching team review, role updates, and collaborator add/remove flow
- `Class Announcements`
  Teacher-owned communication area with flat discussion under each announcement
- `Class Modules`
  Module CRUD, hide/show, and atomic reorder
- `Class Materials`
  Link/video/note management plus upload-backed document/file materials with edit, hide/show, replace-file, and atomic reorder
- `Class Settings`
  Enrollment, discussion, grade visibility, late-policy, join-code, and archive/restore controls

### Backend Areas

The backend is currently split by responsibility across a few concrete modules:

- class metadata and lifecycle
- class insights and overview summaries
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
  Composition entrypoint that mounts the teacher class API route family
- `routes/teacherClassManagementCoreApiRoutes.js`
  Teacher class dashboard, detail, insights, lifecycle, duplicate, activate, and join-code regeneration APIs
- `routes/teacherClassManagementRosterApiRoutes.js`
  Teacher class roster preview/add/remove APIs
- `routes/teacherClassManagementTeamApiRoutes.js`
  Teaching-team list, preview, add, role update, and remove APIs
- `routes/teacherClassManagementContentApiRoutes.js`
  Teacher class modules, materials, and settings APIs
- `routes/teacherClassManagementShared.js`
  Shared helpers for class loading, serialization, ownership filters, team normalization, and audit-log writes
- `routes/classAnnouncementsRoutes.js`
  Shared class announcement feed, comments, and likes under `/api/classes/:classId/announcements*`
- `routes/studentWebRoutes.js`
  Student class hub and class detail data, with announcements loaded separately from the shared feed API
- `utils/classInsights.js`
  Class overview insight aggregation across classes, class quizzes, attempts, announcements, and logs

Current page routes:

- `/teacher/classes`
- `/teacher/classes/new`
- `/teacher/classes/:classId`
- `/teacher/classes/:classId/students`
- `/teacher/classes/:classId/team`
- `/teacher/classes/:classId/modules`
- `/teacher/classes/:classId/materials`
- `/teacher/classes/:classId/announcements`
- `/teacher/classes/:classId/settings`
- `/classes`
- `/classes/:classId`

## Frontend Component Direction

Current component direction:

- `ClassDashboardShell`
- `ClassCard`
- `ClassHeaderSummary`
- `JoinCodeCard`
- `ClassInsightGrid`
- `RosterTable`
- `ModuleTree`
- `MaterialList`
- `AnnouncementComposer`

The teacher class overview acts as the management hub. It now combines class facts, quick actions, roster/team previews, and read-only insight panels for workload and engagement. The student class detail page now embeds the announcement feed above the activity board.

## Persistence Model

Use MongoDB as the source of truth for class management data, consistent with the rest of the current app.

Current design:

- one main class document for metadata, ownership, roster, and teaching team
- separate collections for announcements, announcement comments, and announcement reactions
- uploaded class material binaries stored in Cloudflare R2, with file metadata persisted inside class material entries
- denormalized student/team counts on teacher summaries for dashboard speed
- insight summaries computed at read time from classes, class quizzes, attempts, announcements, and logs

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
- class owner alone manages class lifecycle, join-code regeneration, and teaching-team membership/roles

### Co-Teacher / Teaching Assistant

- permissions are role-based per class, not global
- `co_teacher` can manage roster, modules, materials, settings, and class announcements
- `co_teacher` cannot manage lifecycle, join-code regeneration, or teaching-team membership/roles
- `teaching_assistant` can manage modules and materials only
- `teaching_assistant` is read-only for roster, settings, lifecycle, and announcements
- `viewer` is read-only across the teacher class workspace

### Admin

- can inspect all classes
- can archive/restore
- can audit ownership and class activity
- can read the announcement feed but cannot post/comment/react in class feeds

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
- no teaching-assistant or viewer announcement authoring
- one uploaded file per material
- no bulk upload or version history for uploaded materials

Current live focus:

- class create/edit
- class listing and filtering
- join code regeneration
- teacher-owned class detail page
- class overview insight panels
- student roster management
- teaching team management
- modules and materials management
- class settings management
- basic announcements
- student responses through comments and likes
- archive, restore, and duplicate

## Recommended File Organization

Current implementation paths:

- `routes/teacherPagesRoutes.js`
- `routes/teacherClassManagementApiRoutes.js`
- `routes/teacherClassManagementCoreApiRoutes.js`
- `routes/teacherClassManagementRosterApiRoutes.js`
- `routes/teacherClassManagementTeamApiRoutes.js`
- `routes/teacherClassManagementContentApiRoutes.js`
- `routes/teacherClassManagementShared.js`
- `routes/classAnnouncementsRoutes.js`
- `docs/teacher-class-management-qa-checklist.md`
- `views/pages/teacher/classes/dashboard.ejs`
- `views/pages/teacher/classes/editor.ejs`
- `views/pages/teacher/classes/overview.ejs`
- `views/pages/teacher/classes/students.ejs`
- `views/pages/teacher/classes/announcements.ejs`
- `public/js/teacherClassesDashboard.js`
- `public/js/teacherClassAnnouncements.js`
- `public/js/studentClasses.js`

## Current Status and Next Likely Expansions

Teacher dashboard, overview, roster, team management, archive/duplicate, modules, materials, settings, student class hub, and class announcements are live.

The current collaborator policy is now implemented and enforced across teacher class management, materials now support real file uploads backed by object storage, and class overview now includes first-pass insight panels. The most natural next class-management expansions are deeper analytics, manual UX validation across the teacher collaboration roles, and future material improvements such as previews or bulk upload if needed.

Current validation work should use the role-by-role QA sheet in `docs/teacher-class-management-qa-checklist.md`.
