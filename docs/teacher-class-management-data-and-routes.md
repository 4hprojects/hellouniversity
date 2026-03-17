# Teacher Class Management Data and Route Note
Updated: 2026-03-17

## Purpose

This note captures the current implemented data and route shape for teacher class management, with emphasis on the live announcement system:

- current collection usage
- document shapes
- route contracts
- module ownership

## Current MongoDB Collections

### 1. `tblClasses`

Purpose:
Store main class metadata, ownership, status, roster, and teaching team.

Current shape direction:

```javascript
{
  _id: ObjectId,
  className: string,
  courseCode: string,
  subjectDescription: string,
  academicTerm: string,
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
  instructorId: ObjectId,
  instructorIDNumber: string,
  instructorName: string,
  instructorEmail: string,
  teachingTeam: [],
  students: string[],
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

Current shape:

```javascript
{
  _id: ObjectId,
  classId: ObjectId,
  authorUserId: string,
  authorName: string,
  authorRole: string,
  title: string,
  body: string,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `classId + createdAt`

### 3. `tblAnnouncementComments`

Purpose:
Store flat comments under announcements.

Current shape:

```javascript
{
  _id: ObjectId,
  classId: ObjectId,
  announcementId: ObjectId,
  authorUserId: string,
  authorName: string,
  authorRole: string,
  body: string,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `announcementId + createdAt`
- `classId + announcementId`

### 4. `tblAnnouncementReactions`

Purpose:
Store one-like-per-user announcement reactions.

Current shape:

```javascript
{
  _id: ObjectId,
  classId: ObjectId,
  announcementId: ObjectId,
  userId: string,
  reactionType: "like",
  createdAt: Date
}
```

Indexes:

- `announcementId + userId + reactionType`
- `classId + announcementId`

## Route Ownership

### `routes/teacherClassManagementApiRoutes.js`

Owns:

- `GET /api/teacher/classes`
- `POST /api/teacher/classes`
- `GET /api/teacher/classes/:classId`
- `PUT /api/teacher/classes/:classId`
- `POST /api/teacher/classes/:classId/archive`
- `POST /api/teacher/classes/:classId/restore`
- `POST /api/teacher/classes/:classId/duplicate`
- `POST /api/teacher/classes/:classId/generate-join-code`
- `GET /api/teacher/classes/:classId/students`
- `GET /api/teacher/classes/:classId/collaborators`
- `GET /api/teacher/classes/:classId/team`
- `POST /api/teacher/classes/:classId/team/preview`
- team membership mutations

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

- class title or class name
- course code
- academic term
- section

Validate:

- allowed status values
- join code uniqueness
- teacher ownership on updates

### Duplicate Class

Whitelist duplicated entities:

- class metadata
- modules
- materials
- settings

Do not duplicate:

- students
- grades
- quiz responses
- assignment submissions

## Ownership and Security Rules

### Teacher

- can manage only owned classes by default
- can manage roster and class content for owned classes
- class owner alone can create, edit, and delete announcements

### Collaborators

- can access only classes where explicitly assigned
- current announcement feed is read-only for collaborators

### Admin

- can inspect all classes
- can archive/restore any class
- can read class announcement feeds but cannot mutate them in v1

### Student

- can join active classes if self-enrollment is enabled
- can only view classes they are enrolled in
- can comment and like announcements only when enrolled and the class is not archived

## Feed Serialization Rules

The shared announcement feed returns:

```javascript
{
  classId: string,
  permissions: {
    canPostAnnouncement: boolean,
    canComment: boolean,
    canReact: boolean,
    isReadOnly: boolean
  },
  announcements: [
    {
      id: string,
      title: string,
      body: string,
      author: { name: string, role: string },
      createdAt: Date,
      updatedAt: Date,
      likeCount: number,
      viewerHasLiked: boolean,
      commentCount: number,
      canEdit: boolean,
      canDelete: boolean,
      comments: [
        {
          id: string,
          body: string,
          author: { name: string, role: string },
          createdAt: Date,
          canDelete: boolean
        }
      ]
    }
  ]
}
```

Ordering:

- announcements newest first
- comments oldest first

## Logging Proposal

For `tblLogs`, write class events such as:

```javascript
{
  timestamp: new Date(),
  action: "CLASS_CREATED",
  studentIDNumber: actor.studentIDNumber,
  name: actor.name,
  classId: cls._id,
  classTitle: cls.title,
  details: "Created class BSIT 3A for 1st Semester 2026"
}
```

Recommended event names:

- `CLASS_CREATED`
- `CLASS_UPDATED`
- `CLASS_ACTIVATED`
- `CLASS_ARCHIVED`
- `CLASS_RESTORED`
- `CLASS_DUPLICATED`
- `CLASS_JOIN_CODE_REGENERATED`
- `CLASS_STUDENT_ADDED`
- `CLASS_STUDENT_REMOVED`
- `CLASS_MODULE_CREATED`
- `CLASS_MATERIAL_ADDED`
- `CLASS_ANNOUNCEMENT_POSTED`
- `CLASS_ANNOUNCEMENT_COMMENTED`
- `CLASS_ANNOUNCEMENT_LIKED`

## Implemented Announcement Defaults

- plain text only
- no scheduling or pinning
- no attachments
- no threaded replies
- `like` is the only reaction type
- archived classes are read-only

Modules, materials, and richer collaborator policies can expand later without changing the current announcement route family.
