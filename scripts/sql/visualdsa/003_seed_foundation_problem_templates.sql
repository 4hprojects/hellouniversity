begin;
insert into visualdsa_problem_templates (template_key,module_id,version,difficulty,task_type,scoring_policy,configuration)
select v.template_key,m.id,1,'introductory',v.task_type,v.scoring_policy,v.configuration
from (values
 ('array-insert-v1','arrays','step-sequence','array-insert-standard-v1','{"feedbackMode":"immediate"}'::jsonb),
 ('stack-operation-sequence-v1','stacks','step-sequence','stack-standard-v1','{"feedbackMode":"immediate"}'::jsonb),
 ('queue-operation-sequence-v1','queues','step-sequence','queue-standard-v1','{"feedbackMode":"immediate"}'::jsonb)
) as v(template_key,module_key,task_type,scoring_policy,configuration)
join visualdsa_modules m on m.module_key=v.module_key and m.version='1.0.0'
on conflict (template_key,version) do update set module_id=excluded.module_id,difficulty=excluded.difficulty,
task_type=excluded.task_type,scoring_policy=excluded.scoring_policy,configuration=excluded.configuration,is_active=true;
commit;
