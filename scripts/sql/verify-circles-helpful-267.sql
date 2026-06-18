-- Circles Helpful reactions + activity badges — migration 267 verification
-- Run in Supabase SQL Editor or: npx supabase db query --linked -f scripts/sql/verify-circles-helpful-267.sql

select json_build_object(
  'migration_267_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '267'),
  'circle_reply_reactions_table',
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'circle_reply_reactions'
  ),
  'circle_replies_helpful_count_column',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'circle_replies' and column_name = 'helpful_count'
  ),
  'helpful_sync_trigger',
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'circle_reply_reactions'
      and t.tgname = 'trg_circle_reply_reactions_sync_helpful'
      and not t.tgisinternal
  ),
  'viewer_safe_helpful_count',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'circle_replies_viewer_safe'
      and column_name = 'helpful_count'
  ),
  'user_can_react_fn',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'user_can_react_to_circle_reply'
  ),
  'activity_badges_rpc',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_joined_circle_activity_badges'
  ),
  'grants',
  json_build_object(
    'authenticated_reply_reactions_insert',
    exists (
      select 1 from information_schema.table_privileges tp
      where tp.table_schema = 'public' and tp.table_name = 'circle_reply_reactions'
        and tp.grantee = 'authenticated' and tp.privilege_type = 'INSERT'
    ),
    'authenticated_badges_rpc_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_joined_circle_activity_badges'
        and rp.grantee = 'authenticated' and rp.privilege_type = 'EXECUTE'
    ),
    'public_badges_rpc_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_joined_circle_activity_badges'
        and rp.grantee = 'PUBLIC' and rp.privilege_type = 'EXECUTE'
    ),
    'anon_reply_reactions_insert',
    not exists (
      select 1 from information_schema.table_privileges tp
      where tp.table_schema = 'public' and tp.table_name = 'circle_reply_reactions'
        and tp.grantee = 'anon' and tp.privilege_type = 'INSERT'
    )
  ),
  'unique_helpful_per_user',
  exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'circle_reply_reactions'
      and con.contype = 'u'
  ),
  'badge_rpc_posts_cast',
  (select prosrc like '%cid::text%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_joined_circle_activity_badges' limit 1)
) as circles_helpful_267_check;
