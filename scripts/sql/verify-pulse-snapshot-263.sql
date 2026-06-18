-- Pulse Snapshot migration 263 verification
-- Run: npx supabase db query --linked -f scripts/sql/verify-pulse-snapshot-263.sql

select json_build_object(
  'migration_263_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '263'),
  'migration_262_recorded',
  exists (select 1 from supabase_migrations.schema_migrations where version = '262'),
  'rpc_exists',
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'
  ),
  'rpc_security_definer',
  coalesce(
    (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap' limit 1),
    false
  ),
  'rpc_263_fields_in_source',
  json_build_object(
    'new_comments_var', (select prosrc like '%v_new_comments%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'new_pulses_var', (select prosrc like '%v_new_pulses%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'new_media_var', (select prosrc like '%v_new_media%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'output_new_comments', (select prosrc like '%''new_comments'', v_new_comments%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'output_new_pulses', (select prosrc like '%''new_pulses'', v_new_pulses%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'output_new_media', (select prosrc like '%''new_media'', v_new_media%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'legacy_new_followers', (select prosrc like '%''new_followers'', v_new_followers%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap'),
    'legacy_new_shoutouts', (select prosrc like '%''new_shoutouts'', v_new_shoutouts%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_pulse_weekly_recap')
  ),
  'grants',
  json_build_object(
    'authenticated_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_my_pulse_weekly_recap'
        and rp.grantee = 'authenticated' and rp.privilege_type = 'EXECUTE'
    ),
    'anon_execute',
    exists (
      select 1 from information_schema.routine_privileges rp
      where rp.routine_schema = 'public' and rp.routine_name = 'get_my_pulse_weekly_recap'
        and rp.grantee = 'anon' and rp.privilege_type = 'EXECUTE'
    )
  )
) as pulse_snapshot_263_check;

-- Auth smoke: no JWT should fail
do $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
  begin
    perform public.get_my_pulse_weekly_recap(auth.uid());
    raise exception 'expected not authenticated for anon/no jwt';
  exception
    when sqlstate '28000' then
      null; -- expected
  end;
end $$;

select 'anon_no_jwt_blocked' as auth_check, true as passed;

-- Auth smoke: owner can read own recap (replace owner id if needed)
with owner_row as (
  select id as owner_id
  from public.profiles
  order by created_at desc
  limit 1
),
jwt as (
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', owner_id::text, 'role', 'authenticated')::text,
    true
  ) as _set,
  owner_id
  from owner_row
)
select json_build_object(
  'owner_id', j.owner_id,
  'payload_keys', (
    select json_agg(k order by k)
    from (
      select jsonb_object_keys(public.get_my_pulse_weekly_recap(j.owner_id)) as k
    ) keys
  ),
  'new_comments', (public.get_my_pulse_weekly_recap(j.owner_id)->>'new_comments')::int,
  'new_pulses', (public.get_my_pulse_weekly_recap(j.owner_id)->>'new_pulses')::int,
  'new_media', (public.get_my_pulse_weekly_recap(j.owner_id)->>'new_media')::int,
  'new_followers', (public.get_my_pulse_weekly_recap(j.owner_id)->>'new_followers')::int,
  'new_shoutouts', (public.get_my_pulse_weekly_recap(j.owner_id)->>'new_shoutouts')::int,
  'has_activity', (public.get_my_pulse_weekly_recap(j.owner_id)->>'has_activity')::boolean
) as owner_recap_sample
from jwt j;

-- Auth smoke: cross-user (non-staff) should fail when another profile exists
do $$
declare
  v_owner uuid;
  v_other uuid;
begin
  select id into v_owner from public.profiles order by created_at desc limit 1;
  select id into v_other from public.profiles where id <> v_owner order by created_at desc limit 1;

  if v_other is null then
    raise notice 'cross_user_check_skipped: only one profile';
    return;
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_other::text, 'role', 'authenticated')::text,
    true
  );

  begin
    perform public.get_my_pulse_weekly_recap(v_owner);
    raise exception 'expected not allowed for cross-user recap';
  exception
    when sqlstate '42501' then
      raise notice 'cross_user_blocked: ok';
  end;
end $$;

select 'cross_user_blocked' as auth_check, true as passed;
