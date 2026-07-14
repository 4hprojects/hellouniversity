begin;
update visualdsa_modules set status='active',updated_at=now() where module_key='binary-search' and version='1.0.0';
insert into visualdsa_problem_templates(template_key,module_id,version,difficulty,task_type,scoring_policy,configuration)
select 'binary-search-step-sequence-v1',id,1,'introductory','step-sequence','binary-search-standard-v1','{"feedbackMode":"immediate","duplicatePolicy":"find-any"}'::jsonb from visualdsa_modules where module_key='binary-search' and version='1.0.0'
on conflict(template_key,version)do update set module_id=excluded.module_id,configuration=excluded.configuration,is_active=true;
insert into visualdsa_misconception_definitions(code,module_key,version,title,description,related_lesson_slug,recommended_intervention) select code,'binary-search',1,title,description,'binary-search','Review active-range and boundary-update practice.' from(values
('BS01','Incorrect midpoint','Calculated midpoint incorrectly.'),('BS02','Incorrect low update','Updated low incorrectly.'),('BS03','Incorrect high update','Updated high incorrectly.'),('BS04','Returned to discarded range','Searched a discarded range.'),('BS05','Ignored sorted input','Used Binary Search on unsorted input.'),('BS06','Stopped early','Stopped before confirming absence.'),('BS07','Reset full range','Returned to full-array boundaries.'),('BS08','Included midpoint','Failed to exclude the compared midpoint.'),('BS09','Skipped final element','Used a loop condition that skipped the final candidate.'))v(code,title,description)
on conflict(code,version)do update set title=excluded.title,description=excluded.description,is_active=true;
commit;
