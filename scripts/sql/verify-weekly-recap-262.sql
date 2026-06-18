-- My Pulse weekly recap migration 262 verification
-- Run in Supabase SQL Editor or: npx supabase db query --linked -f scripts/sql/verify-weekly-recap-262.sql

select json_build_object(
  'migration_262_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '262'),
  'migration_258_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '258'),
  'recap_rpc_exists',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'
  ),
  'recap_rpc_security_definer',
  coalesce(
    (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap' limit 1),
    false
  ),
  'viewer_is_staff_helper',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'viewer_is_staff'
  ),
  'pulse_status_columns',
  json_build_object(
    'pulse_status_text',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_text'
    ),
    'pulse_status_emoji',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_emoji'
    ),
    'pulse_status_updated_at',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_updated_at'
    )
  ),
  'grants',
  json_build_object(
    'authenticated_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_my_pulse_weekly_recap'
        and rp.grantee = 'authenticated' and rp.privilege_type = 'EXECUTE'
    ),
    'public_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_my_pulse_weekly_recap'
        and rp.grantee = 'PUBLIC' and rp.privilege_type = 'EXECUTE'
    ),
    'anon_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_my_pulse_weekly_recap'
        and rp.grantee = 'anon' and rp.privilege_type = 'EXECUTE'
    )
  ),
  'rpc_guards',
  json_build_object(
    'requires_auth_uid',
    (select prosrc like '%not authenticated%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'blocks_cross_user_unless_staff',
    (select prosrc like '%viewer_is_staff()%' and prosrc like '%not allowed%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'excludes_anonymous_posts',
    (select prosrc like '%is_anonymous%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'excludes_failed_processing',
    (select prosrc like '%media_processing_status%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'shoutouts_active_only',
    (select prosrc like '%profile_board_shoutouts%' and prosrc like '%status = ''active''%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'shoutouts_block_filter',
    (select prosrc like '%blocked_users%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap')
  ),
  'dependencies',
  json_build_object(
    'posts_creator_id',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'creator_id'),
    'posts_scheduled_status',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'scheduled_status'),
    'posts_media_processing_status',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'posts' and column_name = 'media_processing_status'),
    'profile_board_shoutouts_table',
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profile_board_shoutouts'),
    'profile_updates_is_pinned',
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profile_updates' and column_name = 'is_pinned'),
    'follows_table',
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'follows')
  )
) as weekly_recap_262_check;

-- Optional runtime auth smoke (replace UUID with a real owner id):
-- select set_config('request.jwt.claims', json_build_object('sub', '<owner-uuid>', 'role', 'authenticated')::text, true);
-- select public.get_my_pulse_weekly_recap('<owner-uuid>');

