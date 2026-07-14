begin;
update visualdsa_modules set status='active',updated_at=now() where module_key='bst' and version='1.0.0';
insert into visualdsa_problem_templates(template_key,module_id,version,difficulty,task_type,scoring_policy,configuration)
select v.template_key,m.id,1,'introductory','step-sequence',v.policy,v.config from(values
('bst-insert-one-v1','bst-insert-standard-v1','{"operation":"insert","duplicatePolicy":"reject"}'::jsonb),('bst-traversal-v1','bst-traversal-standard-v1','{"operation":"traverse","traversals":["preorder","inorder","postorder"]}'::jsonb))v(template_key,policy,config) join visualdsa_modules m on m.module_key='bst' and m.version='1.0.0'
on conflict(template_key,version)do update set module_id=excluded.module_id,scoring_policy=excluded.scoring_policy,configuration=excluded.configuration,is_active=true;
insert into visualdsa_misconception_definitions(code,module_key,version,title,description,related_lesson_slug,recommended_intervention) select code,'bst',1,title,description,'binary-search-trees','Review BST ordering or traversal rules and retry guided practice.' from(values
('BT01','Wrong direction','Chose the wrong left or right direction.'),('BT02','Wrong parent','Inserted under the wrong parent.'),('BT03','Broken connection','Broke a tree connection.'),('BT04','Duplicate handling','Handled a duplicate incorrectly.'),('BT05','Traversal order','Submitted an incorrect traversal order.'),('BT06','Depth-height confusion','Confused depth with height.'),('BT07','Compared with root again','Returned to the root after moving.'),('BT08','Ignored subtree rule','Ignored inherited subtree constraints.'),('BT09','Inorder as preorder','Used root-left-right for inorder.'),('BT10','Stopped before null','Stopped an unsuccessful search too early.'))v(code,title,description)
on conflict(code,version)do update set title=excluded.title,description=excluded.description,is_active=true;
commit;
