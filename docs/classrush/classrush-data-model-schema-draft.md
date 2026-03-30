
# ClassRush Data Model Schema Draft
## For Hellouniversity
### Version 1.0 Draft

## 1. Purpose

This document turns the ClassRush product requirements into a build-ready schema draft for:

- **MongoDB**
- **Supabase / PostgreSQL**

The goal is to use each database for what it does best.

- **MongoDB** will store flexible and nested authoring content
- **Supabase / PostgreSQL** will store structured academic, session, response, and reporting data

This split keeps the quiz builder flexible while preserving strong relational integrity for live sessions, course linkage, and analytics.

---

## 2. Recommended Database Responsibility Split

## MongoDB should handle

- activity drafts
- published activity content
- question blocks
- slide blocks
- reusable question bank items
- media metadata
- activity versioning
- template data
- optional AI-generated draft content later

## Supabase / PostgreSQL should handle

- live sessions
- self-paced assignments
- participant joins
- verified student linkage
- responses
- scores
- leaderboard snapshots if needed
- reporting aggregates
- gradebook mapping
- workspace sharing and permissions if you want stronger relational control

---

## 3. High-Level Design Decision

### Why not keep everything in MongoDB?

You can, but it becomes harder to enforce:

- course relationships
- enrolment integrity
- session analytics
- grading linkage
- reporting joins across students, classes, terms, and courses

### Why not keep everything in PostgreSQL?

You can, but activity authoring becomes more complex because:

- question blocks are highly nested
- block types vary
- future features like media, AI drafts, and mixed content sequences are easier to model in documents

### Recommended approach

Use a **hybrid model**:

- **MongoDB** = content authoring layer
- **Supabase/Postgres** = delivery, participation, reporting, academic linkage layer

---

## 4. MongoDB Schema Draft

## 4.1 Collection: `classrush_activities`

Stores the core authored activity.

One document represents one quiz or interactive activity.

### Suggested document structure

```json
{
  "_id": "ObjectId",
  "activityUUID": "act_01HXYZ...",
  "title": "Introduction to Data Structures Review",
  "description": "Live review for prelim exam",
  "ownerId": "mongo_user_id_or_system_user_id",
  "courseId": "course_123",
  "classId": "class_456",
  "termId": "term_2026_prelim",
  "workspaceType": "course",
  "workspaceId": "workspace_course_001",
  "status": "draft",
  "visibility": "private",
  "deliveryModes": ["live", "assignment"],
  "supportedModes": ["classic", "accuracy", "team", "lecture"],
  "defaultScoringProfile": "class",
  "tags": ["data structures", "prelim", "review"],
  "topicLabels": ["arrays", "linked lists", "stacks"],
  "difficulty": "intermediate",
  "estimatedDurationMinutes": 15,
  "coverImage": {
    "url": "https://cdn.example.com/classrush/cover1.png",
    "alt": "Data Structures Review Cover"
  },
  "settings": {
    "randomizeQuestions": false,
    "randomizeAnswers": true,
    "showLeaderboard": true,
    "showExplanations": true,
    "allowNicknameMode": true,
    "allowVerifiedMode": true,
    "allowLateJoin": true
  },
  "blocks": [
    {
      "blockId": "blk_001",
      "type": "slide",
      "order": 1,
      "title": "Warm-up",
      "content": {
        "text": "Let's review arrays first.",
        "media": []
      }
    },
    {
      "blockId": "blk_002",
      "type": "multiple_choice",
      "order": 2,
      "title": "What is the time complexity of accessing an array element by index?",
      "content": {
        "questionText": "What is the time complexity of accessing an array element by index?",
        "choices": [
          { "choiceId": "a", "label": "O(1)", "isCorrect": true },
          { "choiceId": "b", "label": "O(n)", "isCorrect": false },
          { "choiceId": "c", "label": "O(log n)", "isCorrect": false },
          { "choiceId": "d", "label": "O(n log n)", "isCorrect": false }
        ],
        "explanation": "Array indexing is direct.",
        "media": []
      },
      "settings": {
        "timeLimitSeconds": 20,
        "pointsMode": "standard",
        "allowMultipleAnswers": false
      },
      "metadata": {
        "topic": "arrays",
        "difficulty": "basic"
      }
    }
  ],
  "version": 3,
  "publishedVersion": 2,
  "isTemplate": false,
  "sourceActivityId": null,
  "archived": false,
  "createdAt": "2026-03-30T00:00:00.000Z",
  "updatedAt": "2026-03-30T00:00:00.000Z",
  "publishedAt": null
}
```

### Field notes

- `activityUUID` should be stable across systems
- `_id` remains MongoDB native
- `blocks` is embedded because order and nesting matter
- `version` supports future rollback or draft history
- `publishedVersion` helps track which content version was used in a live session
- `workspaceType` supports private, course, department, and institution libraries

### Recommended indexes

- `activityUUID` unique
- `ownerId`
- `courseId`
- `classId`
- `workspaceType + workspaceId`
- `status`
- `tags`
- `updatedAt`

---

## 4.2 Collection: `classrush_activity_versions`

Stores snapshots of activity content whenever a major publish happens.

This is optional but strongly recommended.

### Suggested structure

```json
{
  "_id": "ObjectId",
  "activityUUID": "act_01HXYZ...",
  "version": 2,
  "snapshot": {
    "title": "Introduction to Data Structures Review",
    "blocks": []
  },
  "changeSummary": "Added 5 new multiple choice questions",
  "publishedBy": "user_001",
  "publishedAt": "2026-03-30T00:00:00.000Z"
}
```

### Why keep this?

Because once a session uses version 2, your report should still match that exact version even if the teacher edits the activity later.

---

## 4.3 Collection: `classrush_question_bank`

Stores reusable questions outside a single activity.

### Suggested structure

```json
{
  "_id": "ObjectId",
  "questionBankUUID": "qbk_001",
  "ownerId": "user_001",
  "workspaceType": "department",
  "workspaceId": "dept_it",
  "visibility": "shared",
  "questionType": "multiple_choice",
  "title": "Binary search prerequisite",
  "content": {
    "questionText": "What prerequisite must be true before using binary search?",
    "choices": [
      { "choiceId": "a", "label": "The data must be sorted", "isCorrect": true },
      { "choiceId": "b", "label": "The array must be linked", "isCorrect": false },
      { "choiceId": "c", "label": "The data must be encrypted", "isCorrect": false },
      { "choiceId": "d", "label": "The algorithm must be recursive", "isCorrect": false }
    ],
    "explanation": "Binary search assumes sorted data."
  },
  "metadata": {
    "subject": "DSALGO1",
    "courseCode": "DSALGO1",
    "topic": "searching",
    "difficulty": "basic",
    "language": "en"
  },
  "usageStats": {
    "timesUsed": 15,
    "lastUsedAt": "2026-03-30T00:00:00.000Z"
  },
  "createdAt": "2026-03-30T00:00:00.000Z",
  "updatedAt": "2026-03-30T00:00:00.000Z"
}
```

### Recommended indexes

- `questionBankUUID` unique
- `ownerId`
- `workspaceType + workspaceId`
- `metadata.courseCode`
- `metadata.topic`
- `metadata.difficulty`
- text index on `title` and `content.questionText`

---

## 4.4 Collection: `classrush_media_assets`

Stores metadata only.

Actual files should live in object storage such as Cloudflare R2.

### Suggested structure

```json
{
  "_id": "ObjectId",
  "assetUUID": "asset_001",
  "ownerId": "user_001",
  "storageProvider": "cloudflare_r2",
  "bucket": "hellouniversity",
  "path": "classrush/images/2026/03/example.png",
  "publicUrl": "https://cdn.hellouniversity.online/classrush/example.png",
  "mimeType": "image/png",
  "sizeBytes": 245122,
  "width": 1280,
  "height": 720,
  "altText": "Binary tree diagram",
  "createdAt": "2026-03-30T00:00:00.000Z"
}
```

---

## 4.5 Collection: `classrush_templates`

Optional collection if you want curated activity templates separate from normal authored activities.

You can also store templates in `classrush_activities` using `isTemplate = true`.

---

## 5. Supabase / PostgreSQL Schema Draft

## 5.1 Suggested PostgreSQL schema name

```sql
create schema if not exists classrush;
```

---

## 5.2 Table: `classrush.sessions`

Stores each live or assigned session instance.

```sql
create table classrush.sessions (
    session_id uuid primary key default gen_random_uuid(),
    activity_uuid varchar(50) not null,
    activity_version integer not null,
    host_user_id varchar(50) not null,
    course_id varchar(50),
    class_id varchar(50),
    term_id varchar(50),
    delivery_mode varchar(20) not null check (delivery_mode in ('live', 'assignment')),
    game_mode varchar(20) not null check (game_mode in ('classic', 'accuracy', 'team', 'lecture')),
    scoring_profile varchar(20) not null check (scoring_profile in ('fun', 'class', 'graded')),
    title_snapshot text not null,
    join_pin varchar(12),
    join_code_slug varchar(50),
    requires_verified_identity boolean default false,
    allow_nickname_mode boolean default true,
    allow_late_join boolean default true,
    randomize_questions boolean default false,
    randomize_answers boolean default true,
    show_leaderboard boolean default true,
    is_locked boolean default false,
    status varchar(20) not null default 'scheduled' check (status in ('scheduled', 'live', 'paused', 'ended', 'archived')),
    starts_at timestamptz,
    ends_at timestamptz,
    deadline_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
```

### Notes

- `activity_uuid` links back to MongoDB activity
- `activity_version` preserves which version was used
- `title_snapshot` protects report readability even if the activity title changes later

### Suggested indexes

```sql
create index idx_sessions_activity_uuid on classrush.sessions(activity_uuid);
create index idx_sessions_host_user_id on classrush.sessions(host_user_id);
create index idx_sessions_course_id on classrush.sessions(course_id);
create index idx_sessions_class_id on classrush.sessions(class_id);
create index idx_sessions_status on classrush.sessions(status);
create index idx_sessions_starts_at on classrush.sessions(starts_at);
create unique index idx_sessions_join_pin_unique on classrush.sessions(join_pin) where join_pin is not null;
```

---

## 5.3 Table: `classrush.session_participants`

Stores join records for each participant.

```sql
create table classrush.session_participants (
    participant_id uuid primary key default gen_random_uuid(),
    session_id uuid not null references classrush.sessions(session_id) on delete cascade,
    user_id varchar(50),
    enrolment_id varchar(50),
    nickname varchar(80),
    team_id uuid,
    identity_mode varchar(20) not null check (identity_mode in ('nickname', 'verified')),
    join_status varchar(20) not null default 'joined' check (join_status in ('joined', 'removed', 'disconnected', 'completed')),
    joined_at timestamptz not null default now(),
    last_seen_at timestamptz,
    finished_at timestamptz,
    final_score numeric(10,2) default 0,
    correct_count integer default 0,
    incorrect_count integer default 0,
    unanswered_count integer default 0,
    average_response_ms integer,
    final_rank integer,
    is_flagged boolean default false
);
```

### Notes

- `user_id` can be null for nickname-only mode
- `enrolment_id` helps tie results to a specific class enrolment
- this table is session-specific, not user-specific across all time

### Suggested indexes

```sql
create index idx_participants_session_id on classrush.session_participants(session_id);
create index idx_participants_user_id on classrush.session_participants(user_id);
create index idx_participants_enrolment_id on classrush.session_participants(enrolment_id);
create unique index idx_participants_unique_verified
on classrush.session_participants(session_id, user_id)
where user_id is not null;
```

---

## 5.4 Table: `classrush.teams`

Needed for team mode.

```sql
create table classrush.teams (
    team_id uuid primary key default gen_random_uuid(),
    session_id uuid not null references classrush.sessions(session_id) on delete cascade,
    team_name varchar(100) not null,
    team_color varchar(30),
    created_at timestamptz not null default now()
);
```

### Add foreign key afterward

```sql
alter table classrush.session_participants
add constraint fk_session_participants_team
foreign key (team_id) references classrush.teams(team_id) on delete set null;
```

---

## 5.5 Table: `classrush.responses`

Stores one answer attempt per participant per block.

```sql
create table classrush.responses (
    response_id uuid primary key default gen_random_uuid(),
    session_id uuid not null references classrush.sessions(session_id) on delete cascade,
    participant_id uuid not null references classrush.session_participants(participant_id) on delete cascade,
    activity_uuid varchar(50) not null,
    activity_version integer not null,
    block_id varchar(50) not null,
    block_type varchar(40) not null,
    answer_payload jsonb,
    is_correct boolean,
    score_awarded numeric(10,2) default 0,
    response_time_ms integer,
    submitted_at timestamptz not null default now(),
    was_auto_submitted boolean default false
);
```

### Suggested indexes

```sql
create index idx_responses_session_id on classrush.responses(session_id);
create index idx_responses_participant_id on classrush.responses(participant_id);
create index idx_responses_block_id on classrush.responses(block_id);
create unique index idx_responses_unique_block_submission
on classrush.responses(session_id, participant_id, block_id);
```

---

## 5.6 Table: `classrush.session_blocks`

Stores the block order used in a session.

This is important because block order may be randomized or changed between versions.

```sql
create table classrush.session_blocks (
    session_block_id uuid primary key default gen_random_uuid(),
    session_id uuid not null references classrush.sessions(session_id) on delete cascade,
    block_id varchar(50) not null,
    block_order integer not null,
    block_type varchar(40) not null,
    title_snapshot text,
    settings_snapshot jsonb,
    content_snapshot jsonb not null
);
```

### Why store snapshots?

Because reports must reflect exactly what students saw in that session.

---

## 5.7 Table: `classrush.assignments`

Stores assignment publishing rules if a self-paced activity is pushed to a course.

```sql
create table classrush.assignments (
    assignment_id uuid primary key default gen_random_uuid(),
    session_id uuid not null unique references classrush.sessions(session_id) on delete cascade,
    course_id varchar(50),
    class_id varchar(50),
    visible_from timestamptz,
    deadline_at timestamptz,
    attempts_allowed integer default 1,
    is_graded boolean default false,
    release_results_immediately boolean default true,
    created_at timestamptz not null default now()
);
```

---

## 5.8 Table: `classrush.gradebook_mappings`

Maps a ClassRush session to a gradebook item if used academically.

```sql
create table classrush.gradebook_mappings (
    mapping_id uuid primary key default gen_random_uuid(),
    session_id uuid not null unique references classrush.sessions(session_id) on delete cascade,
    gradebook_item_id varchar(50) not null,
    score_type varchar(20) not null check (score_type in ('raw_score', 'percentage', 'completion', 'custom')),
    max_points numeric(10,2),
    passing_score numeric(10,2),
    release_status varchar(20) not null default 'draft' check (release_status in ('draft', 'released', 'hidden')),
    created_by varchar(50) not null,
    created_at timestamptz not null default now()
);
```

---

## 5.9 Table: `classrush.student_progress`

Optional denormalized reporting table.

This can be built later from sessions and responses, but having a prepared table makes dashboards faster.

```sql
create table classrush.student_progress (
    progress_id uuid primary key default gen_random_uuid(),
    user_id varchar(50) not null,
    course_id varchar(50),
    class_id varchar(50),
    topic_label varchar(100),
    sessions_played integer default 0,
    average_score numeric(10,2) default 0,
    average_accuracy numeric(5,2) default 0,
    average_response_ms integer,
    last_session_at timestamptz,
    updated_at timestamptz not null default now()
);
```

---

## 5.10 Table: `classrush.activity_shares`

Use this if you want relational control over sharing instead of storing it only inside MongoDB.

```sql
create table classrush.activity_shares (
    share_id uuid primary key default gen_random_uuid(),
    activity_uuid varchar(50) not null,
    shared_with_type varchar(20) not null check (shared_with_type in ('user', 'course', 'department', 'institution')),
    shared_with_id varchar(50) not null,
    permission_level varchar(20) not null check (permission_level in ('view', 'edit', 'host', 'admin')),
    shared_by varchar(50) not null,
    created_at timestamptz not null default now()
);
```

---

## 6. Recommended Relationship Map

## MongoDB side

- `classrush_activities`
- `classrush_activity_versions`
- `classrush_question_bank`
- `classrush_media_assets`

## PostgreSQL side

- `sessions` -> references an `activity_uuid`
- `session_blocks` -> stores the exact content snapshot used
- `session_participants` -> stores who joined
- `responses` -> stores what each participant answered
- `assignments` -> stores assignment rules
- `gradebook_mappings` -> stores grading linkage
- `student_progress` -> stores reporting aggregates

---

## 7. Recommended Build Strategy

## Phase 1: Minimum build-ready schema

### MongoDB

- `classrush_activities`
- `classrush_question_bank`

### PostgreSQL

- `sessions`
- `session_blocks`
- `session_participants`
- `responses`
- `assignments`

This is enough for:

- activity authoring
- live play
- self-paced assignment
- report generation
- basic LMS linkage

## Phase 2

Add:

- `classrush_activity_versions`
- `gradebook_mappings`
- `activity_shares`
- `student_progress`
- `teams`

## Phase 3

Add:

- AI draft logs
- mastery matrices
- organization-wide analytics tables
- recommendation engine support

---

## 8. Recommended Field Standards

Use consistent patterns across both databases.

### IDs

- MongoDB internal `_id`
- External stable IDs like:
  - `activityUUID`
  - `questionBankUUID`
  - `assetUUID`

### Timestamps

Always include:

- `createdAt` / `created_at`
- `updatedAt` / `updated_at`

### Status enums

Keep enums controlled and documented.

Example statuses:

- draft
- published
- archived
- scheduled
- live
- paused
- ended

### Soft delete

Prefer soft delete for authored content.

Suggested flags:

- `archived`
- `deletedAt`
- `deletedBy`

---

## 9. Data Integrity Rules

## MongoDB integrity rules

- Each block inside an activity must have a unique `blockId`
- `order` values must be sequential when saved
- Published activities should not be overwritten without version tracking
- Media references should point only to valid stored assets

## PostgreSQL integrity rules

- One verified user should only have one active participant record per session
- One participant should only submit one final response per block unless retries are allowed
- A session must reference a valid `activity_uuid`
- Session blocks should always match the referenced activity version snapshot

---

## 10. Recommended Indexing Summary

## MongoDB

### `classrush_activities`

- `activityUUID` unique
- `ownerId`
- `courseId`
- `classId`
- `status`
- `workspaceType + workspaceId`
- `updatedAt`

### `classrush_question_bank`

- `questionBankUUID` unique
- text index on title and question text
- `metadata.courseCode`
- `metadata.topic`
- `workspaceType + workspaceId`

## PostgreSQL

### `sessions`

- `activity_uuid`
- `host_user_id`
- `course_id`
- `class_id`
- `status`
- `starts_at`
- unique partial index on `join_pin`

### `session_participants`

- `session_id`
- `user_id`
- `enrolment_id`
- unique partial index on `(session_id, user_id)` for verified players

### `responses`

- `session_id`
- `participant_id`
- `block_id`
- unique composite index on `(session_id, participant_id, block_id)`

---

## 11. Security and Privacy Notes

Because ClassRush is academic, pay attention to:

- verified vs nickname mode separation
- role-based report access
- class-scoped data visibility
- audit trails for graded sessions
- storage of only necessary student data
- secure signed URLs if you use restricted media
- row-level security in Supabase for student and teacher visibility rules

---

## 12. Suggested Supabase RLS Direction

At a high level:

- students should only read their own responses and allowed results
- teachers should only read sessions for their classes or shared activities
- admins can read broader institutional analytics
- insert permissions for responses should be limited to active session participants

This should be designed once your exact auth model is finalized.

---

## 13. Suggested Next Technical Step

After approving this schema draft, the next best move is to produce:

1. **Mongoose schema files**
2. **Supabase SQL migration scripts**
3. **ERD / relationship diagram**
4. **API contract draft**
   - activity routes
   - session routes
   - join routes
   - response routes
   - report routes

---

## 14. Final Recommendation

For ClassRush inside Hellouniversity, the strongest structure is:

- **MongoDB for authored activity content**
- **Supabase/Postgres for delivery and analytics**

That gives you:

- flexible quiz authoring
- reliable academic reporting
- easier LMS integration
- better long-term scalability for live and graded use

If you continue from here, the cleanest next artifact is a **MongoDB + Supabase implementation pack** with:
- Mongoose models
- SQL `create table` scripts
- API endpoint draft
- ERD notes
