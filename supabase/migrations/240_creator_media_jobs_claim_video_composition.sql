-- B-roll Studio V1 blocker fix: the worker claim + stale-recovery RPCs filtered
-- `kind in ('stitch','broll'[,'trim'])`, so `video_composition` jobs were enqueued
-- but NEVER picked up — posts would sit in "processing" forever. Recreate both
-- RPCs with `video_composition` included. Behavior for existing kinds is unchanged.

create or replace function public.claim_next_creator_media_job()
returns setof public.creator_media_jobs
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  with picked_patch as (
    select j.id
    from public.creator_media_jobs j
    where j.status = 'awaiting_post_patch'
      and j.encode_complete = true
      and j.output is not null
      and j.kind in ('stitch', 'broll', 'trim', 'video_composition')
      and (j.next_retry_at is null or j.next_retry_at <= now())
      and j.attempt_count < j.max_attempts
    order by j.updated_at asc
    for update skip locked
    limit 1
  ),
  picked_queue as (
    select j.id
    from public.creator_media_jobs j
    where j.status = 'queued'
      and j.kind in ('stitch', 'broll', 'trim', 'video_composition')
      and (j.next_retry_at is null or j.next_retry_at <= now())
      and j.attempt_count < j.max_attempts
    order by j.created_at asc
    for update skip locked
    limit 1
  ),
  use_row as (
    select id from picked_patch
    union all
    select id from picked_queue
    where not exists (select 1 from picked_patch)
    limit 1
  )
  update public.creator_media_jobs c
  set
    status = 'running',
    updated_at = now(),
    started_at = case
      when c.status = 'awaiting_post_patch' then coalesce(c.started_at, now())
      else now()
    end,
    attempt_count = c.attempt_count + 1,
    next_retry_at = null
  from use_row u
  where c.id = u.id
  returning c.*;
end;
$$;

comment on function public.claim_next_creator_media_job() is
  'Service-role worker: claims oldest awaiting_post_patch (retry) or queued stitch/broll/trim/video_composition job. SKIP LOCKED.';

revoke all on function public.claim_next_creator_media_job() from public;
grant execute on function public.claim_next_creator_media_job() to service_role;

create or replace function public.recover_stale_creator_media_jobs(p_after_seconds integer default 2700)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n int := 0;
begin
  if p_after_seconds is null or p_after_seconds < 300 then
    raise exception 'p_after_seconds must be >= 300';
  end if;

  update public.creator_media_jobs j
  set
    status = case
      when j.encode_complete and j.output is not null then 'awaiting_post_patch'::text
      else 'queued'::text
    end,
    started_at = null,
    next_retry_at = now(),
    last_error_code = coalesce(j.last_error_code, 'STALE_RUNNING_RECOVERED'),
    error = left(
      coalesce(j.error, '')
      || case when coalesce(trim(j.error), '') = '' then '' else E'\n' end
      || '[recover_stale_creator_media_jobs] moved out of stale running at '
      || now()::text,
      2000
    ),
    updated_at = now()
  where j.status = 'running'
    and j.kind in ('stitch', 'broll', 'trim', 'video_composition')
    and j.started_at is not null
    and j.started_at < now() - make_interval(secs => p_after_seconds);

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.recover_stale_creator_media_jobs(integer) is
  'Service-role: requeues stitch/broll/trim/video_composition rows stuck in running longer than p_after_seconds (default 45m).';

revoke all on function public.recover_stale_creator_media_jobs(integer) from public;
grant execute on function public.recover_stale_creator_media_jobs(integer) to service_role;

-- Retry-scan partial indexes for the new kind (mirrors the stitch/broll indexes from migration 186).
create index if not exists creator_media_jobs_queued_retry_comp_idx
  on public.creator_media_jobs (status, next_retry_at asc, created_at asc)
  where status = 'queued' and kind = 'video_composition';

create index if not exists creator_media_jobs_awaiting_patch_retry_comp_idx
  on public.creator_media_jobs (status, next_retry_at asc, updated_at asc)
  where status = 'awaiting_post_patch' and kind = 'video_composition';
