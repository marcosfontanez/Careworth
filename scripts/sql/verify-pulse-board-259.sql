-- Pulse Board migration 259 verification (run in Supabase SQL Editor or via CLI)
select json_build_object(
  'table_exists',
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profile_board_shoutouts'
  ),
  'pulse_board_enabled_col',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_board_enabled'
  ),
  'pulse_board_posting_mode_col',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_board_posting_mode'
  ),
  'post_rpc',
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'post_profile_board_shoutout'
  ),
  'moderate_rpc',
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'moderate_profile_board_shoutout'
  ),
  'rls_enabled',
  coalesce(
    (select c.relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'profile_board_shoutouts'),
    false
  ),
  'migration_259_recorded',
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '259'
  )
) as pulse_board_259_check;
