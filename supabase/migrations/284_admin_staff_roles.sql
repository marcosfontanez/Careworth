-- Admin P2: Staff role tiers (legacy role_admin fallback during migration).

do $$ begin
  create type public.staff_role as enum (
    'owner',
    'admin',
    'moderator',
    'community',
    'marketing',
    'support',
    'analyst',
    'economy'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists staff_roles public.staff_role[] not null default '{}'::public.staff_role[];

comment on column public.profiles.staff_roles is
  'Staff role tiers. Legacy role_admin=true with empty staff_roles is treated as owner in app/RPC helpers.';

-- Backfill existing staff to owner (preserve access — do not lock out admins).
update public.profiles
set staff_roles = array['owner']::public.staff_role[]
where coalesce(role_admin, false) = true
  and (staff_roles is null or staff_roles = '{}'::public.staff_role[]);

create or replace function public.effective_staff_roles(p_user_id uuid)
returns public.staff_role[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(
      (select cardinality(p.staff_roles) from public.profiles p where p.id = p_user_id),
      0
    ) > 0 then (select p.staff_roles from public.profiles p where p.id = p_user_id)
    when coalesce(
      (select p.role_admin from public.profiles p where p.id = p_user_id),
      false
    ) then array['owner']::public.staff_role[]
    else '{}'::public.staff_role[]
  end;
$$;

revoke all on function public.effective_staff_roles(uuid) from public;
grant execute on function public.effective_staff_roles(uuid) to authenticated;

create or replace function public.current_user_role_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select cardinality(public.effective_staff_roles((select auth.uid()))) > 0
      or coalesce(
        (select p.role_admin from public.profiles p where p.id = (select auth.uid())),
        false
      );
$$;

create or replace function public.current_user_staff_roles()
returns public.staff_role[]
language sql
stable
security definer
set search_path = public
as $$
  select public.effective_staff_roles((select auth.uid()));
$$;

revoke all on function public.current_user_staff_roles() from public;
grant execute on function public.current_user_staff_roles() to authenticated;

create or replace function public.caller_has_staff_role(p_role public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_role = any(public.effective_staff_roles((select auth.uid())));
$$;

revoke all on function public.caller_has_staff_role(public.staff_role) from public;
grant execute on function public.caller_has_staff_role(public.staff_role) to authenticated;

create or replace function public.count_staff_owners()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles p
  where 'owner'::public.staff_role = any(public.effective_staff_roles(p.id));
$$;

revoke all on function public.count_staff_owners() from public;
grant execute on function public.count_staff_owners() to authenticated;

create or replace function public.admin_profile_set_staff_roles(
  p_target_user_id uuid,
  p_staff_roles public.staff_role[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_roles public.staff_role[] := coalesce(p_staff_roles, '{}'::public.staff_role[]);
  v_target_had_owner boolean;
  v_new_has_owner boolean;
  v_owner_count integer;
begin
  if v_actor is null then
    raise exception 'not_allowed';
  end if;

  if not public.caller_has_staff_role('owner'::public.staff_role) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_target_user_id) then
    raise exception 'user_not_found';
  end if;

  v_target_had_owner := 'owner'::public.staff_role = any(
    public.effective_staff_roles(p_target_user_id)
  );
  v_new_has_owner := 'owner'::public.staff_role = any(v_roles);

  select public.count_staff_owners() into v_owner_count;

  if v_target_had_owner and not v_new_has_owner and v_owner_count <= 1 then
    raise exception 'last_owner_lockout' using errcode = 'P0001';
  end if;

  if cardinality(v_roles) = 0 then
    raise exception 'staff_roles_required' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    staff_roles = v_roles,
    role_admin = true
  where id = p_target_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

comment on function public.admin_profile_set_staff_roles(uuid, public.staff_role[]) is
  'Owner-only: assign staff role tiers. Keeps role_admin=true for legacy fallback.';

grant execute on function public.admin_profile_set_staff_roles(uuid, public.staff_role[]) to authenticated;
revoke execute on function public.admin_profile_set_staff_roles(uuid, public.staff_role[]) from anon;

create or replace function public.admin_profile_set_role_admin(
  p_target_user_id uuid,
  p_role_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_count integer;
  v_target_had_staff boolean;
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not public.caller_has_staff_role('owner'::public.staff_role) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  v_target_had_staff := cardinality(public.effective_staff_roles(p_target_user_id)) > 0;

  if not coalesce(p_role_admin, false) and v_target_had_staff then
    select public.count_staff_owners() into v_owner_count;
    if 'owner'::public.staff_role = any(public.effective_staff_roles(p_target_user_id))
       and v_owner_count <= 1 then
      raise exception 'last_owner_lockout' using errcode = 'P0001';
    end if;
  end if;

  if coalesce(p_role_admin, false) then
    update public.profiles
    set
      role_admin = true,
      staff_roles = case
        when cardinality(staff_roles) > 0 then staff_roles
        else array['owner']::public.staff_role[]
      end
    where id = p_target_user_id;
  else
    update public.profiles
    set role_admin = false, staff_roles = '{}'::public.staff_role[]
    where id = p_target_user_id;
  end if;

  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

-- Extend staff directory RPC with staff_roles (return type change requires drop first).
drop function if exists public.admin_list_profiles(text, boolean, integer);

create function public.admin_list_profiles(
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
  staff_roles public.staff_role[],
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
  if not public.current_user_role_admin() then
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
    public.effective_staff_roles(p.id) as staff_roles,
    p.created_at,
    coalesce(p.post_count, 0)::integer,
    coalesce(p.follower_count, 0)::integer
  from public.profiles p
  where (
    v_search is null
    or p.display_name ilike '%' || v_search || '%'
    or p.username ilike '%' || v_search || '%'
    or p.id::text = v_search
  )
  and (
    not coalesce(p_admins_only, false)
    or cardinality(public.effective_staff_roles(p.id)) > 0
  )
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;
