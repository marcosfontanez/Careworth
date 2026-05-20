-- Creator media worker: bounded retries, post-patch intermediate state, stale-running recovery.

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------
alter table public.creator_media_jobs
  add column if not exists attempt_count integer not null default 0;

alter table public.creator_media_jobs
  add column if not exists max_attempts integer not null default 5;

alter table public.creator_media_jobs
  add column if not exists last_error_code text;

alter table public.creator_media_jobs
  add column if not exists next_retry_at timestamptz;

alter table public.creator_media_jobs
  add column if not exists encode_complete boolean not null default false;

comment on column public.creator_media_jobs.attempt_count is
  'Incremented each time claim_next_creator_media_job assigns the row to a worker (encode or post-patch retry).';
comment on column public.creator_media_jobs.max_attempts is
  'Upper bound on worker pickups for this row; exceeded → permanent failed.';
comment on column public.creator_media_jobs.last_error_code is
  'Machine-oriented classifier (e.g. TRANSIENT_DOWNLOAD, POST_PATCH_FAILED, FFMPEG_TIMEOUT).';
comment on column public.creator_media_jobs.next_retry_at is
  'When status is queued or awaiting_post_patch, worker ignores row until this time (bounded backoff).';
comment on column public.creator_media_jobs.encode_complete is
  'True once ffmpeg output has been uploaded and output jsonb is populated; worker may only patch posts.';

create index if not exists creator_media_jobs_queued_retry_idx
  on public.creator_media_jobs (status, next_retry_at asc, created_at asc)
  where status = 'queued' and kind in ('stitch', 'broll');

create index if not exists creator_media_jobs_awaiting_patch_retry_idx
  on public.creator_media_jobs (status, next_retry_at asc, updated_at asc)
  where status = 'awaiting_post_patch' and kind in ('stitch', 'broll');

-- ---------------------------------------------------------------------------
-- Status: add awaiting_post_patch
-- ---------------------------------------------------------------------------
alter table public.creator_media_jobs drop constraint if exists creator_media_jobs_status_check;

alter table public.creator_media_jobs
  add constraint creator_media_jobs_status_check
  check (
    status in (
      'queued',
      'running',
      'awaiting_post_patch',
      'succeeded',
      'failed',
      'cancelled'
    )
  );

-- ---------------------------------------------------------------------------
-- Atomic claim: prefer post-patch retries, then fresh queued encode jobs.
-- ---------------------------------------------------------------------------
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
      and j.kind in ('stitch', 'broll')
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
      and j.kind in ('stitch', 'broll')
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
  'Service-role worker: claims oldest awaiting_post_patch (retry) or queued stitch/broll job. SKIP LOCKED.';

-- ---------------------------------------------------------------------------
-- Stale running recovery (worker calls at startup; optional cron via SQL editor).
-- Does not touch fresh jobs: threshold required.
-- ---------------------------------------------------------------------------
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
    and j.kind in ('stitch', 'broll')
    and j.started_at is not null
    and j.started_at < now() - make_interval(secs => p_after_seconds);

  get diagnostics n = row_count;
  return n;
end;
$$;

comment on function public.recover_stale_creator_media_jobs(integer) is
  'Service-role: requeues stitch/broll rows stuck in running longer than p_after_seconds (default 45m).';

revoke all on function public.recover_stale_creator_media_jobs(integer) from public;
grant execute on function public.recover_stale_creator_media_jobs(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Ops snapshot: include awaiting_post_patch + retry/backoff visibility
-- ---------------------------------------------------------------------------
-- Postgres: CREATE OR REPLACE VIEW cannot insert/rename columns in the middle
-- of an existing view (42P16). Drop first when changing column order/names.
drop view if exists public.creator_media_jobs_ops_snapshot_v1;

-- SECURITY INVOKER: aggregate counts respect RLS of the querying role (Supabase advisor).
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
