-- Creator media worker: observability timestamps + atomic claim (SKIP LOCKED).
-- Requires worker update to call claim_next_creator_media_job() instead of SELECT+UPDATE.

alter table public.creator_media_jobs
  add column if not exists started_at timestamptz;

alter table public.creator_media_jobs
  add column if not exists completed_at timestamptz;

comment on column public.creator_media_jobs.started_at is
  'When a worker transitioned the row from queued → running.';
comment on column public.creator_media_jobs.completed_at is
  'When status became succeeded or failed (null while queued/running).';

create index if not exists creator_media_jobs_status_created_idx
  on public.creator_media_jobs (status, created_at asc);

create index if not exists creator_media_jobs_stuck_running_idx
  on public.creator_media_jobs (started_at asc)
  where status = 'running';

-- One queued stitch/broll row → running; concurrent workers cannot claim the same row.
create or replace function public.claim_next_creator_media_job()
returns setof public.creator_media_jobs
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  return query
  update public.creator_media_jobs c
  set
    status = 'running',
    updated_at = now(),
    started_at = now()
  from (
    select id
    from public.creator_media_jobs
    where status = 'queued'
      and kind in ('stitch', 'broll')
    order by created_at asc
    for update skip locked
    limit 1
  ) picked
  where c.id = picked.id
  returning c.*;
end;
$$;

comment on function public.claim_next_creator_media_job() is
  'Service-role worker only: atomically claims oldest queued stitch/broll job. Returns 0 or 1 row.';

revoke all on function public.claim_next_creator_media_job() from public;
grant execute on function public.claim_next_creator_media_job() to service_role;

-- Single-row snapshot for SQL editor / admin checks (no per-user RLS; restrict who can SELECT).
drop view if exists public.creator_media_jobs_ops_snapshot_v1;
create view public.creator_media_jobs_ops_snapshot_v1 as
select
  (select count(*)::bigint from public.creator_media_jobs where status = 'queued') as queued_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'running') as running_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'failed') as failed_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'succeeded') as succeeded_count,
  (select count(*)::bigint from public.creator_media_jobs where status = 'cancelled') as cancelled_count,
  (select min(created_at) from public.creator_media_jobs where status = 'queued') as oldest_queued_at,
  (select max(created_at) from public.creator_media_jobs where status = 'queued') as newest_queued_at,
  (select min(started_at) from public.creator_media_jobs where status = 'running') as oldest_running_started_at;

revoke all on public.creator_media_jobs_ops_snapshot_v1 from public;
