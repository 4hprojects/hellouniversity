begin;

create or replace function visualdsa_record_action_evidence() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  mk text;
  mv text;
  ls text;
  ps text;
  md text;
  cls text;
begin
  if new.practice_session_id is not null then
    select m.module_key,m.version,m.related_lesson_slug,p.problem_seed,s.class_id
      into mk,mv,ls,ps,cls
      from visualdsa_practice_sessions s
      join visualdsa_modules m on m.id=s.module_id
      left join visualdsa_problem_instances p on p.id=s.problem_instance_id
     where s.id=new.practice_session_id;
    md:='practice';
  else
    select m.module_key,a.module_version,m.related_lesson_slug,p.problem_seed,a.class_id
      into mk,mv,ls,ps,cls
      from visualdsa_assessment_attempts a
      join visualdsa_assessment_assignments x on x.id=a.assignment_id
      join visualdsa_modules m on m.id=x.module_id
      join visualdsa_problem_instances p on p.id=a.problem_instance_id
     where a.id=new.assessment_attempt_id;
    md:='assessment';
  end if;
  insert into visualdsa_interaction_events(
    event_id,user_id,student_id,class_id,lesson_slug,module_key,module_version,mode,
    practice_session_id,assessment_attempt_id,problem_seed,event_type,step_number,
    action_type,submitted_value,is_correct,response_number,hint_level,response_time_ms,
    misconception_code,metadata
  ) values (
    new.client_event_id,new.user_id,new.student_id,cls,ls,mk,mv,md,
    new.practice_session_id,new.assessment_attempt_id,ps,
    case when new.is_correct then 'action_correct' else 'action_incorrect' end,
    new.step_number,new.action_type,new.submitted_payload,new.is_correct,new.response_number,
    new.hint_level,new.response_time_ms,new.misconception_code,
    jsonb_build_object('actionId',new.id,'validationVersion',new.validation_version)
  );
  if new.misconception_code is not null then
    insert into visualdsa_detected_misconceptions(
      student_id,assessment_attempt_id,practice_session_id,action_id,
      misconception_code,classifier_version,confidence
    ) values (
      new.student_id,new.assessment_attempt_id,new.practice_session_id,new.id,
      new.misconception_code,1,1
    );
  end if;
  return new;
end $$;

commit;
