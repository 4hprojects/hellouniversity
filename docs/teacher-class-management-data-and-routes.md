# Teacher Class Management Data and Route Note
Updated: 2026-03-24

## Purpose

This note captures the current implemented data and route shape for teacher class management:

- current collection usage
- document shapes
- route contracts
- module ownership

## Current MongoDB Collections

### 1. `tblClasses`

Purpose:
Store main class metadata, ownership, status, roster, teaching team, modules, materials, and class settings.

Current shape direction:

```javascript
{
  _id: ObjectId,
  className: string,
  courseCode: string,
  subjectDescription: string,
  academicTerm: string,
  termSystem: "semester" | "trimester" | "quarter" | "",
  section: string,
  scheduleDayCodes: string[],
  scheduleDays: string,
  scheduleTimeFrom: string,
  scheduleTimeTo: string,
  scheduleTime: string,
  room: string,
  classCode: string,
  status: "draft" | "active" | "archived",
  selfEnrollmentEnabled: boolean,
  settings: {
    discussionEnabled: boolean,
    lateSubmissionPolicy: "allow" | "deny" | "penalize",
    gradeVisibility: "immediate" | "after_review" | "hidden"
  },
  instructorId: ObjectId,
  instructorIDNumber: string,
  instructorName: string,
  instructorEmail: string,
  teachingTeam: [],
  students: string[],
  modules: [
    {
      moduleId: string,
      title: string,
      description: string,
      order: number,
      hidden: boolean
    }
  ],
  materials: [
    {
      materialId: string,
      moduleId: string | null,
      title: string,
      description: string,
      type: "link" | "video" | "document" | "file" | "note",
      url: string | null,
      file: {
        storageKey: string,
        originalName: string,
        mimeType: string,
        sizeBytes: number,
        uploadedAt: Date,
        uploadedByUserId: ObjectId | string | null
      } | null,
      hidden: boolean,
      order: number
    }
  ],
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date | null,
  archivedAt: Date | null
}
```

Indexes:

- `instructorId + status + updatedAt`
- `classCode`
- `courseCode + section + academicTerm`

### 2. `tblClassAnnouncements`

Purpose:
Store teacher-owned announcement posts for a class.

### 3. `tblAnnouncementComments`

Purpose:
Store flat comments under announcements.

### 4. `tblAnnouncementReactions`

Purpose:
Store one-like-per-user announcement reactions.

## Route Ownership

### `routes/teacherClassManagementApiRoutes.js`

Owns:

- route composition only
- mounts the core, roster, team, and content route modules under the same `/api/teacher/classes` prefix

### `routes/teacherClassManagementCoreApiRoutes.js`

Owns:

- `GET /api/teacher/classes`
- `POST /api/teacher/classes`
- `GET /api/teacher/classes/:classId`
- `GET /api/teacher/classes/:classId/insights`
- `PUT /api/teacher/classes/:classId`
- `POST /api/teacher/classes/:classId/archive`
- `POST /api/teacher/classes/:classId/restore`
- `POST /api/teacher/classes/:classId/duplicate`
- `POST /api/teacher/classes/:classId/generate-join-code`
- `POST /api/teacher/classes/:classId/activate`

### `routes/teacherClassManagementRosterApiRoutes.js`

Owns:

- `GET /api/teacher/classes/:classId/students`
- `POST /api/teacher/classes/:classId/students/preview`
- `POST /api/teacher/classes/:classId/students`
- `DELETE /api/teacher/classes/:classId/students/:studentIDNumber`

### `routes/teacherClassManagementTeamApiRoutes.js`

Owns:

- `GET /api/teacher/classes/:classId/team`
- `POST /api/teacher/classes/:classId/team/preview`
- `POST /api/teacher/classes/:classId/team`
- `PATCH /api/teacher/classes/:classId/team/:memberUserId`
- `DELETE /api/teacher/classes/:classId/team/:memberUserId`

### `routes/teacherClassManagementContentApiRoutes.js`

Owns:

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

### `routes/teacherClassManagementShared.js`

Owns:

- shared dependency access
- class access loading and role resolution
- class summary serialization
- class payload normalization
- teaching-team normalization and serialization
- capability flag generation
- audit-log writes
- dependency access for class insight reads

### `utils/classInsights.js`

Owns:

- overview KPI summary building
- assignment/open-due-overdue counts
- engagement summary from attempts
- recent activity feed assembly from announcements, materials, submissions, and logs
- follow-up link generation for the overview page

### `routes/classAnnouncementsRoutes.js`

Owns the shared class communication feed:

- `GET /api/classes/:classId/announcements`
- `POST /api/classes/:classId/announcements`
- `PUT /api/classes/:classId/announcements/:announcementId`
- `DELETE /api/classes/:classId/announcements/:announcementId`
- `POST /api/classes/:classId/announcements/:announcementId/comments`
- `DELETE /api/classes/:classId/announcements/:announcementId/comments/:commentId`
- `POST /api/classes/:classId/announcements/:announcementId/reactions/like`

## Validation Rules

### Class Create/Update

Require:

- class name
- course code

Validate:

- allowed status values
- join code uniqueness
- teacher ownership on updates

### Modules

Validate:

- title required
- title max length
- reorder requires complete ordered ID list
- persisted order is normalized sequentially

### Materials

Validate:

- title required
- title max length
- type limited to current supported values
- URL must be `http://` or `https://` when provided for URL-backed types
- referenced module must exist
- reorder requires complete ordered ID list
- uploads only allowed for `document` and `file`
- uploaded files are limited to supported MIME types and 10 MB max size

Current material rule:

- `document` and `file` can carry uploaded file metadata stored in object storage
- legacy URL-based `document` and `file` materials remain readable

## Ownership and Security Rules

### Teacher / Owner

- can manage owned classes
- can manage roster, modules, materials, settings, and lifecycle
- owner alone manages teaching-team membership and roles
- owner can post, edit, and delete announcements
- owner can view class insights

### Collaborators

- can access classes where assigned
- `co_teacher` can manage roster, modules, materials, settings, and class announcements
- `co_teacher` cannot manage lifecycle, join-code regeneration, duplicate, activate, or teaching-team membership/roles
- `teaching_assistant` can manage modules and materials only
- `teaching_assistant` is read-only for roster, settings, lifecycle, and announcements
- `viewer` is read-only across class-management surfaces
- all assigned collaborator roles can view class insights

### Admin

- can inspect all classes
- can archive / restore
- can read class announcement feeds but does not act as class owner in class announcement flows

### Student

- can join active classes if self-enrollment is enabled
- can access only enrolled classes
- can comment and like announcements only when enrolled and class is not archived

## Logging

Current class-management logs include actions such as:

- `CLASS_CREATED`
- `CLASS_UPDATED`
- `CLASS_ACTIVATED`
- `CLASS_ARCHIVED`
- `CLASS_RESTORED`
- `CLASS_DUPLICATED`
- `CLASS_JOIN_CODE_REGENERATED`
- `CLASS_STUDENTS_ADDED`
- `CLASS_STUDENT_REMOVED`
- `CLASS_TEAM_MEMBER_ADDED`
- `CLASS_MODULE_ADDED`
- `CLASS_MODULE_UPDATED`
- `CLASS_MODULE_DELETED`
- `CLASS_MODULES_REORDERED`
- `CLASS_MATERIAL_ADDED`
- `CLASS_MATERIAL_UPDATED`
- `CLASS_MATERIAL_DELETED`
- `CLASS_MATERIALS_REORDERED`
- `CLASS_SETTINGS_UPDATED`

Announcement permissions now follow the implemented policy:

- `owner` can create, edit, and delete announcements
- `co_teacher` can create announcements and edit/delete only announcements they authored
- `teaching_assistant` and `viewer` are read-only in teacher announcement management
- enrolled students can still comment and like in active classes

## Current Defaults and Limits

- announcements are plain text only
- no announcement pinning or scheduling
- no announcement attachments
- no threaded replies
- `like` is the only reaction type
- archived classes are read-only for announcement participation
- one uploaded file per material in this version
- uploaded material binaries are stored outside Mongo and exposed through signed URLs at read time
- class APIs may return current role and capability flags so teacher pages can hide or disable unauthorized actions
- class insights are read-time summaries, not precomputed analytics snapshots
