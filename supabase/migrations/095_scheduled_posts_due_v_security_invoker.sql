-- Supabase linter: default PG15+ views use definer-style checks (security_invoker off),
-- which bypasses the querying user's RLS on underlying tables. Force invoker semantics
-- so permissions match whoever reads the view (cron uses service_role and still works).

create or replace view public.scheduled_posts_due_v1
with (security_invoker = true) as
select id
  from public.posts
 where scheduled_status = 'scheduled'
   and scheduled_at is not null
   and scheduled_at <= now();

comment on view public.scheduled_posts_due_v1 is
  'Posts whose scheduled_at has passed and are still queued. Cron edge function flips them to live. SECURITY INVOKER (RLS respected per caller).';
