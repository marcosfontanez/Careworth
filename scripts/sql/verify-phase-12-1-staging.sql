-- Phase 12.1 staging schema verification (run linked to staging only)
select json_build_object(
  'onboarding_columns', json_build_object(
    'audience_role', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'audience_role'
    ),
    'onboarding_completed_at', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'onboarding_completed_at'
    ),
    'communities_onboarding_topics', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'communities' and column_name = 'onboarding_topics'
    )
  ),
  'pulse_status_columns', json_build_object(
    'pulse_status_text', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_text'
    ),
    'pulse_status_emoji', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_emoji'
    ),
    'pulse_status_updated_at', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = 'pulse_status_updated_at'
    )
  ),
  'profile_board_shoutouts', json_build_object(
    'table', to_regclass('public.profile_board_shoutouts') is not null,
    'rpc_get_profile_board_shoutouts', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_profile_board_shoutouts'
    ),
    'rpc_post_profile_board_shoutout', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'post_profile_board_shoutout'
    )
  ),
  'weekly_recap_rpc', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'
  ),
  'circle_helpful', json_build_object(
    'circle_reply_reactions', to_regclass('public.circle_reply_reactions') is not null,
    'sync_helpful_count_fn', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'sync_circle_reply_helpful_count'
    ),
    'notify_helpful_fn', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'notify_on_circle_reply_helpful'
    )
  ),
  'circle_identity_metadata', json_build_object(
    'circle_threads_flair_tag', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'circle_threads' and column_name = 'flair_tag'
    ),
    'community_thread_pins', to_regclass('public.community_thread_pins') is not null
  ),
  'public_circles', (
    select count(*) = 12 from public.communities
    where slug in (
      'petverse','foodie-finds','main-character-moments','the-drama-room','laugh-lab',
      'diy-home-glow','fandom-lounge','creator-corner','travel-mode','money-moves',
      'cozy-corner','glow-up-garage'
    )
  ),
  'weekly_prompts', json_build_object(
    'circle_weekly_prompts', to_regclass('public.circle_weekly_prompts') is not null,
    'circle_prompt_configs', to_regclass('public.circle_prompt_configs') is not null,
    'get_current_prompt_rpc', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_current_circle_weekly_prompt'
    ),
    'calc_metrics_rpc', exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'calc_circle_weekly_prompt_metrics'
    )
  ),
  'feed_ranker_v4', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_ranked_feed_v4'
  ),
  'feed_interest_match_topics', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_interest_match_topics'
  ),
  'username_check_rpc', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'check_username_available'
  ),
  'delete_own_account_rpc', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'delete_own_account'
  ),
  'sponsored_delivery_off', coalesce((
    select not enabled from public.feature_flags
    where key = 'sponsored_placement_delivery_enabled'
    limit 1
  ), true)
) as phase_12_1_staging_checks;
