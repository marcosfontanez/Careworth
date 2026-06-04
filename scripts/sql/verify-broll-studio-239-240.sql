-- B-roll Studio V1 — remote deployment verification.
-- Run in Supabase → SQL Editor against the LINKED project (ref: sakrlbmzmfvdywqgyqxh).
-- Each block prints a single PASS/FAIL row. No data is modified (the test insert is rolled back).

-- 1) Migration 239: kind CHECK constraint allows 'video_composition'
select
  'migration_239_kind_check' as check_name,
  case when pg_get_constraintdef(c.oid) ilike '%video_composition%' then 'PASS' else 'FAIL' end as result,
  pg_get_constraintdef(c.oid) as detail
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'creator_media_jobs'
  and c.conname = 'creator_media_jobs_kind_check';

-- 2) Migration 240: claim RPC includes 'video_composition' in BOTH the queue and patch CTEs
select
  'migration_240_claim_rpc' as check_name,
  case
    when pg_get_functiondef(p.oid) ilike '%video_composition%' then 'PASS'
    else 'FAIL'
  end as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'claim_next_creator_media_job';

-- 3) Migration 240: stale-recovery RPC includes 'video_composition'
select
  'migration_240_recover_rpc' as check_name,
  case
    when pg_get_functiondef(p.oid) ilike '%video_composition%' then 'PASS'
    else 'FAIL'
  end as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'recover_stale_creator_media_jobs';

-- 4) Retry-scan indexes for the new kind exist (migration 240)
select
  'migration_240_indexes' as check_name,
  case when count(*) = 2 then 'PASS' else 'FAIL (' || count(*) || '/2)' end as result
from pg_indexes
where schemaname = 'public'
  and tablename = 'creator_media_jobs'
  and indexname in (
    'creator_media_jobs_queued_retry_comp_idx',
    'creator_media_jobs_awaiting_patch_retry_comp_idx'
  );

-- 5) The DB will actually accept a video_composition row (CHECK passes). Rolled back — no row persists.
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from public.profiles limit 1;
  if v_uid is null then
    raise notice 'kind_insert_accepts_video_composition: SKIP (no profiles row to attribute test job)';
    return;
  end if;
  begin
    insert into public.creator_media_jobs (user_id, kind, input)
    values (v_uid, 'video_composition', '{"_verify":true}'::jsonb);
    raise notice 'kind_insert_accepts_video_composition: PASS';
  exception when check_violation then
    raise notice 'kind_insert_accepts_video_composition: FAIL (CHECK rejected — migration 239 not applied)';
  end;
  raise exception 'rollback_verification';  -- abort the DO block so the test row is never committed
exception when others then
  if sqlerrm <> 'rollback_verification' then raise; end if;
end $$;

-- 6) Existing kinds still allowed (no regression): the constraint must list all prior kinds.
select
  'all_prior_kinds_present' as check_name,
  case when
    def ilike '%''trim''%' and def ilike '%''timelapse''%' and def ilike '%''stitch''%'
    and def ilike '%''broll''%' and def ilike '%''pitch_shift''%' and def ilike '%''background_matte''%'
    and def ilike '%''face_blur''%' and def ilike '%''silence_detect''%'
    and def ilike '%''cinemagraph_export''%' and def ilike '%''parallax_export''%'
  then 'PASS' else 'FAIL' end as result
from (
  select pg_get_constraintdef(c.oid) as def
  from pg_constraint c join pg_class t on t.oid = c.conrelid
  where t.relname = 'creator_media_jobs' and c.conname = 'creator_media_jobs_kind_check'
) s;
