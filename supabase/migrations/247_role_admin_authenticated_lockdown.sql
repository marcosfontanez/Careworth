-- ============================================================
-- PulseVerse: complete role_admin masking (phase 2 — authenticated)
-- ------------------------------------------------------------
-- Phase 1 (migration 245) added current_user_role_admin() and blocked ANON
-- enumeration of profiles.role_admin. This phase removes the column from the
-- `authenticated` role's profile reads too, so a normal logged-in user can no
-- longer enumerate staff via `select('role_admin')` or `select('*')`.
--
-- SAFE because:
--   * RLS policy predicates + SECURITY DEFINER functions are evaluated as the
--     table owner, NOT the caller — every existing admin/moderation policy that
--     references profiles.role_admin keeps working.
--   * All app/admin code that READ role_admin directly has been migrated to the
--     RPCs below (current_user_role_admin / admin_list_profiles).
--   * App profile reads now select explicit columns (PROFILE_COLUMNS), never `*`.
-- ============================================================

-- current_user_role_admin() already exists (migration 245); ensure it's present
-- and idempotent here so this migration is self-contained.
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

-- Staff-only directory read. SECURITY DEFINER so it can return role_admin, but
-- it self-checks that the CALLER is staff first — a non-admin gets an exception,
-- never data. Used by the mobile admin user list and the web staff list.
create or replace function public.admin_list_profiles(
  p_search text default null,
  p_admins_only boolean default false,
  p_limit integer default 100
)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  role text,
  is_verified boolean,
  role_admin boolean,
  created_at timestamptz,
  post_count integer,
  follower_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not coalesce(
    (select p.role_admin from public.profiles p where p.id = (select auth.uid())),
    false
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.role,
    p.is_verified,
    p.role_admin,
    p.created_at,
    p.post_count,
    p.follower_count
  from public.profiles p
  where (not p_admins_only or p.role_admin = true)
    and (
      v_search is null
      or p.display_name ilike '%' || v_search || '%'
      or p.username ilike '%' || v_search || '%'
    )
  order by
    case when p_admins_only then p.display_name end asc nulls last,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.admin_list_profiles(text, boolean, integer) from public;
grant execute on function public.admin_list_profiles(text, boolean, integer) to authenticated;

-- Authenticated clients: grant SELECT on every profile column EXCEPT role_admin.
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
end $$;
