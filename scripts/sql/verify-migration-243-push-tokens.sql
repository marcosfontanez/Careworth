-- Migration 243: push tokens moved off profiles
select json_build_object(
  'migration_243_recorded', exists (
    select 1 from supabase_migrations.schema_migrations where version = '243'
  ),
  'user_push_tokens_table', to_regclass('public.user_push_tokens') is not null,
  'token_count', (select count(*)::int from public.user_push_tokens),
  'profiles_push_token_gone', not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'push_token'
  ),
  'profiles_push_token_updated_at_gone', not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'push_token_updated_at'
  ),
  'rls_policy', exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_push_tokens'
      and policyname = 'Users manage own push token'
  )
) as migration_243_check;
