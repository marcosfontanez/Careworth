-- Deep check: migration 255 partial apply
select json_build_object(
  'has_feed_interest_match_topics', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'feed_interest_match_topics'
  ),
  'has_get_ranked_feed_v3', exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_ranked_feed_v3'
  ),
  'v3_body_uses_helper', coalesce((
    select pg_get_functiondef(p.oid) like '%feed_interest_match_topics%'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_ranked_feed_v3'
    limit 1
  ), false),
  'v3_has_viewer_interest_topics_cte', coalesce((
    select pg_get_functiondef(p.oid) like '%viewer_interest_topics%'
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_ranked_feed_v3'
    limit 1
  ), false),
  'helper_grants', json_build_object(
    'anon_execute', has_function_privilege('anon', 'public.feed_interest_match_topics(text)', 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', 'public.feed_interest_match_topics(text)', 'EXECUTE')
  )
) as migration_255_check;
