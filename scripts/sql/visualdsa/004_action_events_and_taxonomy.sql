begin;
insert into visualdsa_misconception_definitions(code,module_key,version,title,description,related_lesson_slug,recommended_intervention)
select code,module_key,1,title,description,lesson,'Review the related lesson and retry guided practice.' from (values
('AR01','arrays','Incorrect target index','Selected an incorrect array index.','arrays'),('AR02','arrays','Wrong shift direction','Shifted array elements in the wrong direction.','arrays'),('AR03','arrays','Overwrote before shifting','Overwrote a value before preserving it.','arrays'),('AR04','arrays','Incorrect final size','Reported the wrong logical array size.','arrays'),('AR05','arrays','Access-search confusion','Confused indexed access with searching.','arrays'),('AR06','arrays','Capacity-data confusion','Treated unused capacity as logical data.','arrays'),('AR07','arrays','Ignored capacity','Inserted without available capacity.','arrays'),
('ST01','stacks','Removed from bottom','Removed the bottom rather than the top.','stacks'),('ST02','stacks','Predicted FIFO','Applied queue behavior to a stack.','stacks'),('ST03','stacks','Ignored underflow','Attempted removal from an empty stack.','stacks'),('ST04','stacks','Incorrect top','Tracked the top pointer incorrectly.','stacks'),('ST05','stacks','Peek mutated stack','Changed the stack during peek.','stacks'),('ST06','stacks','Ignored capacity','Pushed beyond fixed capacity.','stacks'),('ST07','stacks','Invalid push position','Pushed below the current top.','stacks'),
('QU01','queues','Removed from rear','Removed the rear rather than the front.','queues'),('QU02','queues','Added at front','Enqueued at the front.','queues'),('QU03','queues','Front not updated','Failed to update front after dequeue.','queues'),('QU04','queues','Rear not updated','Failed to update rear after enqueue.','queues'),('QU05','queues','Empty state error','Misidentified an empty queue.','queues'),('QU06','queues','Wraparound error','Calculated circular wraparound incorrectly.','queues'),('QU07','queues','Capacity-size confusion','Confused capacity with logical size.','queues'),('QU08','queues','Moved front on enqueue','Changed front during normal enqueue.','queues'),('QU09','queues','Moved rear on dequeue','Changed rear during normal dequeue.','queues')
) v(code,module_key,title,description,lesson)
on conflict(code,version) do update set title=excluded.title,description=excluded.description,recommended_intervention=excluded.recommended_intervention,is_active=true;

create or replace function visualdsa_record_action_evidence() returns trigger language plpgsql security definer set search_path=public as $$
declare mk text; mv text; ls text; ps text; md text; aid uuid;
begin
 if new.practice_session_id is not null then
  select m.module_key,m.version,m.related_lesson_slug,p.problem_seed into mk,mv,ls,ps from visualdsa_practice_sessions s join visualdsa_modules m on m.id=s.module_id left join visualdsa_problem_instances p on p.id=s.problem_instance_id where s.id=new.practice_session_id; md:='practice';
 else
  select m.module_key,a.module_version,m.related_lesson_slug,p.problem_seed into mk,mv,ls,ps from visualdsa_assessment_attempts a join visualdsa_assessment_assignments x on x.id=a.assignment_id join visualdsa_modules m on m.id=x.module_id join visualdsa_problem_instances p on p.id=a.problem_instance_id where a.id=new.assessment_attempt_id; md:='assessment';
 end if;
 insert into visualdsa_interaction_events(event_id,user_id,student_id,lesson_slug,module_key,module_version,mode,practice_session_id,assessment_attempt_id,problem_seed,event_type,step_number,action_type,submitted_value,is_correct,response_number,hint_level,response_time_ms,misconception_code,metadata)
 values(new.client_event_id,new.user_id,new.student_id,ls,mk,mv,md,new.practice_session_id,new.assessment_attempt_id,ps,case when new.is_correct then 'action_correct' else 'action_incorrect' end,new.step_number,new.action_type,new.submitted_payload,new.is_correct,new.response_number,new.hint_level,new.response_time_ms,new.misconception_code,jsonb_build_object('actionId',new.id,'validationVersion',new.validation_version));
 if new.misconception_code is not null then
  insert into visualdsa_detected_misconceptions(student_id,assessment_attempt_id,practice_session_id,action_id,misconception_code,classifier_version,confidence) values(new.student_id,new.assessment_attempt_id,new.practice_session_id,new.id,new.misconception_code,1,1);
 end if;
 return new;
end $$;
drop trigger if exists trg_visualdsa_action_evidence on visualdsa_attempt_actions;
create trigger trg_visualdsa_action_evidence after insert on visualdsa_attempt_actions for each row execute function visualdsa_record_action_evidence();
commit;
