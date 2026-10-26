-- Remember private meeting context in the same authenticated, RLS-protected transaction.
create or replace function public.sync_workspace(payload jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); item jsonb; meeting jsonb; p jsonb; person uuid; tag_value text;
canonical_id uuid; original_id uuid; prior jsonb; merged_meetings jsonb; contact_ids jsonb := '{}'::jsonb; begin
  if actor is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  if coalesce(payload->>'activeEventId','')<>'' and not exists(select 1 from public.events where id=payload->>'activeEventId') then raise exception 'Choose a verified event' using errcode='22023'; end if;
  if octet_length(payload::text) > 5000000 then raise exception 'Payload too large'; end if;
  -- Serialize a user's batches so simultaneous offline imports share one identity.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  for item in select value from jsonb_array_elements(coalesce(payload->'deleted','[]')) loop
    case item->>'table'
      when 'saved_contacts' then delete from public.saved_contacts where id=(item->>'id')::uuid and owner_id=actor;
      when 'projects' then delete from public.projects where id=(item->>'id')::uuid and owner_id=actor;
      when 'follow_up_reminders' then delete from public.follow_up_reminders where id=(item->>'id')::uuid and owner_id=actor;
      else raise exception 'Invalid deletion target'; end case;
  end loop;
  p := payload->'profile';
  if p is not null and p <> 'null'::jsonb then
    p := jsonb_set(p, '{id}', to_jsonb(actor::text));
    insert into public.profiles(id,username,is_public,discoverable,data) values(actor,p->>'username',coalesce((p->>'public')::boolean,false),coalesce((p->>'discoverable')::boolean,false),p)
    on conflict(id) do update set username=excluded.username,is_public=excluded.is_public,discoverable=excluded.discoverable,data=excluded.data,updated_at=now();
    delete from public.profile_social_links where profile_id=actor;
    for item in select value from jsonb_array_elements(coalesce(p->'links','[]')) loop
      insert into public.profile_social_links(profile_id,label,url,is_public) values(actor,item->>'label',item->>'url',coalesce((p->>'public')::boolean,false));
    end loop;
  end if;
  for item in select value from jsonb_array_elements(coalesce(payload->'contacts','[]')) loop
    if coalesce((item->>'sample')::boolean,false) then raise exception 'Sample profiles cannot be synced'; end if;
    person := null;
    if nullif(item->>'profileId','') is not null then select id into person from public.profiles where id=(item->>'profileId')::uuid; end if;
    original_id := (item->>'id')::uuid;
    select id,data into canonical_id,prior from public.saved_contacts
      where owner_id=actor and (id=original_id or (person is not null and profile_id=person))
      order by (id=original_id) desc limit 1 for update;
    canonical_id := coalesce(canonical_id,original_id);
    contact_ids := contact_ids || jsonb_build_object(original_id::text,canonical_id::text);
    select coalesce(jsonb_agg(entry order by entry->>'at'),'[]'::jsonb) into merged_meetings from (
      select distinct on(entry->>'id') entry from (
        select value as entry,0 as priority from jsonb_array_elements(coalesce(prior->'meetings','[]'::jsonb))
        union all select value as entry,1 as priority from jsonb_array_elements(coalesce(item->'meetings','[]'::jsonb))
      ) all_meetings order by entry->>'id',priority desc
    ) unique_meetings;
    item := jsonb_set(jsonb_set(item,'{id}',to_jsonb(canonical_id::text)),'{meetings}',merged_meetings);
    insert into public.saved_contacts(id,owner_id,profile_id,data) values((item->>'id')::uuid,actor,person,item)
    on conflict(id) do update set data=excluded.data,profile_id=excluded.profile_id,updated_at=now();
    delete from public.contact_meetings where contact_id=(item->>'id')::uuid and owner_id=actor;
    for meeting in select value from jsonb_array_elements(coalesce(item->'meetings','[]')) loop
      insert into public.contact_meetings(id,contact_id,owner_id,event_id,met_at,private_note) values((meeting->>'id')::uuid,(item->>'id')::uuid,actor,nullif(meeting->>'eventId',''),(meeting->>'at')::timestamptz,coalesce(meeting->>'note',''));
    end loop;
    delete from public.contact_tags where contact_id=(item->>'id')::uuid and owner_id=actor;
    for tag_value in select distinct jsonb_array_elements_text(coalesce(item->'tags','[]')) loop
      insert into public.contact_tags(contact_id,owner_id,tag) values((item->>'id')::uuid,actor,tag_value);
    end loop;
  end loop;
  for item in select value from jsonb_array_elements(coalesce(payload->'projects','[]')) loop
    item := jsonb_set(item,'{ownerId}',to_jsonb(actor::text));
    insert into public.projects(id,owner_id,slug,is_public,data) values((item->>'id')::uuid,actor,item->>'slug',coalesce((item->>'public')::boolean,false),item)
    on conflict(id) do update set slug=excluded.slug,is_public=excluded.is_public,data=excluded.data,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(coalesce(payload->'reminders','[]')) loop
    if contact_ids ? (item->>'contactId') then item := jsonb_set(item,'{contactId}',contact_ids->(item->>'contactId')); end if;
    insert into public.follow_up_reminders(id,owner_id,contact_id,due_on,completed,data) values((item->>'id')::uuid,actor,(item->>'contactId')::uuid,(item->>'due')::date,coalesce((item->>'completed')::boolean,false),item)
    on conflict(id) do update set due_on=excluded.due_on,completed=excluded.completed,data=excluded.data,updated_at=now();
  end loop;
  if coalesce((payload->>'preferencesChanged')::boolean,true) then
    insert into public.profile_preferences(owner_id,data) values(actor,jsonb_build_object('bookmarks',coalesce(payload->'bookmarks','[]'), 'eventBookmarks',coalesce(payload->'eventBookmarks','[]'), 'blocked',coalesce(payload->'blocked','[]'), 'activeEventId',coalesce(payload->>'activeEventId',''))) on conflict(owner_id) do update set data=excluded.data,updated_at=now();
    delete from public.project_bookmarks where owner_id=actor;
    insert into public.project_bookmarks(owner_id,project_id) select actor,p.id from public.projects p where p.id::text in (select jsonb_array_elements_text(coalesce(payload->'bookmarks','[]'))) on conflict do nothing;
    delete from public.event_bookmarks where owner_id=actor;
    insert into public.event_bookmarks(owner_id,event_id) select actor,e.id from public.events e where e.id in (select jsonb_array_elements_text(coalesce(payload->'eventBookmarks','[]'))) on conflict do nothing;
    delete from public.blocked_users where owner_id=actor;
    insert into public.blocked_users(owner_id,blocked_id) select actor,id from public.profiles where id::text in(select jsonb_array_elements_text(coalesce(payload->'blocked','[]'))) and id<>actor on conflict do nothing;
  end if;
  return contact_ids;
end $$;
revoke all on function public.sync_workspace(jsonb) from public, anon;
grant execute on function public.sync_workspace(jsonb) to authenticated;
