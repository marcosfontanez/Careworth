-- Supabase Security Advisor: creator_media_jobs_ops_snapshot_v1 must not run as SECURITY DEFINER.
-- Recreate explicitly as SECURITY INVOKER (PG15+: WITH (security_invoker = true)).

drop view if exists public.creator_media_jobs_ops_snapshot_v1;

create view public.creator_media_jobs_ops_snapshot_v1
with (security_invoker = true)
as
select
  (select count(*)::bigint from public.creator_media_jobs where status = 'queued') as queued_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'running') as running_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'awaiting_post_patch')
    as awaiting_post_patch_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'failed') as failed_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'succeeded') as succeeded_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'cancelled') as cancelled_count,
  (select min(created_at) from public.creator_media_jobs where status = 'queued') as oldest_queued_at,
  (select max(created_at) from public.creator_media_jobs where status = 'queued') as newest_queued_at,
  (select min(started_at) from public.creator_media_jobs where status = 'running') as oldest_running_started_at,
  (select min(next_retry_at) from public.creator_media_jobs where status = 'queued' and next_retry_at is not null)
    as next_queued_retry_at;

revoke all on public.creator_media_jobs_ops_snapshot_v1 from public;
