-- Fix for migration 284 if admin_list_profiles return-type replace failed.
-- Safe to run after partial 284 apply (enum/column/functions already exist).

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

grant execute on function public.admin_list_profiles(text, boolean, integer) to authenticated;
revoke execute on function public.admin_list_profiles(text, boolean, integer) from anon;

-- Record migration if applying manually after partial failure:
insert into supabase_migrations.schema_migrations (version)
values ('284')
on conflict (version) do nothing;

select '284_admin_staff_roles_complete' as result;
