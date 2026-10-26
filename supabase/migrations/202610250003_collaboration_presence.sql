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
