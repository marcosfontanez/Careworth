-- Migration drift audit: verify remote schema for migrations 243–257 and 264–266
-- Run: npx supabase db query --linked --file scripts/sql/verify-migration-drift-243-266.sql
-- Or paste into Supabase Dashboard → SQL Editor

select json_build_object(
  'audit_at', now() at time zone 'utc',
  'm243', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '243'),
    'user_push_tokens_table', to_regclass('public.user_push_tokens') is not null,
    'profiles_push_token_dropped', not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'push_token'
    ),
    'rls_enabled', coalesce((
      select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'user_push_tokens'
    ), false)
  ),
  'm244', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '244'),
    'comments_insert_policy', exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'comments' and policyname = 'Users can create comments'
    ),
    'policy_has_comments_disabled_guard', coalesce((
      select pg_get_expr(pol.polqual, pol.polrelid) ilike '%comments_disabled%'
         or pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%comments_disabled%'
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'comments' and pol.polname = 'Users can create comments'
    ), false)
  ),
  'm245', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '245'),
    'current_user_role_admin', to_regprocedure('public.current_user_role_admin()') is not null,
    'anon_lacks_role_admin_grant', not has_column_privilege('anon', 'public.profiles', 'role_admin', 'SELECT')
  ),
  'm246', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '246'),
    'end_stale_live_streams', to_regprocedure('public.end_stale_live_streams(interval)') is not null,
    'media_jobs_update_policy', exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'creator_media_jobs' and policyname = 'creator_media_jobs_update_own'
    ),
    'media_jobs_insert_kind_guard', coalesce((
      select pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%video_composition%'
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'creator_media_jobs' and pol.polname = 'creator_media_jobs_insert_own'
    ), false)
  ),
  'm247', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '247'),
    'admin_list_profiles', to_regprocedure('public.admin_list_profiles(text, boolean, integer)') is not null,
    'authenticated_lacks_role_admin_grant', not has_column_privilege('authenticated', 'public.profiles', 'role_admin', 'SELECT')
  ),
  'm248', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '248'),
    'purchase_receipts_refunded_at', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'purchase_receipts' and column_name = 'refunded_at'
    ),
    'economy_revoke_purchase', to_regprocedure('public.economy_revoke_purchase(text, text, text)') is not null
  ),
  'm249', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '249'),
    'economy_assert_gift_not_blocked', to_regprocedure('public.economy_assert_gift_not_blocked(uuid, uuid)') is not null,
    'creator_gifts_block_trigger', exists (
      select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where c.relname = 'creator_gifts' and t.tgname = 'creator_gifts_block_guard' and not t.tgisinternal
    ),
    'border_gifts_block_trigger', exists (
      select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
      where c.relname = 'border_gifts' and t.tgname = 'border_gifts_block_guard' and not t.tgisinternal
    )
  ),
  'm250', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '250'),
    'posts_policy_uses_viewer_is_staff', coalesce((
      select pg_get_expr(pol.polqual, pol.polrelid) ilike '%viewer_is_staff%'
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'posts'
        and pol.polname = 'Posts viewable with anonymous author guard'
    ), false),
    'admin_delete_posts_uses_rpc', coalesce((
      select pg_get_expr(pol.polqual, pol.polrelid) ilike '%current_user_role_admin%'
      from pg_policy pol
      join pg_class c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'posts'
        and pol.polname = 'Admins can delete posts for moderation'
    ), false)
  ),
  'm251', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '251'),
    'reward_enqueue_has_top5_path', coalesce((
      select pg_get_functiondef(p.oid) ilike '%user_monthly_pulse_scores%'
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'reward_delivery_enqueue_client'
      limit 1
    ), false)
  ),
  'm252', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '252'),
    'profiles_default_allow_clip_downloads_true', (
      select column_default ilike '%true%'
      from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'default_allow_clip_downloads'
    ),
    'posts_allow_clip_downloads_default_true', (
      select column_default ilike '%true%'
      from information_schema.columns
      where table_schema = 'public' and table_name = 'posts' and column_name = 'allow_clip_downloads'
    )
  ),
  'm253', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '253'),
    'june_2026_frames', (
      select count(*) from public.pulse_avatar_frames
      where slug in ('2026-06-gold', '2026-06-silver', '2026-06-bronze')
    )
  ),
  'm254', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '254'),
    'audience_role_col', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'audience_role'
    ),
    'onboarding_completed_at_col', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_completed_at'
    ),
    'communities_onboarding_topics', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communities' and column_name = 'onboarding_topics'
    ),
    'authenticated_can_read_audience_role', has_column_privilege('authenticated', 'public.profiles', 'audience_role', 'SELECT')
  ),
  'm255', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '255'),
    'feed_interest_match_topics', to_regprocedure('public.feed_interest_match_topics(text)') is not null,
    'feed_v3_uses_interest_topics', coalesce((
      select pg_get_functiondef(p.oid) ilike '%feed_interest_match_topics%'
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_ranked_feed_v3'
      limit 1
    ), false)
  ),
  'm256', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '256'),
    'note', 'grant-only migration — verify via m254 authenticated_can_read_audience_role'
  ),
  'm257', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '257'),
    'admin_economy_pipeline_summary', to_regprocedure('public.admin_economy_pipeline_summary(integer)') is not null
  ),
  'm264', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '264'),
    'archived_at_col', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profile_board_shoutouts' and column_name = 'archived_at'
    ),
    'apply_pulse_board_auto_archive', to_regprocedure('public.apply_pulse_board_auto_archive(uuid)') is not null,
    'idx_owner_public', exists (
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'idx_profile_board_shoutouts_owner_public'
    )
  ),
  'm265', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '265'),
    'viewer_can_view_pulse_board', to_regprocedure('public.viewer_can_view_pulse_board(uuid)') is not null,
    'board_list_uses_board_visibility', coalesce((
      select pg_get_functiondef(p.oid) ilike '%viewer_can_view_pulse_board%'
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_profile_board_shoutouts'
      limit 1
    ), false)
  ),
  'm266', json_build_object(
    'recorded', exists (select 1 from supabase_migrations.schema_migrations where version = '266'),
    'get_profile_board_shoutouts_volatile', coalesce((
      select p.provolatile = 'v'
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_profile_board_shoutouts'
      limit 1
    ), false),
    'posts_viewer_safe_has_video_overlay_style', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts_viewer_safe' and column_name = 'video_overlay_style'
    )
  ),
  'gap_summary', (
    select json_agg(version order by version)
    from supabase_migrations.schema_migrations
    where version::int between 243 and 257 or version::int between 264 and 266
  )
) as migration_drift_audit;
