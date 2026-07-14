begin;

create extension if not exists pgcrypto;

create table if not exists visualdsa_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  version text not null,
  title text not null,
  related_lesson_slug text not null,
  status text not null check (status in ('draft', 'active', 'retired')),
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, version)
);

create table if not exists visualdsa_problem_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  module_id uuid not null references visualdsa_modules(id),
  version integer not null default 1,
  difficulty text not null,
  task_type text not null,
  scoring_policy text not null,
  configuration jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_key, version)
);

create table if not exists visualdsa_problem_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references visualdsa_problem_templates(id),
  problem_seed text not null,
  module_version text not null,
  public_input jsonb not null,
  validation_data jsonb not null,
  expected_steps_hash text not null,
  created_at timestamptz not null default now(),
  unique (template_id, problem_seed, module_version)
);

create table if not exists visualdsa_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  student_id text not null,
  class_id text,
  module_id uuid not null references visualdsa_modules(id),
  problem_instance_id uuid references visualdsa_problem_instances(id),
  status text not null check (status in ('created', 'in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists visualdsa_assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id text not null,
  created_by_user_id text not null,
  module_id uuid not null references visualdsa_modules(id),
  title text not null,
  settings jsonb not null default '{}'::jsonb,
  available_from timestamptz,
  available_until timestamptz,
  status text not null check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visualdsa_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references visualdsa_assessment_assignments(id),
  problem_instance_id uuid not null references visualdsa_problem_instances(id),
  user_id text not null,
  student_id text not null,
  class_id text not null,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('created', 'started', 'in_progress', 'paused', 'submitted', 'graded', 'expired', 'abandoned', 'invalidated')),
  score numeric(7,2),
  maximum_score numeric(7,2),
  percentage_score numeric(5,2) check (percentage_score is null or percentage_score between 0 and 100),
  module_version text not null,
  scoring_version text not null,
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id, attempt_number)
);

create table if not exists visualdsa_attempt_actions (
  id uuid primary key default gen_random_uuid(), client_event_id uuid not null unique,
  user_id text not null, student_id text not null,
  practice_session_id uuid references visualdsa_practice_sessions(id),
  assessment_attempt_id uuid references visualdsa_assessment_attempts(id),
  step_number integer not null check (step_number >= 0), action_type text not null,
  submitted_payload jsonb not null, is_correct boolean, response_number integer not null default 1,
  hint_level integer not null default 0, response_time_ms bigint check (response_time_ms is null or response_time_ms >= 0),
  misconception_code text, validation_version text not null, created_at timestamptz not null default now(),
  check ((practice_session_id is not null)::integer + (assessment_attempt_id is not null)::integer = 1)
);

create table if not exists visualdsa_interaction_events (
  id uuid primary key default gen_random_uuid(), event_id uuid not null unique, schema_version integer not null default 1,
  user_id text not null, student_id text not null, class_id text, lesson_slug text not null, module_key text not null,
  module_version text not null, mode text not null check (mode in ('guided','exploration','practice','assessment','instructor')),
  practice_session_id uuid references visualdsa_practice_sessions(id), assessment_attempt_id uuid references visualdsa_assessment_attempts(id),
  problem_seed text, event_type text not null, step_number integer, action_type text, submitted_value jsonb,
  is_correct boolean, response_number integer, hint_level integer, response_time_ms bigint,
  misconception_code text, metadata jsonb not null default '{}'::jsonb, client_timestamp timestamptz,
  server_timestamp timestamptz not null default now(), created_at timestamptz not null default now()
);

create table if not exists visualdsa_misconception_definitions (
  id uuid primary key default gen_random_uuid(), code text not null, module_key text not null, version integer not null default 1,
  title text not null, description text not null, related_lesson_slug text, recommended_intervention text,
  is_active boolean not null default true, created_at timestamptz not null default now(), unique (code, version)
);
create table if not exists visualdsa_detected_misconceptions (
  id uuid primary key default gen_random_uuid(), student_id text not null,
  assessment_attempt_id uuid references visualdsa_assessment_attempts(id), practice_session_id uuid references visualdsa_practice_sessions(id),
  action_id uuid references visualdsa_attempt_actions(id), misconception_code text not null,
  classifier_version integer not null, confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  detected_at timestamptz not null default now()
);
create table if not exists visualdsa_attempt_summaries (
  id uuid primary key default gen_random_uuid(), assessment_attempt_id uuid not null unique references visualdsa_assessment_attempts(id),
  student_id text not null, module_key text not null, total_scored_steps integer not null default 0,
  correct_first_responses integer not null default 0, correct_final_responses integer not null default 0,
  hints_used integer not null default 0, retries integer not null default 0, first_attempt_accuracy numeric(5,2),
  final_accuracy numeric(5,2), percentage_score numeric(5,2), active_duration_ms bigint not null default 0,
  misconception_counts jsonb not null default '{}'::jsonb, calculation_version text not null, calculated_at timestamptz not null default now()
);
create table if not exists visualdsa_topic_mastery (
  id uuid primary key default gen_random_uuid(), student_id text not null, class_id text, module_key text not null,
  mastery_score numeric(5,2) check (mastery_score between 0 and 100),
  mastery_status text not null check (mastery_status in ('insufficient_evidence','needs_review','developing','proficient','mastered')),
  assessment_component numeric(5,2), practice_component numeric(5,2), completion_component numeric(5,2), evidence_count integer not null default 0,
  calculation_version text not null, last_evidence_at timestamptz, calculated_at timestamptz not null default now(),
  unique nulls not distinct (student_id, class_id, module_key)
);
create table if not exists visualdsa_student_recommendations (
  id uuid primary key default gen_random_uuid(), student_id text not null, class_id text, module_key text not null,
  recommendation_type text not null, message text not null, reason_code text not null,
  priority text not null check (priority in ('low','medium','high')), related_lesson_slug text,
  is_active boolean not null default true, generated_at timestamptz not null default now(), dismissed_at timestamptz, completed_at timestamptz
);
create table if not exists visualdsa_class_aggregates (
  id uuid primary key default gen_random_uuid(), class_id text not null, module_key text not null,
  enrolled_students integer not null default 0, started_students integer not null default 0, completed_students integer not null default 0,
  average_mastery numeric(5,2), median_mastery numeric(5,2), average_first_attempt_accuracy numeric(5,2),
  common_misconceptions jsonb not null default '[]'::jsonb, intervention_count integer not null default 0,
  calculation_version text not null, calculated_at timestamptz not null default now(), unique (class_id, module_key)
);

create index if not exists idx_vd_practice_student_module on visualdsa_practice_sessions(student_id, module_id, started_at desc);
create index if not exists idx_vd_attempt_student_assignment on visualdsa_assessment_attempts(student_id, assignment_id, attempt_number);
create index if not exists idx_vd_attempt_status on visualdsa_assessment_attempts(status, expires_at);
create index if not exists idx_vd_actions_attempt_step on visualdsa_attempt_actions(assessment_attempt_id, step_number, created_at);
create index if not exists idx_vd_events_attempt_time on visualdsa_interaction_events(assessment_attempt_id, server_timestamp);
create index if not exists idx_vd_events_student_module on visualdsa_interaction_events(student_id, module_key, server_timestamp desc);
create index if not exists idx_vd_events_misconception on visualdsa_interaction_events(misconception_code) where misconception_code is not null;
create index if not exists idx_vd_mastery_class_module on visualdsa_topic_mastery(class_id, module_key, mastery_score);
create index if not exists idx_vd_recommendations_student_active on visualdsa_student_recommendations(student_id, is_active, priority);

comment on column visualdsa_practice_sessions.student_id is 'Existing session studentIDNumber; validated by Express.';
comment on column visualdsa_practice_sessions.user_id is 'Existing session/MongoDB user identifier; validated by Express.';
comment on column visualdsa_practice_sessions.class_id is 'MongoDB class ObjectId hex string; validated by Express.';

commit;
