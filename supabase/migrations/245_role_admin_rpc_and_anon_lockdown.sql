-- ============================================================
-- PulseVerse: role_admin visibility hardening (phase 1)
-- ------------------------------------------------------------
-- WHY: profiles.role_admin is a staff flag. With the public `using (true)`
-- SELECT policy it was enumerable by ANY client (including signed-out/anon),
-- letting anyone discover which accounts are staff.
--
-- This phase:
--   1. Adds current_user_role_admin() so the app can check its OWN staff
--      status without selecting the column directly (groundwork for fully
--      revoking the column from `authenticated` once every admin-auth read is
--      routed through an RPC — tracked separately).
--   2. Blocks ANONYMOUS (signed-out) clients from reading role_admin via
--      direct profile reads by switching anon to explicit column grants that
--      exclude role_admin. Authenticated access is intentionally unchanged in
--      this phase so the staff admin console keeps working.
-- ============================================================

create or replace function public.current_user_role_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.current_user_role_admin() from public;
grant execute on function public.current_user_role_admin() to authenticated;

-- Anonymous clients: grant SELECT on every profile column EXCEPT role_admin.
-- (push_token / push_token_updated_at were removed in migration 243.)
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

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', col_list);
end $$;
