-- Pulse Board migrations 264–266 verification
select json_build_object(
  'm264_recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '264'),
  'm265_recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '265'),
  'm266_recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '266'),
  'archived_at_col', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profile_board_shoutouts' and column_name = 'archived_at'
  ),
  'auto_archive_fn', to_regprocedure('public.apply_pulse_board_auto_archive(uuid)') is not null,
  'viewer_can_view_pulse_board', to_regprocedure('public.viewer_can_view_pulse_board(uuid)') is not null,
  'get_profile_board_shoutouts_volatile', coalesce((
    select p.provolatile = 'v'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_profile_board_shoutouts'
    limit 1
  ), false),
  'posts_viewer_safe_video_overlay_style', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts_viewer_safe' and column_name = 'video_overlay_style'
  ),
  'board_list_ignores_privacy_mode', coalesce((
    select pg_get_functiondef(p.oid) not ilike '%privacy_mode%'
       and pg_get_functiondef(p.oid) ilike '%viewer_can_view_pulse_board%'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_profile_board_shoutouts'
    limit 1
  ), false)
) as pulse_board_264_266_check;
