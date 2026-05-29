-- Verification queries after migrations 190-214

-- 1) posts clip source columns (210)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'posts'
  and column_name in ('source_post_id', 'clip_start_seconds', 'clip_end_seconds')
order by column_name;

-- 2) creator clip permission fields (212)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('posts', 'profiles')
  and column_name in (
    'allow_viewer_clips',
    'allow_remix',
    'allow_clip_downloads',
    'default_allow_viewer_clips',
    'default_allow_remix',
    'default_allow_clip_downloads'
  )
order by table_name, column_name;

-- 3) source_creator_id (213)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'posts'
  and column_name = 'source_creator_id';

-- 4) clip_gift_attributions (214)
select to_regclass('public.clip_gift_attributions') as clip_gift_attributions_table;
select key, value->>'payout_mode' as payout_mode
from public.economy_settings
where key = 'clip_gift_split';

-- 5) creator_media_jobs trim kind + target_post_id JSON usage (207 + pre-existing input)
select kind, count(*) as job_count
from public.creator_media_jobs
group by kind
order by kind;

select exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'claim_next_creator_media_job'
    and pg_get_functiondef(p.oid) like '%trim%'
) as claim_includes_trim;

-- 6) get_ranked_feed_v2 failed-processing exclusion (211)
select exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_ranked_feed_v2'
    and pg_get_functiondef(p.oid) like '%failed%'
) as feed_v2_excludes_failed;

-- 7) migration history 190-214
select version, name
from supabase_migrations.schema_migrations
where version::int >= 190
order by version::int;
