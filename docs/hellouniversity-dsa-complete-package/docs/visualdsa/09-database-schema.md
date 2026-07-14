---
status: active
last_updated: 2026-07-11
phase: 3
database: Supabase PostgreSQL
---

# VisualDSA Database Schema

## Decision

Use Supabase PostgreSQL as the primary database for new VisualDSA learning records.

HelloUniversity currently uses both Supabase and MongoDB. VisualDSA should not split one assessment attempt across both databases.

Use PostgreSQL for:

- Module definitions
- Practice sessions
- Assessment assignments
- Assessment attempts
- Student actions
- Interaction events
- Misconception results
- Topic mastery
- Instructor analytics aggregates

Existing HelloUniversity identity, class, and enrollment records should be referenced rather than duplicated when stable identifiers already exist.

## Design principles

1. Use UUID primary keys.
2. Store timestamps in UTC using `timestamptz`.
3. Keep raw events append-only.
4. Keep problem seed and module version with every attempt.
5. Use JSONB only for variable module payloads.
6. Use relational columns for fields used in filtering and authorization.
7. Keep official scores server-controlled.
8. Add unique constraints for idempotency.
9. Use soft invalidation rather than deleting graded attempts.
10. Add indexes based on real dashboard queries.

## External identifiers

Before migration implementation, confirm the current identifiers for:

```text
user/profile
student
instructor
class
course
class membership
```

The schema below uses UUID placeholders:

```text
student_id uuid
instructor_id uuid
class_id uuid
course_id uuid
```

Do not create duplicate profile or class tables if equivalent authoritative tables already exist.

## Entity relationship overview

```text
visualdsa_modules
    └── visualdsa_problem_templates
            └── visualdsa_problem_instances

visualdsa_assessment_assignments
    └── visualdsa_assessment_attempts
            ├── visualdsa_attempt_actions
            ├── visualdsa_interaction_events
            ├── visualdsa_detected_misconceptions
            └── visualdsa_attempt_summaries

visualdsa_practice_sessions
    ├── visualdsa_attempt_actions
    └── visualdsa_interaction_events

visualdsa_topic_mastery
visualdsa_student_recommendations
visualdsa_class_aggregates
```

## Enum strategy

Prefer PostgreSQL check constraints or lookup tables over database enums when frequent evolution is expected.

Suggested allowed values:

```text
mode:
guided
exploration
practice
assessment
instructor

attempt_status:
created
started
in_progress
paused
submitted
graded
expired
abandoned
invalidated

score_policy:
best
latest
average
first

feedback_mode:
immediate
after_step
after_submission
after_deadline
none
```

## Table: `visualdsa_modules`

Purpose:

Stores versioned module definitions available to the platform.

```sql
create table visualdsa_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  version text not null,
  title text not null,
  lesson_slug text not null,
  route_slug text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pilot', 'active', 'retired')),
  supported_modes jsonb not null default '[]'::jsonb,
  analytics_definition jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, version),
  unique (route_slug, version)
);
```

Recommended module keys:

```text
arrays
stacks
queues
binary-search
sorting
bst
```

## Table: `visualdsa_problem_templates`

Purpose:

Defines reusable task families.

```sql
create table visualdsa_problem_templates (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references visualdsa_modules(id),
  template_key text not null,
  version integer not null default 1,
  title text not null,
  difficulty text not null
    check (difficulty in ('introductory', 'intermediate', 'advanced')),
  task_type text not null,
  generator_key text not null,
  scoring_policy_key text not null,
  configuration jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, template_key, version)
);
```

## Table: `visualdsa_problem_instances`

Purpose:

Stores generated problem instances when persistence is needed for assessment reproducibility.

```sql
create table visualdsa_problem_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references visualdsa_problem_templates(id),
  seed text not null,
  module_version text not null,
  input_payload jsonb not null,
  validation_payload jsonb,
  expected_steps_hash text,
  created_at timestamptz not null default now(),
  unique (template_id, seed, module_version)
);
```

`validation_payload` must never be returned to the student client.

## Table: `visualdsa_practice_sessions`

```sql
create table visualdsa_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid,
  course_id uuid,
  lesson_slug text not null,
  module_id uuid not null references visualdsa_modules(id),
  problem_instance_id uuid references visualdsa_problem_instances(id),
  status text not null default 'started'
    check (status in ('started', 'in_progress', 'paused', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  active_duration_ms bigint not null default 0,
  first_attempt_accuracy numeric(5,2),
  final_accuracy numeric(5,2),
  hints_used integer not null default 0,
  retries integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Table: `visualdsa_assessment_assignments`

```sql
create table visualdsa_assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  course_id uuid,
  instructor_id uuid not null,
  module_id uuid not null references visualdsa_modules(id),
  title text not null,
  instructions text,
  available_from timestamptz,
  available_until timestamptz,
  attempt_limit integer not null default 1 check (attempt_limit > 0),
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes > 0),
  passing_score numeric(5,2) not null default 75
    check (passing_score >= 0 and passing_score <= 100),
  feedback_mode text not null default 'after_submission'
    check (feedback_mode in ('immediate', 'after_step', 'after_submission', 'after_deadline', 'none')),
  hint_policy jsonb not null default '{"enabled":false}'::jsonb,
  score_policy text not null default 'best'
    check (score_policy in ('best', 'latest', 'average', 'first')),
  template_selection jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Table: `visualdsa_assessment_attempts`

```sql
create table visualdsa_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references visualdsa_assessment_assignments(id),
  student_id uuid not null,
  problem_instance_id uuid not null references visualdsa_problem_instances(id),
  module_id uuid not null references visualdsa_modules(id),
  module_version text not null,
  attempt_number integer not null,
  status text not null default 'created'
    check (status in (
      'created',
      'started',
      'in_progress',
      'paused',
      'submitted',
      'graded',
      'expired',
      'abandoned',
      'invalidated'
    )),
  started_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz,
  expires_at timestamptz,
  active_duration_ms bigint not null default 0,
  raw_score numeric(8,2),
  maximum_score numeric(8,2),
  percentage_score numeric(5,2)
    check (percentage_score is null or (percentage_score >= 0 and percentage_score <= 100)),
  first_attempt_accuracy numeric(5,2),
  hints_used integer not null default 0,
  retries integer not null default 0,
  scoring_version text not null,
  invalidated_at timestamptz,
  invalidated_by uuid,
  invalidation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id, attempt_number)
);
```

## Table: `visualdsa_attempt_actions`

Purpose:

Stores canonical student responses used for scoring.

```sql
create table visualdsa_attempt_actions (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null,
  student_id uuid not null,
  practice_session_id uuid references visualdsa_practice_sessions(id),
  assessment_attempt_id uuid references visualdsa_assessment_attempts(id),
  step_number integer not null,
  action_type text not null,
  submitted_payload jsonb not null,
  is_correct boolean,
  attempt_number integer not null default 1,
  hint_level integer not null default 0,
  response_time_ms bigint,
  misconception_code text,
  validation_version text not null,
  created_at timestamptz not null default now(),
  check (
    (practice_session_id is not null and assessment_attempt_id is null)
    or
    (practice_session_id is null and assessment_attempt_id is not null)
  ),
  unique (client_event_id)
);
```

## Table: `visualdsa_interaction_events`

```sql
create table visualdsa_interaction_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  schema_version integer not null default 1,
  student_id uuid not null,
  class_id uuid,
  course_id uuid,
  lesson_slug text not null,
  module_key text not null,
  module_version text not null,
  mode text not null
    check (mode in ('guided', 'exploration', 'practice', 'assessment', 'instructor')),
  practice_session_id uuid references visualdsa_practice_sessions(id),
  assessment_attempt_id uuid references visualdsa_assessment_attempts(id),
  problem_template_key text,
  problem_seed text,
  event_type text not null,
  step_number integer,
  action_type text,
  submitted_value jsonb,
  is_correct boolean,
  response_number integer,
  hint_level integer,
  response_time_ms bigint,
  misconception_code text,
  metadata jsonb not null default '{}'::jsonb,
  client_timestamp timestamptz,
  server_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

## Table: `visualdsa_misconception_definitions`

```sql
create table visualdsa_misconception_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  module_key text not null,
  version integer not null default 1,
  title text not null,
  description text not null,
  related_lesson_slug text,
  recommended_intervention text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, version)
);
```

## Table: `visualdsa_detected_misconceptions`

```sql
create table visualdsa_detected_misconceptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  assessment_attempt_id uuid references visualdsa_assessment_attempts(id),
  practice_session_id uuid references visualdsa_practice_sessions(id),
  action_id uuid references visualdsa_attempt_actions(id),
  misconception_code text not null,
  classifier_version integer not null,
  confidence numeric(4,3),
  detected_at timestamptz not null default now()
);
```

## Table: `visualdsa_attempt_summaries`

```sql
create table visualdsa_attempt_summaries (
  id uuid primary key default gen_random_uuid(),
  assessment_attempt_id uuid not null unique references visualdsa_assessment_attempts(id),
  student_id uuid not null,
  module_key text not null,
  total_scored_steps integer not null default 0,
  correct_first_responses integer not null default 0,
  correct_final_responses integer not null default 0,
  hints_used integer not null default 0,
  retries integer not null default 0,
  first_attempt_accuracy numeric(5,2),
  final_accuracy numeric(5,2),
  percentage_score numeric(5,2),
  active_duration_ms bigint not null default 0,
  misconception_counts jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  calculation_version text not null
);
```

## Table: `visualdsa_topic_mastery`

```sql
create table visualdsa_topic_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid,
  course_id uuid,
  module_key text not null,
  mastery_score numeric(5,2)
    check (mastery_score >= 0 and mastery_score <= 100),
  mastery_status text not null
    check (mastery_status in (
      'insufficient_evidence',
      'needs_review',
      'developing',
      'proficient',
      'mastered'
    )),
  assessment_component numeric(5,2),
  practice_component numeric(5,2),
  completion_component numeric(5,2),
  evidence_count integer not null default 0,
  calculation_version text not null,
  last_evidence_at timestamptz,
  calculated_at timestamptz not null default now(),
  unique (student_id, class_id, module_key)
);
```

## Table: `visualdsa_student_recommendations`

```sql
create table visualdsa_student_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid,
  module_key text not null,
  recommendation_type text not null,
  message text not null,
  reason_code text not null,
  priority text not null
    check (priority in ('low', 'medium', 'high')),
  related_lesson_slug text,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  dismissed_at timestamptz,
  completed_at timestamptz
);
```

## Table: `visualdsa_class_aggregates`

```sql
create table visualdsa_class_aggregates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  module_key text not null,
  enrolled_students integer not null default 0,
  started_students integer not null default 0,
  completed_students integer not null default 0,
  average_mastery numeric(5,2),
  median_mastery numeric(5,2),
  average_first_attempt_accuracy numeric(5,2),
  common_misconceptions jsonb not null default '[]'::jsonb,
  intervention_count integer not null default 0,
  calculation_version text not null,
  calculated_at timestamptz not null default now(),
  unique (class_id, module_key)
);
```

## Recommended indexes

```sql
create index idx_vd_practice_student_module
  on visualdsa_practice_sessions(student_id, module_id, started_at desc);

create index idx_vd_attempt_student_assignment
  on visualdsa_assessment_attempts(student_id, assignment_id, attempt_number);

create index idx_vd_attempt_status
  on visualdsa_assessment_attempts(status, expires_at);

create index idx_vd_actions_attempt_step
  on visualdsa_attempt_actions(assessment_attempt_id, step_number, created_at);

create index idx_vd_events_attempt_time
  on visualdsa_interaction_events(assessment_attempt_id, server_timestamp);

create index idx_vd_events_student_module
  on visualdsa_interaction_events(student_id, module_key, server_timestamp desc);

create index idx_vd_events_misconception
  on visualdsa_interaction_events(misconception_code)
  where misconception_code is not null;

create index idx_vd_mastery_class_module
  on visualdsa_topic_mastery(class_id, module_key, mastery_score);

create index idx_vd_recommendations_student_active
  on visualdsa_student_recommendations(student_id, is_active, priority);
```

## Row-level security direction

The Express server currently manages session identity.

Recommended first implementation:

- Keep the Supabase service role on the server only.
- Do not expose it to browser JavaScript.
- Enforce authorization in Express service functions.
- Add PostgreSQL RLS as defense in depth when current identity mapping is confirmed.
- Never let the browser directly write official scores or events using service credentials.

## Data lifecycle

### Raw events

- Append-only
- Never silently edited
- Can be invalidated through a separate audit record
- Retained according to approved research policy

### Attempts

- Submitted and graded attempts are locked
- Invalidated attempts remain stored
- Instructor reason is required for invalidation

### Aggregates

- Recalculable
- Store calculation version
- Safe to replace during recomputation

## Migration order

```text
1. visualdsa_modules
2. visualdsa_problem_templates
3. visualdsa_problem_instances
4. visualdsa_practice_sessions
5. visualdsa_assessment_assignments
6. visualdsa_assessment_attempts
7. visualdsa_attempt_actions
8. visualdsa_interaction_events
9. visualdsa_misconception_definitions
10. visualdsa_detected_misconceptions
11. visualdsa_attempt_summaries
12. visualdsa_topic_mastery
13. visualdsa_student_recommendations
14. visualdsa_class_aggregates
15. indexes and policies
```

## Database acceptance criteria

```text
[ ] Existing user and class identifiers are reused
[ ] Assessment attempts retain seed and module version
[ ] Student actions are idempotent
[ ] Raw events are append-only
[ ] Official score fields are server-controlled
[ ] Submitted attempts are not deleted
[ ] Aggregates store calculation version
[ ] Authorization rules are documented and tested
[ ] Dashboard query indexes exist
[ ] No service-role key reaches the browser
```
