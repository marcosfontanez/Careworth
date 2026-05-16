-- Staff-only moderation RPCs for mobile/web consoles (bypass profiles/posts RLS safely).
-- Tighten analytics RPCs to role_admin; allow staff read-all on monetization aggregates.

-- ─── Restrict analytics SECURITY DEFINER helpers to staff ─────────────────────

create or replace function public.get_top_events(days_back int default 7)
returns table(name text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role_admin, false) = true
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
    select ae.event_name as name, count(*)::bigint as count
    from public.analytics_events ae
    where ae.created_at >= now() - (days_back || ' days')::interval
    group by ae.event_name
    order by count desc
    limit 20;
end;
$$;

create or replace function public.get_daily_active_users(days_back int default 30)
returns table(day date, active_users bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role_admin, false) = true
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
    select date_trunc('day', ae.created_at)::date as day,
           count(distinct ae.user_id)::bigint as active_users
    from public.analytics_events ae
    where ae.created_at >= now() - (days_back || ' days')::interval
      and ae.event_name = 'app_open'
    group by day
    order by day;
end;
$$;

comment on function public.get_top_events(int) is
  'Staff-only aggregate over analytics_events (SECURITY DEFINER + caller role_admin gate).';

comment on function public.get_daily_active_users(int) is
  'Staff-only DAU from analytics_events (SECURITY DEFINER + caller role_admin gate).';

-- ─── Moderation / privilege RPCs (SECURITY DEFINER + explicit staff check) ───

create or replace function public.admin_profile_set_is_verified(
  p_target_user_id uuid,
  p_is_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role_admin, false) = true
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.profiles
  set is_verified = coalesce(p_is_verified, false)
  where id = p_target_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

create or replace function public.admin_profile_set_role_admin(
  p_target_user_id uuid,
  p_role_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role_admin, false) = true
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.profiles
  set role_admin = coalesce(p_role_admin, false)
  where id = p_target_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;
end;
$$;

create or replace function public.admin_post_set_privacy_mode(
  p_post_id uuid,
  p_privacy_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role_admin, false) = true
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if p_privacy_mode is null
     or p_privacy_mode not in ('public', 'private') then
    raise exception 'invalid_privacy_mode';
  end if;

  update public.posts
  set privacy_mode = p_privacy_mode
  where id = p_post_id;

  if not found then
    raise exception 'post_not_found';
  end if;
end;
$$;

comment on function public.admin_profile_set_is_verified(uuid, boolean) is
  'Staff sets profiles.is_verified for another user (mobile/web moderation consoles).';

comment on function public.admin_profile_set_role_admin(uuid, boolean) is
  'Staff sets profiles.role_admin for another user.';

comment on function public.admin_post_set_privacy_mode(uuid, text) is
  'Staff sets posts.privacy_mode for moderation hide/restore.';

grant execute on function public.admin_profile_set_is_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_profile_set_role_admin(uuid, boolean) to authenticated;
grant execute on function public.admin_post_set_privacy_mode(uuid, text) to authenticated;

revoke execute on function public.admin_profile_set_is_verified(uuid, boolean) from anon;
revoke execute on function public.admin_profile_set_role_admin(uuid, boolean) from anon;
revoke execute on function public.admin_post_set_privacy_mode(uuid, text) from anon;

revoke execute on function public.get_top_events(int) from anon;
revoke execute on function public.get_daily_active_users(int) from anon;
grant execute on function public.get_top_events(int) to authenticated;
grant execute on function public.get_daily_active_users(int) to authenticated;

-- ─── Staff read policies for mobile Revenue tab aggregates ─────────────────────

drop policy if exists "Admins can view all subscriptions" on public.user_subscriptions;
create policy "Admins can view all subscriptions"
  on public.user_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role_admin, false) = true
    )
  );

drop policy if exists "Admins can view all creator tips" on public.creator_tips;
create policy "Admins can view all creator tips"
  on public.creator_tips for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role_admin, false) = true
    )
  );
