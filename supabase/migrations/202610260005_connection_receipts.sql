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
