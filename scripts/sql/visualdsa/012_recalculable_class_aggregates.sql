begin;

create or replace function visualdsa_recalculate_class_aggregate(p_class text, p_module text)
returns void language plpgsql security definer set search_path=public as $$
declare
  module_id_value uuid;
  started_value integer;
  completed_value integer;
  average_mastery_value numeric;
  median_mastery_value numeric;
  first_accuracy_value numeric;
  misconceptions_value jsonb;
  intervention_value integer;
begin
  if p_class is null or p_module is null then return; end if;
  select id into module_id_value from visualdsa_modules
   where module_key=p_module and status='active' order by version desc limit 1;

  select count(distinct student_id) into started_value from (
    select student_id from visualdsa_practice_sessions
     where class_id=p_class and module_id=module_id_value
    union
    select a.student_id from visualdsa_assessment_attempts a
      join visualdsa_assessment_assignments x on x.id=a.assignment_id
     where a.class_id=p_class and x.module_id=module_id_value
  ) started;
  select count(distinct student_id) into completed_value from (
    select student_id from visualdsa_practice_sessions
     where class_id=p_class and module_id=module_id_value and status='completed'
    union
    select a.student_id from visualdsa_assessment_attempts a
      join visualdsa_assessment_assignments x on x.id=a.assignment_id
     where a.class_id=p_class and x.module_id=module_id_value and a.status='graded'
  ) completed;
  select round(avg(mastery_score),2),round(percentile_cont(.5) within group(order by mastery_score)::numeric,2),
         count(*) filter(where mastery_status in('needs_review','developing'))
    into average_mastery_value,median_mastery_value,intervention_value
    from visualdsa_topic_mastery where class_id=p_class and module_key=p_module;
  select round(100.0*count(*) filter(where is_correct)/nullif(count(*),0),2)
    into first_accuracy_value from visualdsa_interaction_events
   where class_id=p_class and module_key=p_module and coalesce(response_number,1)=1;
  select coalesce(jsonb_agg(jsonb_build_object('code',code,'events',event_count,'students',student_count)
    order by event_count desc,code),'[]'::jsonb) into misconceptions_value from (
      select misconception_code code,count(*) event_count,count(distinct student_id) student_count
        from visualdsa_interaction_events
       where class_id=p_class and module_key=p_module and misconception_code is not null
       group by misconception_code
    ) counts;

  insert into visualdsa_class_aggregates(
    class_id,module_key,started_students,completed_students,average_mastery,median_mastery,
    average_first_attempt_accuracy,common_misconceptions,intervention_count,
    calculation_version,calculated_at
  ) values (
    p_class,p_module,coalesce(started_value,0),coalesce(completed_value,0),average_mastery_value,
    median_mastery_value,first_accuracy_value,misconceptions_value,coalesce(intervention_value,0),
    'class-aggregate-v1',now()
  ) on conflict(class_id,module_key) do update set
    started_students=excluded.started_students,completed_students=excluded.completed_students,
    average_mastery=excluded.average_mastery,median_mastery=excluded.median_mastery,
    average_first_attempt_accuracy=excluded.average_first_attempt_accuracy,
    common_misconceptions=excluded.common_misconceptions,
    intervention_count=excluded.intervention_count,calculation_version=excluded.calculation_version,
    calculated_at=excluded.calculated_at;
end $$;

create or replace function visualdsa_refresh_class_aggregate_trigger() returns trigger
language plpgsql security definer set search_path=public as $$
declare cls text; mk text; mid uuid;
begin
  if tg_table_name='visualdsa_topic_mastery' then
    cls:=coalesce(new.class_id,old.class_id); mk:=coalesce(new.module_key,old.module_key);
  elsif tg_table_name='visualdsa_interaction_events' then
    cls:=new.class_id; mk:=new.module_key;
  elsif tg_table_name='visualdsa_practice_sessions' then
    cls:=coalesce(new.class_id,old.class_id); mid:=coalesce(new.module_id,old.module_id);
    select module_key into mk from visualdsa_modules where id=mid;
  else
    cls:=coalesce(new.class_id,old.class_id);
    select x.module_id into mid from visualdsa_assessment_assignments x
     where x.id=coalesce(new.assignment_id,old.assignment_id);
    select module_key into mk from visualdsa_modules where id=mid;
  end if;
  perform visualdsa_recalculate_class_aggregate(cls,mk);
  return coalesce(new,old);
end $$;

drop trigger if exists trg_visualdsa_mastery_class_aggregate on visualdsa_topic_mastery;
create trigger trg_visualdsa_mastery_class_aggregate after insert or update or delete on visualdsa_topic_mastery
for each row execute function visualdsa_refresh_class_aggregate_trigger();
drop trigger if exists trg_visualdsa_event_class_aggregate on visualdsa_interaction_events;
create trigger trg_visualdsa_event_class_aggregate after insert on visualdsa_interaction_events
for each row execute function visualdsa_refresh_class_aggregate_trigger();
drop trigger if exists trg_visualdsa_practice_class_aggregate on visualdsa_practice_sessions;
create trigger trg_visualdsa_practice_class_aggregate after insert or update of status,class_id on visualdsa_practice_sessions
for each row execute function visualdsa_refresh_class_aggregate_trigger();
drop trigger if exists trg_visualdsa_assessment_class_aggregate on visualdsa_assessment_attempts;
create trigger trg_visualdsa_assessment_class_aggregate after insert or update of status,class_id on visualdsa_assessment_attempts
for each row execute function visualdsa_refresh_class_aggregate_trigger();

commit;
