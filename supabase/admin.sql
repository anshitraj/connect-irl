-- Run only in the Supabase SQL Editor as the deployment administrator.
-- No client-side admin flags or browser administrative credentials.
select id, created_at, profile_id, project_id, reason, status from public.reports where status='pending' order by created_at;
select id, created_at, name, url, notes, status from public.event_submissions where status='pending' order by created_at;
-- After reviewing a specific record, use a parameterized WHERE id = <reviewed UUID>.
-- update public.reports set status='reviewed' where id='<reviewed UUID>';
-- update public.event_submissions set status='approved' where id='<reviewed UUID>';
-- Hide a problematic public listing after review:
-- update public.profiles set is_public=false,discoverable=false,data=jsonb_set(jsonb_set(data,'{public}','false'),'{discoverable}','false') where id='<reviewed UUID>';
-- update public.projects set is_public=false,data=jsonb_set(data,'{public}','false') where id='<reviewed UUID>';
-- Approved events must be verified from organizer sources, then inserted into events /
-- event_venues and the shared src/lib/events.ts catalog in the same deployment.
-- Expired presence is already invisible through RLS; remove old rows periodically:
-- delete from public.event_checkins where expires_at < now() - interval '7 days';
