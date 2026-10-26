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
