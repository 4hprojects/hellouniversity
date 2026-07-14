begin;
create or replace function visualdsa_reject_raw_event_mutation() returns trigger language plpgsql as $$
begin raise exception 'VisualDSA raw interaction events are append-only'; end $$;
drop trigger if exists trg_visualdsa_events_append_only on visualdsa_interaction_events;
create trigger trg_visualdsa_events_append_only before update or delete on visualdsa_interaction_events for each row execute function visualdsa_reject_raw_event_mutation();
commit;
