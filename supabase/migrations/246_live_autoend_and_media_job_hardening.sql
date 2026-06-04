-- ============================================================
-- PulseVerse: Live auto-end + creator media job integrity (launch readiness)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Auto-end ghost live streams.
-- A host crash / app kill leaves status = 'live' forever, so the row keeps
-- showing in "Happening Now" even though discovery already treats it as
-- host_stale (45m, migration 200). This function flips those ghosts to ended
-- so the data matches what viewers can actually join.
--
-- Schedule it (see CREATOR_MEDIA_WORKER_DEPLOY / LAUNCH_RUNBOOK): either a
-- pg_cron job every minute, or a scheduled Edge Function calling this RPC with
-- the service role. It is safe to run frequently and is idempotent.
-- ------------------------------------------------------------
create or replace function public.end_stale_live_streams(p_stale_after interval default interval '45 minutes')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  ended_count int;
begin
  with stale as (
    update public.live_streams
    set status = 'ended',
        ended_at = now(),
        viewer_count = 0
    where status = 'live'
      and ended_at is null
      and coalesce(host_last_seen_at, broadcast_started_at, started_at, created_at)
            < now() - p_stale_after
    returning id
  )
  select count(*) into ended_count from stale;

  -- Deactivate polls belonging to the streams we just ended.
  update public.stream_polls sp
  set is_active = false
  where sp.is_active = true
    and exists (
      select 1 from public.live_streams ls
      where ls.id::text = sp.stream_id
        and ls.status = 'ended'
        and ls.ended_at >= now() - interval '5 minutes'
    );

  return coalesce(ended_count, 0);
end;
$$;

comment on function public.end_stale_live_streams(interval) is
  'Service-role/cron cleanup: ends live_streams whose host heartbeat is older than the stale window (default 45m) so Happening Now never shows ghost broadcasts.';

revoke all on function public.end_stale_live_streams(interval) from public;
grant execute on function public.end_stale_live_streams(interval) to service_role;

-- ------------------------------------------------------------
-- 2) creator_media_jobs: clients must not forge job state.
-- The original UPDATE policy (migration 093) had USING (auth.uid() = user_id)
-- with NO with-check, so an owner could PATCH their own row to
-- status = 'succeeded' + arbitrary output and bypass the worker entirely.
-- The worker runs as service_role (bypasses RLS), so we can safely restrict the
-- owner to only cancelling a still-pending job.
-- ------------------------------------------------------------
drop policy if exists creator_media_jobs_update_own on public.creator_media_jobs;

create policy creator_media_jobs_update_own
  on public.creator_media_jobs
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    -- Owners may only leave a job queued or cancel it. running/succeeded/failed
    -- are worker-only transitions (service_role bypasses RLS).
    and status in ('queued', 'cancelled')
  );

-- ------------------------------------------------------------
-- 3) Block queuing of job kinds the worker does not implement.
-- The worker (scripts/creator-media-worker.mjs) implements: trim, stitch,
-- broll, video_composition. The other kinds in the CHECK constraint are
-- roadmap placeholders; queuing them strands a job in 'queued' forever.
-- Enforce the implemented set on direct client inserts via the insert policy.
-- (The enqueue Edge Function's allow-list is tightened to match.)
-- ------------------------------------------------------------
drop policy if exists creator_media_jobs_insert_own on public.creator_media_jobs;

create policy creator_media_jobs_insert_own
  on public.creator_media_jobs
  for insert
  with check (
    auth.uid() = user_id
    and kind in ('trim', 'stitch', 'broll', 'video_composition')
  );
