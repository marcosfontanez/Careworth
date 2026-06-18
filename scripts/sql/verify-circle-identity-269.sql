-- Circle identity foundation — migration 269 verification
-- Run: npx supabase db query --linked -f scripts/sql/verify-circle-identity-269.sql

select json_build_object(
  'migration_269_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '269'),
  'communities_metadata_column',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'communities' and column_name = 'metadata'
  ),
  'circle_threads_flair_tag_column',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'circle_threads' and column_name = 'flair_tag'
  ),
  'community_thread_pins_table',
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'community_thread_pins'
  ),
  'viewer_safe_flair_tag',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'circle_threads_viewer_safe' and column_name = 'flair_tag'
  ),
  'top_helpers_rpc',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_circle_top_helpers'
  ),
  'thread_pins_rls',
  exists (
    select 1 from pg_policy pol
    join pg_class rel on rel.oid = pol.polrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'community_thread_pins'
      and pol.polname = 'Community thread pins are viewable by everyone'
  )
) as circle_identity_269_check;
