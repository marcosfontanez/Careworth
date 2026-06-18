-- ============================================================
-- Re-apply profiles column grants after migration 254
-- ------------------------------------------------------------
-- Migrations 247/250 grant SELECT on explicit profile columns only
-- (excluding role_admin). New columns from 254 onboarding fields were
-- not included → authenticated REST reads that select them fail with
-- 42501 "permission denied for table profiles" and the app hangs on boot.
-- ============================================================

do $$
declare
  col_list text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into col_list
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name <> 'role_admin';

  execute 'revoke select on public.profiles from authenticated';
  execute format('grant select (%s) on public.profiles to authenticated', col_list);

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', col_list);
end $$;
