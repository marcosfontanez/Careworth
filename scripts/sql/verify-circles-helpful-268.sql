-- Circles Helpful hardening — migration 268 verification
-- Run: npx supabase db query --linked -f scripts/sql/verify-circles-helpful-268.sql

select json_build_object(
  'migration_267_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '267'),
  'migration_268_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '268'),
  'user_can_react_has_block_guard',
  coalesce(
    (select prosrc like '%blocked_users%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'user_can_react_to_circle_reply' limit 1),
    false
  ),
  'badge_rpc_joined_only',
  coalesce(
    (select prosrc like '%community_members%' and prosrc like '%auth.uid()%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_joined_circle_activity_badges' limit 1),
    false
  ),
  'badge_rpc_posts_text_cast',
  coalesce(
    (select prosrc like '%cid::text%'
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_joined_circle_activity_badges' limit 1),
    false
  ),
  'grants',
  json_build_object(
    'anon_insert_revoked',
    not exists (
      select 1 from information_schema.table_privileges tp
      where tp.table_schema = 'public' and tp.table_name = 'circle_reply_reactions'
        and tp.grantee = 'anon' and tp.privilege_type = 'INSERT'
    ),
    'anon_delete_revoked',
    not exists (
      select 1 from information_schema.table_privileges tp
      where tp.table_schema = 'public' and tp.table_name = 'circle_reply_reactions'
        and tp.grantee = 'anon' and tp.privilege_type = 'DELETE'
    ),
    'anon_update_revoked',
    not exists (
      select 1 from information_schema.table_privileges tp
      where tp.table_schema = 'public' and tp.table_name = 'circle_reply_reactions'
        and tp.grantee = 'anon' and tp.privilege_type = 'UPDATE'
    ),
    'public_badges_rpc_execute_revoked',
    not exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_joined_circle_activity_badges'
        and rp.grantee = 'PUBLIC' and rp.privilege_type = 'EXECUTE'
    ),
    'authenticated_insert_allowed',
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
    )
  ),
  'rls_policies',
  json_build_object(
    'insert_policy_uses_can_react',
    coalesce(
      (select pg_get_expr(pol.polqual, pol.polrelid) like '%user_can_react_to_circle_reply%'
          or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%user_can_react_to_circle_reply%'
       from pg_policy pol
       join pg_class rel on rel.oid = pol.polrelid
       join pg_namespace n on n.oid = rel.relnamespace
       where n.nspname = 'public' and rel.relname = 'circle_reply_reactions'
         and pol.polname = 'Members can mark replies helpful'
       limit 1),
      false
    ),
    'delete_own_only',
    exists (
      select 1 from pg_policy pol
      join pg_class rel on rel.oid = pol.polrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public' and rel.relname = 'circle_reply_reactions'
        and pol.polname = 'Users can remove own circle reply reactions'
    )
  )
) as circles_helpful_268_check;
