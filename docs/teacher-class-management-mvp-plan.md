# Teacher Class Management MVP Plan
Updated: 2026-03-24

## Objective

This note now tracks what the original MVP became in the current app, plus the remaining obvious follow-up work.

Implemented teacher class-management flow supports:

- class creation and editing
- join code generation
- student roster management
- teaching-team management
- module management
- upload-backed material management
- announcements
- class settings
- class overview insight panels
- archive / restore / duplicate

## Current MVP Status

### Implemented

- Teacher class dashboard
- Create / edit class
- Draft / active / archived lifecycle
- Join code generation
- Class overview page
- Student roster view
- Add / remove students
- Teaching-team preview / add / role update / remove
- Module CRUD and atomic ordering
- Material CRUD with upload-backed document/file support, hide/show, replace-file, and atomic ordering
- Class settings page
- Collaborator role policy across roster, content, settings, and announcements
- Class overview KPI, attention, engagement, and recent-activity insight panels
- Basic announcements
- Archive / restore
- Duplicate class without students / responses

### Not Implemented

- Pending enrollment approval workflow
- CSV roster upload
- Email invite workflow
- Rich announcement features
- Full gradebook
- Deep class analytics
- Per-student access disabling
- Bulk upload and material file version history

## Actual Route Set

### Teacher Pages

- `GET /teacher/classes`
- `GET /teacher/classes/new`
- `GET /teacher/classes/:classId`
- `GET /teacher/classes/:classId/edit`
- `GET /teacher/classes/:classId/students`
- `GET /teacher/classes/:classId/team`
- `GET /teacher/classes/:classId/modules`
- `GET /teacher/classes/:classId/materials`
- `GET /teacher/classes/:classId/announcements`
- `GET /teacher/classes/:classId/settings`

### Teacher APIs

- `GET /api/teacher/classes`
- `POST /api/teacher/classes`
- `GET /api/teacher/classes/:classId`
- `GET /api/teacher/classes/:classId/insights`
- `PUT /api/teacher/classes/:classId`
- `POST /api/teacher/classes/:classId/generate-join-code`
- `POST /api/teacher/classes/:classId/activate`
- `POST /api/teacher/classes/:classId/archive`
- `POST /api/teacher/classes/:classId/restore`
- `POST /api/teacher/classes/:classId/duplicate`
- roster routes
- teaching-team routes
- `GET /api/teacher/classes/:classId/modules`
- `POST /api/teacher/classes/:classId/modules`
- `PUT /api/teacher/classes/:classId/modules/reorder`
- `PUT /api/teacher/classes/:classId/modules/:moduleId`
- `DELETE /api/teacher/classes/:classId/modules/:moduleId`
- `GET /api/teacher/classes/:classId/materials`
- `POST /api/teacher/classes/:classId/materials`
- `POST /api/teacher/classes/:classId/materials/upload`
- `PUT /api/teacher/classes/:classId/materials/reorder`
- `PUT /api/teacher/classes/:classId/materials/:materialId`
- `POST /api/teacher/classes/:classId/materials/:materialId/upload`
- `DELETE /api/teacher/classes/:classId/materials/:materialId/file`
- `DELETE /api/teacher/classes/:classId/materials/:materialId`
- `GET /api/teacher/classes/:classId/settings`
- `PUT /api/teacher/classes/:classId/settings`

## Acceptance Snapshot

The current class-management module is considered usable because:

- a teacher can create and activate a class
- a teacher can manage roster and collaborators
- a teacher can structure content with modules
- a teacher can manage links, notes, and uploaded materials under modules
- a teacher can configure class behavior in settings
- a teacher can review class-level summary insights from the overview page
- a teacher can post announcements
- a teacher can archive, restore, and duplicate a class

## Remaining Follow-Up Work

Highest-value next steps:

1. Run the manual browser validation checklist in `docs/teacher-class-management-qa-checklist.md` across `owner`, `co_teacher`, `teaching_assistant`, `viewer`, and `student`.
2. Expand class insights beyond overview summaries into deeper analytics if product value is clear.
3. Consider future material enhancements such as previews, bulk upload, or version history.
4. Consider whether announcement authoring should expand beyond `owner` and `co_teacher`.
