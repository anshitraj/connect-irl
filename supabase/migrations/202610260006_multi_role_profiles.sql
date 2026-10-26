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
