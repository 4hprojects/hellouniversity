begin;
create or replace function visualdsa_mastery_recommendation_trigger()returns trigger language plpgsql security definer set search_path=public as $$
begin
 update visualdsa_student_recommendations set is_active=false,dismissed_at=now() where student_id=new.student_id and class_id is not distinct from new.class_id and module_key=new.module_key and is_active=true and reason_code in('LOW_MASTERY','INSUFFICIENT_EVIDENCE');
 if new.mastery_status='needs_review' then insert into visualdsa_student_recommendations(student_id,class_id,module_key,recommendation_type,message,reason_code,priority,related_lesson_slug)values(new.student_id,new.class_id,new.module_key,'review_lesson','Review the related lesson and complete targeted practice.','LOW_MASTERY','high',case when new.module_key='binary-search'then'binary-search'when new.module_key='bst'then'binary-search-trees'else new.module_key end);
 elsif new.mastery_status='insufficient_evidence' then insert into visualdsa_student_recommendations(student_id,class_id,module_key,recommendation_type,message,reason_code,priority,related_lesson_slug)values(new.student_id,new.class_id,new.module_key,'take_assessment','Complete practice and a recorded assessment to establish mastery.','INSUFFICIENT_EVIDENCE','medium',case when new.module_key='binary-search'then'binary-search'when new.module_key='bst'then'binary-search-trees'else new.module_key end);end if;return new;
end $$;
drop trigger if exists trg_visualdsa_mastery_recommendation on visualdsa_topic_mastery;
create trigger trg_visualdsa_mastery_recommendation after insert or update on visualdsa_topic_mastery for each row execute function visualdsa_mastery_recommendation_trigger();
commit;
