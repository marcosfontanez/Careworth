-- PulseVerse · creator_media_jobs — observability & ops runbook
-- Migrations: 184 (claim + timestamps), 186 (retry + awaiting_post_patch + stale recovery)
-- Worker: scripts/creator-media-worker.mjs

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) Quick snapshot (counts + oldest queued / running hints)
-- ═══════════════════════════════════════════════════════════════════════════
select * from public.creator_media_jobs_ops_snapshot_v1;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) awaiting_post_patch — encode done; worker retrying posts.media_url patch
-- ═══════════════════════════════════════════════════════════════════════════
select id, user_id, kind, attempt_count, max_attempts, next_retry_at, last_error_code,
       left(coalesce(error, ''), 200) as err,
       updated_at
from public.creator_media_jobs
where status = 'awaiting_post_patch'
order by updated_at asc
limit 40;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) Oldest queued (respects next_retry_at — worker skips until time passes)
-- ═══════════════════════════════════════════════════════════════════════════
select id, user_id, kind, created_at, attempt_count, max_attempts, next_retry_at,
       last_error_code, left(coalesce(error, ''), 160) as err
from public.creator_media_jobs
where status = 'queued'
  and kind in ('stitch', 'broll')
order by coalesce(next_retry_at, created_at) asc, created_at asc
limit 40;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) Stuck in running (tune interval; worker auto-recovers via recover_stale_creator_media_jobs)
-- ═══════════════════════════════════════════════════════════════════════════
select id, user_id, kind, encode_complete, attempt_count,
       started_at, updated_at,
       extract(epoch from (now() - started_at)) / 60 as running_minutes
from public.creator_media_jobs
where status = 'running'
  and started_at is not null
  and started_at < now() - interval '45 minutes'
order by started_at asc;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5) Inspect jobs tied to a post (replace POST_UUID)
-- ═══════════════════════════════════════════════════════════════════════════
-- select j.*
-- from public.creator_media_jobs j
-- where j.input->>'target_post_id' = 'POST_UUID'
-- order by j.created_at desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6) Inspect posts stuck queued/running/failed for concat pipeline
-- ═══════════════════════════════════════════════════════════════════════════
select id, creator_id, media_processing_status, media_processing_job_id,
       left(coalesce(media_processing_error, ''), 160) as err, created_at
from public.posts
where media_processing_status in ('queued', 'running', 'failed')
order by created_at desc
limit 60;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7) Retry a FAILED job manually (review row first; bumps attempt semantics on next claim)
-- ═══════════════════════════════════════════════════════════════════════════
-- update public.creator_media_jobs
-- set status = 'queued',
--     next_retry_at = now(),
--     started_at = null,
--     completed_at = null,
--     error = coalesce(error, '') || E'\n[manual_retry ' || now()::text || ']',
--     updated_at = now()
-- where id = 'JOB_UUID'::uuid
--   and status = 'failed';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8) Reset a stuck RUNNING job (prefer worker RPC below; use SQL only if RPC unavailable)
-- ═══════════════════════════════════════════════════════════════════════════
-- update public.creator_media_jobs
-- set status = case when encode_complete and output is not null then 'awaiting_post_patch' else 'queued' end,
--     started_at = null,
--     next_retry_at = now(),
--     last_error_code = coalesce(nullif(trim(last_error_code), ''), 'MANUAL_RESET_RUNNING'),
--     error = left(coalesce(error, '') || E'\n[manual_reset_running ' || now()::text || ']', 2000),
--     updated_at = now()
-- where id = 'JOB_UUID'::uuid
--   and status = 'running';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9) Stale-running sweep (service_role / postgres). Default 2700s = 45 minutes.
--    Worker calls this at startup; optional nightly cron in Supabase.
-- ═══════════════════════════════════════════════════════════════════════════
-- select public.recover_stale_creator_media_jobs(2700);

-- ═══════════════════════════════════════════════════════════════════════════
-- 10) Repair post media_url when job succeeded but patch missed (use output.storagePath)
-- ═══════════════════════════════════════════════════════════════════════════
-- Verify job.output JSON contains bucket + storagePath, then patch posts.media_url from public URL.
