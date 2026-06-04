-- Grant staff admin (profiles.role_admin) for the web console.
-- Run in Supabase → SQL Editor.
--
-- Plain UPDATE is reverted by trg_profiles_lock_privilege_columns unless auth.role()
-- is service_role — so disable that trigger briefly, then re-enable.

begin;

alter table public.profiles disable trigger trg_profiles_lock_privilege_columns;

update public.profiles
set role_admin = true
where id = (
  select id from auth.users where lower(email) = lower('marcosfontanez@gmail.com')
);

alter table public.profiles enable trigger trg_profiles_lock_privilege_columns;

-- Verify (should show role_admin = true)
select u.email, p.id, p.role_admin, p.username
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('marcosfontanez@gmail.com');

commit;
