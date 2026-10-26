-- A cloud merge must preserve server-side history that a stale client may not
-- have seen. Client snapshots alone must never replace this transaction.
create function public.merge_contacts(source_id uuid,target_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); source_record public.saved_contacts; target_record public.saved_contacts; merged jsonb; histories jsonb; links jsonb; tags jsonb; begin
  if actor is null or source_id=target_id then raise exception 'Invalid merge'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  select * into source_record from public.saved_contacts where id=source_id and owner_id=actor for update;
  if not found then raise exception 'Sync the source contact before merging'; end if;
  select * into target_record from public.saved_contacts where id=target_id and owner_id=actor for update;
  if not found then raise exception 'Sync the target contact before merging'; end if;
  if exists(select 1 from public.contact_notes where contact_id=source_id and owner_id=actor) then raise exception 'Download and remove audio notes before merging'; end if;
  select coalesce(jsonb_agg(entry order by entry->>'at'),'[]') into histories from (select distinct on(entry->>'id') entry from (select value entry,0 priority from jsonb_array_elements(coalesce(source_record.data->'meetings','[]')) union all select value,1 from jsonb_array_elements(coalesce(target_record.data->'meetings','[]'))) records order by entry->>'id',priority desc) unique_history;
  select coalesce(jsonb_agg(entry),'[]') into links from (select distinct on(entry->>'url') entry from (select value entry from jsonb_array_elements(coalesce(target_record.data->'links','[]')||coalesce(source_record.data->'links','[]'))) records) unique_links;
  select coalesce(jsonb_agg(value),'[]') into tags from (select distinct value from jsonb_array_elements(coalesce(target_record.data->'tags','[]')||coalesce(source_record.data->'tags','[]'))) unique_tags;
  if jsonb_array_length(histories)>500 or jsonb_array_length(links)>12 or jsonb_array_length(tags)>20 then raise exception 'Merged record exceeds contact limits'; end if;
  merged:=target_record.data || jsonb_build_object('meetings',histories,'links',links,'tags',tags,'starred',coalesce((source_record.data->>'starred')::boolean,false) or coalesce((target_record.data->>'starred')::boolean,false));
  if target_record.profile_id is null and source_record.profile_id is not null then merged:=jsonb_set(merged,'{profileId}',to_jsonb(source_record.profile_id::text)); end if;
  update public.follow_up_reminders set contact_id=target_id,data=jsonb_set(data,'{contactId}',to_jsonb(target_id::text)),updated_at=now() where contact_id=source_id and owner_id=actor;
  update public.contact_meetings set contact_id=target_id where contact_id=source_id and owner_id=actor;
  delete from public.contact_tags where contact_id=source_id and owner_id=actor;
  delete from public.saved_contacts where id=source_id and owner_id=actor;
  update public.saved_contacts set data=merged,profile_id=coalesce(target_record.profile_id,source_record.profile_id),updated_at=now() where id=target_id and owner_id=actor;
  insert into public.contact_tags(contact_id,owner_id,tag) select target_id,actor,jsonb_array_elements_text(tags) on conflict do nothing;
  return merged;
end $$;
revoke all on function public.merge_contacts(uuid,uuid) from public,anon;
grant execute on function public.merge_contacts(uuid,uuid) to authenticated;
