-- Pre-migration staff snapshot + post-migration verification for role tiers rollout.
-- Run sections separately in Supabase SQL Editor or via CLI.

-- PRE: staff snapshot (save output internally before migration)
-- select p.id, u.email, p.role_admin, p.staff_roles, p.display_name, p.username
-- from profiles p
-- left join auth.users u on u.id = p.id
-- where p.role_admin = true
-- order by u.email nulls last, p.id;

-- POST: schema
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('staff_roles', 'role_admin')
order by column_name;

-- POST: enum
select enumlabel
from pg_enum
where enumtypid = 'public.staff_role'::regtype
order by enumsortorder;

-- POST: migration recorded
select exists (select 1 from supabase_migrations.schema_migrations where version = '284') as migration_284_recorded;

-- POST: backfill
select id, role_admin, staff_roles, display_name, username
from profiles
where role_admin = true
order by id;

-- POST: owner count
select count(*) as owner_count
from profiles
where 'owner'::public.staff_role = any(staff_roles);

-- POST: functions exist
select proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'effective_staff_roles',
    'current_user_staff_roles',
    'admin_profile_set_staff_roles',
    'current_user_role_admin',
    'admin_profile_set_role_admin',
    'admin_list_profiles'
  )
order by proname;

-- POST: legacy fallback sample (should return owner for role_admin-only edge case)
-- select public.effective_staff_roles(id) as effective_roles
-- from profiles
-- where role_admin = true
-- limit 5;
