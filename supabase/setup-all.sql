-- Connect IRL: one-paste database setup for a new Supabase project.
-- Paste into Supabase -> SQL Editor -> New query -> Run. Run ONCE on an empty project.
-- This is migrations 001-008 followed by seed.sql, in order. If you add a migration, append it here.

-- ============================================================
-- supabase/migrations/202610250001_foundation.sql
-- ============================================================
-- BuilderMatch: one shared backend for the website, mobile PWA, and desktop UI.
-- Run with Supabase migrations. No sample attendees or private notes are seeded.
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.users(id) values (new.id) on conflict do nothing; return new; end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.users(id) select id from auth.users on conflict do nothing;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{1,39}$' and username not like 'demo-%'),
  is_public boolean not null default false,
  discoverable boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32768),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('english', data::text)) stored,
  check (not discoverable or is_public),
  check (data->>'id' = id::text and data->>'username' = username)
);
create index profiles_search_idx on public.profiles using gin(search_vector);
create index profiles_discovery_idx on public.profiles(updated_at desc) where is_public and discoverable;
create table public.profile_social_links (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (length(label) <= 40), url text not null check (url ~ '^https?://' and length(url) <= 2048),
  is_public boolean not null default false
);
create table public.profile_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade, data jsonb not null default '{}' check (octet_length(data::text) <= 262144), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,100}$'), is_public boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 65536),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('english', data::text)) stored,
  check (data->>'ownerId' = owner_id::text and data->>'id' = id::text and data->>'slug' = slug)
);
create index projects_owner_idx on public.projects(owner_id);
create index projects_search_idx on public.projects using gin(search_vector);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (length(role) <= 100), primary key(project_id, user_id)
);
create table public.project_collaboration_requests (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade, message text not null check (length(message) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')), created_at timestamptz not null default now()
);
create table public.events (
  id text primary key, slug text unique not null, name text not null, starts_on date not null, ends_on date not null,
  website text not null check (website ~ '^https://'), source_url text not null check (source_url ~ '^https://'), verified_at timestamptz not null,
  organizer text not null, description text not null default '', check (ends_on >= starts_on)
);
create table public.event_venues (
  id uuid primary key default gen_random_uuid(), event_id text not null unique references public.events(id) on delete cascade,
  name text not null, address text not null, city text not null, longitude double precision not null check (longitude between -180 and 180), latitude double precision not null check (latitude between -90 and 90)
);
create table public.event_zones (
  id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.event_venues(id) on delete cascade,
  name text not null, source_url text not null, verified boolean not null default false
);
create table public.event_checkins (
  user_id uuid not null references auth.users(id) on delete cascade, event_id text not null references public.events(id) on delete cascade,
  expires_at timestamptz not null check (expires_at <= now() + interval '2 hours 1 minute'),
  primary key(user_id, event_id)
);
create index active_checkins_idx on public.event_checkins(event_id, expires_at);
create table public.saved_contacts (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1048576),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('english', data::text)) stored,
  unique(id, owner_id), check (data->>'id' = id::text)
);
create unique index saved_contact_profile_once on public.saved_contacts(owner_id, profile_id) where profile_id is not null;
create index contacts_owner_idx on public.saved_contacts(owner_id);
create index contacts_search_idx on public.saved_contacts using gin(search_vector);
create table public.contact_meetings (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null, event_id text references public.events(id) on delete set null,
  met_at timestamptz not null, private_note text not null default '' check (length(private_note) <= 5000),
  foreign key(contact_id, owner_id) references public.saved_contacts(id, owner_id) on delete cascade
);
create index contact_meetings_owner_idx on public.contact_meetings(owner_id, contact_id);
create table public.contact_notes (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (length(body) <= 5000), audio_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(contact_id, owner_id) references public.saved_contacts(id, owner_id) on delete cascade,
  check (audio_path is null or audio_path like owner_id::text || '/%')
);
create table public.contact_tags (
  contact_id uuid not null, owner_id uuid not null references auth.users(id) on delete cascade,
  tag text not null check (length(tag) between 1 and 60), primary key(contact_id, tag),
  foreign key(contact_id, owner_id) references public.saved_contacts(id, owner_id) on delete cascade
);
create table public.project_bookmarks (
  owner_id uuid not null references auth.users(id) on delete cascade, project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(owner_id, project_id)
);
create table public.event_bookmarks (
  owner_id uuid not null references auth.users(id) on delete cascade, event_id text not null references public.events(id) on delete cascade,
  primary key(owner_id, event_id)
);
create table public.follow_up_reminders (
  id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade, contact_id uuid not null,
  due_on date not null, completed boolean not null default false,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32768),
  updated_at timestamptz not null default now(),
  foreign key(contact_id, owner_id) references public.saved_contacts(id, owner_id) on delete cascade,
  check (data->>'id' = id::text and data->>'contactId' = contact_id::text)
);
create index reminders_owner_due_idx on public.follow_up_reminders(owner_id, due_on) where not completed;
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, status text not null default 'awaiting_authorization' check (status in ('awaiting_authorization','external_link','integrated','unsupported')),
  unique(owner_id, provider)
);
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) <= 1000), read_at timestamptz, created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  reason text not null check (length(reason) between 10 and 2000), status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
create table public.blocked_users (
  owner_id uuid not null references auth.users(id) on delete cascade, blocked_id uuid not null references auth.users(id) on delete cascade,
  primary key(owner_id, blocked_id), check (owner_id <> blocked_id)
);
create table public.event_submissions (
  id uuid primary key default gen_random_uuid(), submitted_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 2 and 150), url text not null check (url ~ '^https?://' and length(url) <= 2048), notes text not null default '' check (length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')), created_at timestamptz not null default now()
);

-- Default deny on every table. Policies below are the only client access paths.
do $$ declare t text; begin foreach t in array array['users','profiles','profile_social_links','profile_preferences','projects','project_members','project_collaboration_requests','events','event_venues','event_zones','event_checkins','saved_contacts','contact_meetings','contact_notes','contact_tags','project_bookmarks','event_bookmarks','follow_up_reminders','integration_connections','user_notifications','reports','blocked_users','event_submissions'] loop execute format('alter table public.%I enable row level security', t); end loop; end $$;
create policy user_self on public.users for select to authenticated using (id = (select auth.uid()));
create policy profile_read on public.profiles for select using (is_public or id = (select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profile_delete on public.profiles for delete to authenticated using (id = (select auth.uid()));
create policy social_read on public.profile_social_links for select using (profile_id = (select auth.uid()) or (is_public and exists(select 1 from public.profiles p where p.id = profile_id and p.is_public)));
create policy social_owner on public.profile_social_links for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy project_read on public.projects for select using (is_public or owner_id = (select auth.uid()));
create policy project_owner on public.projects for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy project_member_read on public.project_members for select using (exists(select 1 from public.projects p where p.id = project_id and (p.is_public or p.owner_id = (select auth.uid()))));
create policy project_member_manage on public.project_members for all to authenticated using (exists(select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (exists(select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy collaboration_sender on public.project_collaboration_requests for insert to authenticated with check(sender_id = (select auth.uid()));
create policy collaboration_read on public.project_collaboration_requests for select to authenticated using(sender_id = (select auth.uid()) or exists(select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy collaboration_update on public.project_collaboration_requests for update to authenticated using(exists(select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check(exists(select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy events_read on public.events for select using(true);
create policy venues_read on public.event_venues for select using(true);
create policy zones_read on public.event_zones for select using(verified);
create policy checkin_read on public.event_checkins for select to authenticated using (user_id = (select auth.uid()) or (expires_at > now() and exists(select 1 from public.profiles p where p.id = user_id and p.is_public and p.discoverable)));
create policy checkin_owner on public.event_checkins for all to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()) and expires_at <= now() + interval '2 hours 1 minute');
do $$ declare t text; begin foreach t in array array['profile_preferences','saved_contacts','contact_meetings','contact_notes','contact_tags','project_bookmarks','event_bookmarks','follow_up_reminders','integration_connections','user_notifications','blocked_users'] loop
  execute format('create policy owner_only on public.%I for all to authenticated using(owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()))', t);
end loop; end $$;
create policy report_submit on public.reports for insert to authenticated with check(reporter_id = (select auth.uid()) and status = 'pending');
create policy own_report_read on public.reports for select to authenticated using(reporter_id = (select auth.uid()));
create policy event_submit on public.event_submissions for insert to authenticated with check(submitted_by = (select auth.uid()) and status = 'pending');
create policy own_submission_read on public.event_submissions for select to authenticated using(submitted_by = (select auth.uid()));

-- PostgreSQL-backed rate limits: atomic across Vercel instances, never client-owned IDs.
create table public.request_limits (owner_id uuid not null references auth.users(id) on delete cascade, bucket text not null, window_start timestamptz not null, requests int not null default 1, primary key(owner_id, bucket));
alter table public.request_limits enable row level security;
create function public.check_rate_limit(bucket text, max_requests int, window_seconds int) returns boolean language plpgsql security definer set search_path = '' as $$
declare n int; begin
  if auth.uid() is null then return false; end if;
  if bucket <> 'mutation' or max_requests <> 60 or window_seconds <> 60 then return false; end if;
  insert into public.request_limits as r(owner_id, bucket, window_start) values(auth.uid(), bucket, now())
  on conflict on constraint request_limits_pkey do update set requests = case when r.window_start < now() - interval '60 seconds' then 1 else r.requests + 1 end, window_start = case when r.window_start < now() - interval '60 seconds' then now() else r.window_start end returning requests into n;
  return n <= 60;
end $$;
revoke all on function public.check_rate_limit(text,int,int) from public, anon;
grant execute on function public.check_rate_limit(text,int,int) to authenticated;

-- One atomic batch. Invoker privileges + RLS remain in force for every mutation.
create function public.sync_workspace(payload jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare actor uuid := auth.uid(); item jsonb; meeting jsonb; p jsonb; person uuid; tag_value text;
canonical_id uuid; original_id uuid; prior jsonb; merged_meetings jsonb; contact_ids jsonb := '{}'::jsonb; begin
  if actor is null then raise exception 'Unauthorized' using errcode='42501'; end if;
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
    insert into public.profile_preferences(owner_id,data) values(actor,jsonb_build_object('bookmarks',coalesce(payload->'bookmarks','[]'), 'eventBookmarks',coalesce(payload->'eventBookmarks','[]'), 'blocked',coalesce(payload->'blocked','[]'))) on conflict(owner_id) do update set data=excluded.data,updated_at=now();
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

create function public.search_my_contacts(search_query text) returns setof public.saved_contacts language sql stable security invoker set search_path='' as $$
  select * from public.saved_contacts where owner_id=auth.uid() and search_vector @@ websearch_to_tsquery('english', left(search_query,500)) order by ts_rank(search_vector,websearch_to_tsquery('english',left(search_query,500))) desc limit 100;
$$;
revoke all on function public.search_my_contacts(text) from public, anon;
grant execute on function public.search_my_contacts(text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('avatars','avatars',true,2000000,array['image/jpeg','image/png','image/webp']),
('voice-notes','voice-notes',false,8000000,array['audio/webm','audio/mp4','audio/ogg','video/webm']) on conflict(id) do nothing;
create policy avatar_public_read on storage.objects for select using(bucket_id='avatars');
create policy avatar_upload_own on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_delete_own on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy audio_owner_read on storage.objects for select to authenticated using(bucket_id='voice-notes' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy audio_owner_insert on storage.objects for insert to authenticated with check(bucket_id='voice-notes' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy audio_owner_delete on storage.objects for delete to authenticated using(bucket_id='voice-notes' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- ============================================================
-- supabase/migrations/202610250002_contact_merge.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/202610250003_collaboration_presence.sql
-- ============================================================
-- Consent-based collaboration and venue-level discovery. No private notes,
-- contact books, email addresses, or GPS coordinates enter either workflow.
create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Member' check(length(trim(role)) between 1 and 100),
  status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,invitee_id), check(invited_by<>invitee_id)
);
alter table public.project_invitations enable row level security;
grant select on public.project_invitations to authenticated;
revoke all on public.project_invitations from anon;
create unique index collaboration_request_once on public.project_collaboration_requests(project_id,sender_id);
create index collaboration_sender_idx on public.project_collaboration_requests(sender_id,created_at desc);
create index collaboration_project_idx on public.project_collaboration_requests(project_id,created_at desc);
create index invitations_recipient_idx on public.project_invitations(invitee_id,created_at desc);
create index member_user_idx on public.project_members(user_id);

create function public.can_interact(other_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and other_user<>auth.uid() and not exists(
    select 1 from public.blocked_users where (owner_id=auth.uid() and blocked_id=other_user) or (owner_id=other_user and blocked_id=auth.uid())
  );
$$;
revoke all on function public.can_interact(uuid) from public,anon;
grant execute on function public.can_interact(uuid) to authenticated;
create function public.is_project_member(project uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.project_members where project_id=project and user_id=auth.uid());
$$;
revoke all on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to anon,authenticated;

-- Membership is affiliation and private-project read access; only the owner
-- may edit project details. Clients cannot manufacture accepted requests/members.
drop policy project_read on public.projects;
create policy project_read on public.projects for select using(is_public or owner_id=(select auth.uid()) or public.is_project_member(id));
drop policy project_member_manage on public.project_members;
drop policy project_member_read on public.project_members;
create policy project_member_read on public.project_members for select using(
  user_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and (
    p.owner_id=(select auth.uid()) or (p.is_public and exists(select 1 from public.profiles f where f.id=user_id and f.is_public))
  ))
);
drop policy collaboration_sender on public.project_collaboration_requests;
drop policy collaboration_update on public.project_collaboration_requests;
create policy invitation_read on public.project_invitations for select to authenticated using(
  invitee_id=(select auth.uid()) or exists(select 1 from public.projects p where p.id=project_id and p.owner_id=(select auth.uid()))
);
drop policy checkin_read on public.event_checkins;
create policy checkin_read on public.event_checkins for select to authenticated using(user_id=(select auth.uid()) or (
  expires_at>now() and public.can_interact(user_id) and exists(select 1 from public.profiles p where p.id=user_id and p.is_public and p.discoverable)
));

create function public.collaboration_action(action text,target uuid,body jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); project_record public.projects; request_record public.project_collaboration_requests;
  invitation_record public.project_invitations; person uuid; requested_role text; decision text; result_id uuid;
begin
  if actor is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  if not public.check_rate_limit('mutation',60,60) then raise exception 'Too many requests. Try again in a minute.' using errcode='P0001'; end if;
  if octet_length(body::text)>10000 then raise exception 'Request is too large.' using errcode='22023'; end if;
  if action in ('request','invite','remove_member','set_member_role') then
    select * into project_record from public.projects where id=target;
    if not found then raise exception 'Project unavailable.' using errcode='P0002'; end if;
    perform pg_advisory_xact_lock(hashtextextended(target::text,1));
  end if;
  if action='request' then
    if not project_record.is_public or not public.can_interact(project_record.owner_id) then raise exception 'This project cannot accept your request.' using errcode='42501'; end if;
    if not exists(select 1 from public.profiles where id=actor and is_public) then raise exception 'Publish your builder profile before requesting collaboration.' using errcode='22023'; end if;
    if length(trim(coalesce(body->>'message',''))) not between 1 and 2000 then raise exception 'Write a message of 1–2000 characters.' using errcode='22023'; end if;
    if exists(select 1 from public.project_members where project_id=target and user_id=actor) then raise exception 'You are already on this team.' using errcode='22023'; end if;
    insert into public.project_collaboration_requests(project_id,sender_id,message) values(target,actor,trim(body->>'message'))
    on conflict(project_id,sender_id) do update set message=excluded.message,status='pending',created_at=now() returning id into result_id;
  elsif action='respond_request' then
    select * into request_record from public.project_collaboration_requests where id=target for update;
    if not found then raise exception 'Request unavailable.' using errcode='P0002'; end if;
    select * into project_record from public.projects where id=request_record.project_id;
    if project_record.owner_id<>actor or not public.can_interact(request_record.sender_id) then raise exception 'Only the project owner can review this request.' using errcode='42501'; end if;
    decision:=body->>'decision';
    if request_record.status<>'pending' or decision not in ('accepted','declined') or decision is null then raise exception 'This request is no longer pending or the decision is invalid.' using errcode='22023'; end if;
    update public.project_collaboration_requests set status=decision where id=target;
    if decision='accepted' then insert into public.project_members(project_id,user_id,role) values(request_record.project_id,request_record.sender_id,'Collaborator') on conflict do nothing; end if;
    result_id:=target;
  elsif action='withdraw_request' then
    delete from public.project_collaboration_requests where id=target and sender_id=actor and status='pending';
    if not found then raise exception 'Only your pending requests can be withdrawn.' using errcode='42501'; end if;
    result_id:=target;
  elsif action='invite' then
    if project_record.owner_id<>actor then raise exception 'Only the project owner can invite builders.' using errcode='42501'; end if;
    select id into person from public.profiles where username=lower(trim(body->>'username')) and is_public;
    if person is null or not public.can_interact(person) then raise exception 'This builder is unavailable for invitations.' using errcode='22023'; end if;
    requested_role:=trim(coalesce(body->>'role','Member'));
    if length(requested_role) not between 1 and 100 then raise exception 'Use a role of 1–100 characters.' using errcode='22023'; end if;
    if exists(select 1 from public.project_members where project_id=target and user_id=person) then raise exception 'This builder is already on the team.' using errcode='22023'; end if;
    insert into public.project_invitations(project_id,invited_by,invitee_id,role) values(target,actor,person,requested_role)
    on conflict(project_id,invitee_id) do update set invited_by=actor,role=excluded.role,status='pending',created_at=now(),updated_at=now() returning id into result_id;
  elsif action='respond_invitation' then
    select * into invitation_record from public.project_invitations where id=target for update;
    if not found then raise exception 'Invitation unavailable.' using errcode='P0002'; end if;
    if invitation_record.invitee_id<>actor or not public.can_interact(invitation_record.invited_by) then raise exception 'Only the invited builder can respond.' using errcode='42501'; end if;
    decision:=body->>'decision';
    if invitation_record.status<>'pending' or decision not in ('accepted','declined') or decision is null then raise exception 'This invitation is no longer pending or the decision is invalid.' using errcode='22023'; end if;
    update public.project_invitations set status=decision,updated_at=now() where id=target;
    if decision='accepted' then insert into public.project_members(project_id,user_id,role) values(invitation_record.project_id,actor,invitation_record.role) on conflict do nothing; end if;
    result_id:=target;
  elsif action='revoke_invitation' then
    update public.project_invitations i set status='revoked',updated_at=now() where i.id=target and i.status='pending' and exists(select 1 from public.projects p where p.id=i.project_id and p.owner_id=actor);
    if not found then raise exception 'Only the owner can revoke a pending invitation.' using errcode='42501'; end if;
    result_id:=target;
  elsif action in ('remove_member','set_member_role') then
    person:=(body->>'userId')::uuid;
    if person is null or (project_record.owner_id<>actor and not(action='remove_member' and person=actor)) then raise exception 'This team change is not permitted.' using errcode='42501'; end if;
    if action='remove_member' then
      delete from public.project_members where project_id=target and user_id=person;
    else
      requested_role:=trim(coalesce(body->>'role',''));
      if length(requested_role) not between 1 and 100 then raise exception 'Use a role of 1–100 characters.' using errcode='22023'; end if;
      update public.project_members set role=requested_role where project_id=target and user_id=person;
    end if;
    if not found then raise exception 'Team member unavailable.' using errcode='P0002'; end if;
    result_id:=target;
  else raise exception 'Unsupported collaboration action.' using errcode='22023';
  end if;
  return jsonb_build_object('id',result_id);
end $$;
revoke all on function public.collaboration_action(text,uuid,jsonb) from public,anon;
grant execute on function public.collaboration_action(text,uuid,jsonb) to authenticated;

-- An invitation intentionally shares a small project summary before acceptance.
-- It does not reveal the full private project or grant membership early.
create function public.project_summaries(ids uuid[]) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'name',p.data->>'name','tagline',p.data->>'tagline','ownerId',p.owner_id,'public',p.is_public)),'[]') from public.projects p where p.id=any(ids) and (
    p.is_public or p.owner_id=auth.uid() or public.is_project_member(p.id) or exists(select 1 from public.project_invitations i where i.project_id=p.id and i.invitee_id=auth.uid() and i.status='pending')
  );
$$;
revoke all on function public.project_summaries(uuid[]) from public,anon;
grant execute on function public.project_summaries(uuid[]) to authenticated;

create function public.discover_venue_builders(event_filter text,query_text text default '',ecosystem_filter text default '',role_filter text default '',goal_filter text default '',page_number int default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to see opted-in venue check-ins.' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=event_filter) then raise exception 'Choose a verified event.' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('profile',r.data,'eventId',r.event_id,'expiresAt',r.expires_at)),'[]') from (
    select p.data,c.event_id,c.expires_at from public.event_checkins c join public.profiles p on p.id=c.user_id
    where c.event_id=event_filter and c.expires_at>now() and p.is_public and p.discoverable
      and (c.user_id=auth.uid() or public.can_interact(c.user_id))
      and (coalesce(query_text,'')='' or p.search_vector @@ websearch_to_tsquery('english',left(query_text,300)))
      and (coalesce(ecosystem_filter,'')='' or p.data->'tags' ? ecosystem_filter)
      and (coalesce(role_filter,'')='' or p.data->>'role'=role_filter)
      and (coalesce(goal_filter,'')='' or p.data->'lookingFor' ? goal_filter)
    order by c.expires_at desc,p.id limit 24 offset greatest(0,least(coalesce(page_number,0),1000))*24
  ) r);
end $$;
revoke all on function public.discover_venue_builders(text,text,text,text,text,int) from public,anon;
grant execute on function public.discover_venue_builders(text,text,text,text,text,int) to authenticated;

-- ============================================================
-- supabase/migrations/202610260004_current_event.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/202610260005_connection_receipts.sql
-- ============================================================
-- A scan acknowledgement, not a reciprocal contact or a copy of private notes.
create table public.connection_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(actor_id,recipient_id),
  check(actor_id<>recipient_id)
);
create index connection_receipts_inbox on public.connection_receipts(recipient_id,created_at desc);
alter table public.connection_receipts enable row level security;
revoke all on public.connection_receipts from anon,authenticated;
grant select on public.connection_receipts to authenticated;
create policy receipt_read on public.connection_receipts for select to authenticated using (
  recipient_id=(select auth.uid()) and public.can_interact(actor_id)
  and exists(select 1 from public.profiles where id=actor_id and is_public)
);

create function public.record_connection_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare sent_count int;
begin
  if auth.uid() is null or new.owner_id<>auth.uid() or new.profile_id is null
     or new.owner_id=new.profile_id or coalesce(new.data->>'source','') not in ('qr','profile') then return new; end if;
  if tg_op='UPDATE' and old.profile_id is not distinct from new.profile_id then return new; end if;
  if not public.can_interact(new.profile_id)
     or not exists(select 1 from public.profiles where id=new.owner_id and is_public)
     or not exists(select 1 from public.profiles where id=new.profile_id and is_public)
     or exists(select 1 from public.connection_receipts where actor_id=new.owner_id and recipient_id=new.profile_id) then return new; end if;
  insert into public.request_limits as r(owner_id,bucket,window_start) values(auth.uid(),'connection-receipt',now())
  on conflict on constraint request_limits_pkey do update set
    requests=case when r.window_start<now()-interval '60 seconds' then 1 else r.requests+1 end,
    window_start=case when r.window_start<now()-interval '60 seconds' then now() else r.window_start end
  returning requests into sent_count;
  if sent_count>30 then return new; end if;
  insert into public.connection_receipts(actor_id,recipient_id) values(new.owner_id,new.profile_id) on conflict do nothing;
  return new;
end $$;
revoke all on function public.record_connection_receipt() from public,anon,authenticated;
create trigger connection_receipt_after_save after insert or update of profile_id
on public.saved_contacts for each row execute function public.record_connection_receipt();

create function public.mark_connection_receipt_read(target uuid) returns void
language sql security definer set search_path='' as $$
  update public.connection_receipts set read_at=coalesce(read_at,now())
  where id=target and recipient_id=auth.uid() and public.can_interact(actor_id);
$$;
revoke all on function public.mark_connection_receipt_read(uuid) from public,anon;
grant execute on function public.mark_connection_receipt_read(uuid) to authenticated;

-- ============================================================
-- supabase/migrations/202610260006_multi_role_profiles.sql
-- ============================================================
-- Preserve legacy single-role matches and match every selected profile role.
create or replace function public.discover_venue_builders(event_filter text,query_text text default '',ecosystem_filter text default '',role_filter text default '',goal_filter text default '',page_number int default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to see opted-in venue check-ins.' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=event_filter) then raise exception 'Choose a verified event.' using errcode='22023'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('profile',r.data,'eventId',r.event_id,'expiresAt',r.expires_at)),'[]') from (
    select p.data,c.event_id,c.expires_at from public.event_checkins c join public.profiles p on p.id=c.user_id
    where c.event_id=event_filter and c.expires_at>now() and p.is_public and p.discoverable
      and (c.user_id=auth.uid() or public.can_interact(c.user_id))
      and (coalesce(query_text,'')='' or p.search_vector @@ websearch_to_tsquery('english',left(query_text,300)))
      and (coalesce(ecosystem_filter,'')='' or p.data->'tags' ? ecosystem_filter)
      and (coalesce(role_filter,'')='' or p.data->>'role'=role_filter or (p.data->'roles') ? role_filter)
      and (coalesce(goal_filter,'')='' or p.data->'lookingFor' ? goal_filter)
    order by c.expires_at desc,p.id limit 24 offset greatest(0,least(coalesce(page_number,0),1000))*24
  ) r);
end $$;
revoke all on function public.discover_venue_builders(text,text,text,text,text,int) from public,anon;
grant execute on function public.discover_venue_builders(text,text,text,text,text,int) to authenticated;

-- ============================================================
-- supabase/migrations/202610260007_connection_emails.sql
-- ============================================================
-- Email the person whose profile was just saved. The database decides who is eligible and
-- claims each receipt in one statement; the server only sends what it was handed.
alter table public.users add column connection_emails boolean not null default true;
alter table public.connection_receipts add column emailed_at timestamptz;
-- Receipts from before this migration are history, not news.
update public.connection_receipts set emailed_at=created_at where emailed_at is null;

create function public.claim_connection_emails(actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  with due as (
    select r.id from public.connection_receipts r
    join public.users u on u.id=r.recipient_id and u.connection_emails
    join auth.users au on au.id=r.recipient_id and au.email is not null and au.email_confirmed_at is not null
    join public.profiles ap on ap.id=r.actor_id and ap.is_public
    join public.profiles rp on rp.id=r.recipient_id and rp.is_public
    where r.actor_id=claim_connection_emails.actor and r.emailed_at is null and r.created_at>now()-interval '1 hour'
      and not exists(select 1 from public.blocked_users b
        where (b.owner_id=r.actor_id and b.blocked_id=r.recipient_id) or (b.owner_id=r.recipient_id and b.blocked_id=r.actor_id))
    order by r.created_at limit 20
    for update of r skip locked
  ), claimed as (
    update public.connection_receipts r set emailed_at=now() from due where r.id=due.id
    returning r.id as receipt_id, r.recipient_id, r.actor_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'receiptId',c.receipt_id,'recipientId',c.recipient_id,'email',au.email,
    'actor',jsonb_build_object('name',coalesce(ap.data->>'name',''),'username',ap.username,
      'headline',coalesce(ap.data->>'headline',''),'avatar',coalesce(ap.data->>'avatar',''))
  )),'[]'::jsonb) into result
  from claimed c join auth.users au on au.id=c.recipient_id join public.profiles ap on ap.id=c.actor_id;
  return result;
end $$;
-- Server-side only: the caller passes the actor id it already authenticated.
revoke all on function public.claim_connection_emails(uuid) from public,anon,authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.claim_connection_emails(uuid) to service_role;
  end if;
end $$;

-- ============================================================
-- supabase/migrations/202610260008_multi_event.sql
-- ============================================================
-- Attending several events: the private list of events a user is attending, alongside the current one.
create or replace function public.sync_workspace(payload jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $
declare actor uuid := auth.uid(); item jsonb; meeting jsonb; p jsonb; person uuid; tag_value text;
canonical_id uuid; original_id uuid; prior jsonb; merged_meetings jsonb; contact_ids jsonb := '{}'::jsonb; begin
  if actor is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  if coalesce(payload->>'activeEventId','')<>'' and not exists(select 1 from public.events where id=payload->>'activeEventId') then raise exception 'Choose a verified event' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(payload->'eventIds','[]')) as picked(id) where not exists(select 1 from public.events where events.id=picked.id)) then raise exception 'Choose a verified event' using errcode='22023'; end if;
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
    insert into public.profile_preferences(owner_id,data) values(actor,jsonb_build_object('bookmarks',coalesce(payload->'bookmarks','[]'), 'eventBookmarks',coalesce(payload->'eventBookmarks','[]'), 'blocked',coalesce(payload->'blocked','[]'), 'activeEventId',coalesce(payload->>'activeEventId',''), 'eventIds',coalesce(payload->'eventIds','[]'))) on conflict(owner_id) do update set data=excluded.data,updated_at=now();
    delete from public.project_bookmarks where owner_id=actor;
    insert into public.project_bookmarks(owner_id,project_id) select actor,p.id from public.projects p where p.id::text in (select jsonb_array_elements_text(coalesce(payload->'bookmarks','[]'))) on conflict do nothing;
    delete from public.event_bookmarks where owner_id=actor;
    insert into public.event_bookmarks(owner_id,event_id) select actor,e.id from public.events e where e.id in (select jsonb_array_elements_text(coalesce(payload->'eventBookmarks','[]'))) on conflict do nothing;
    delete from public.blocked_users where owner_id=actor;
    insert into public.blocked_users(owner_id,blocked_id) select actor,id from public.profiles where id::text in(select jsonb_array_elements_text(coalesce(payload->'blocked','[]'))) and id<>actor on conflict do nothing;
  end if;
  return contact_ids;
end $;
revoke all on function public.sync_workspace(jsonb) from public, anon;
grant execute on function public.sync_workspace(jsonb) to authenticated;

-- ============================================================
-- supabase/seed.sql
-- ============================================================
-- Official event data only. Never seed sample profiles into public discovery.
insert into public.events(id,slug,name,starts_on,ends_on,website,source_url,verified_at,organizer,description) values
('devcon-8','devcon-8-india','Devcon 8 India','2026-11-03','2026-11-06','https://devcon.org/en/','https://devcon.org/en/travel-guide/','2026-10-25T00:00:00+05:30','Ethereum Foundation','Four days with the people building free, open, private, and verifiable systems.'),
('ibw-2026','india-blockchain-week-2026','India Blockchain Week','2026-11-01','2026-11-02','https://indiablockchainweek.com/','https://indiablockchainweek.com/','2026-10-25T00:00:00+05:30','Hashed Emergent','India’s flagship gathering for builders, founders, and investors.'),
('solana-2026','solana-summit-india-2026','Solana Summit India','2026-11-02','2026-11-02','https://www.solanasummit.in/','https://www.solanasummit.in/','2026-10-25T00:00:00+05:30','Superteam India','A day of talks and workshops for founders, developers, and creatives building on Solana.'),
('ethglobal-2026','ethglobal-mumbai-2026','ETHGlobal Mumbai','2026-11-05','2026-11-07','https://ethglobal.com/events/mumbai','https://ethglobal.com/events','2026-10-26T00:00:00+05:30','ETHGlobal','Three days of hacking with Ethereum builders from across India and the world, the same week as Devcon.')
on conflict(id) do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on,source_url=excluded.source_url,verified_at=excluded.verified_at;
insert into public.event_venues(event_id,name,address,city,longitude,latitude) values
('devcon-8','Jio World Convention Centre','G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051','Mumbai',72.8785,19.0632),
('ibw-2026','Fairmont Mumbai','Terminal 2, Chhatrapati Shivaji Maharaj International Airport, Mumbai 400099','Mumbai',72.8745,19.1013),
('solana-2026','JW Marriott Mumbai Sahar','IA Project Road, Andheri East, Mumbai 400099','Mumbai',72.8781,19.1035),
('ethglobal-2026','Jio World Convention Centre','G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051','Mumbai',72.8790,19.0636)
on conflict(event_id) do update set name=excluded.name,address=excluded.address,longitude=excluded.longitude,latitude=excluded.latitude;

