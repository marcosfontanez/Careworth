-- Verify Pulse Board Phase 2B (pin + notify)
select json_build_object(
  'post_has_notify', (
    select prosrc like '%pulse_board_shoutout%'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'post_profile_board_shoutout'
  ),
  'moderate_has_pin', (
    select prosrc like '%v_action = ''pin''%'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'moderate_profile_board_shoutout'
  ),
  'migration_261_recorded', exists (
    select 1 from supabase_migrations.schema_migrations where version = '261'
  )
) as pulse_board_2b_check;
