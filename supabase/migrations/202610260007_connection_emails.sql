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
