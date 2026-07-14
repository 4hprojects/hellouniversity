begin;
insert into visualdsa_modules (module_key, version, title, related_lesson_slug, status, definition) values
('arrays','1.0.0','Array Operations','arrays','active','{"maximumInputSize":12}'::jsonb),
('stacks','1.0.0','Stack Operations','stacks','active','{"maximumInputSize":10}'::jsonb),
('queues','1.0.0','Queue Operations','queues','active','{"maximumInputSize":10}'::jsonb),
('binary-search','1.0.0','Binary Search','binary-search','draft','{"maximumInputSize":15}'::jsonb),
('sorting','1.0.0','Introductory Sorting','bubble-sort','draft','{"maximumInputSize":12,"relatedLessonSlugs":["bubble-sort","selection-sort","insertion-sort"]}'::jsonb),
('bst','1.0.0','Binary Search Tree','binary-search-trees','draft','{"maximumInputSize":15,"relatedLessonSlugs":["binary-search-trees","tree-traversals"]}'::jsonb)
on conflict (module_key, version) do update set title=excluded.title, related_lesson_slug=excluded.related_lesson_slug,
status=excluded.status, definition=excluded.definition, updated_at=now();
commit;
