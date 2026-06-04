-- ============================================================
-- PulseVerse: fix RLS policies broken by migration 247
-- ------------------------------------------------------------
-- Migration 247 revoked SELECT on profiles.role_admin for authenticated.
-- Many RLS policies still used inline:
--   exists (select 1 from profiles … and p.role_admin = true)
-- Those subqueries run as the CALLER (not definer), so they raise
-- "permission denied for table profiles" and break feed, live, bans, etc.
--
-- Fix: route staff checks through current_user_role_admin() / viewer_is_staff()
-- (both SECURITY DEFINER and can read role_admin safely).
-- Also re-apply column grants so any columns added after 247 stay readable.
-- ============================================================

grant execute on function public.current_user_role_admin() to authenticated;
grant execute on function public.viewer_is_staff() to authenticated;

-- Re-apply explicit column grants (all columns except role_admin).
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

-- ─── Feed / Circles visibility (220) ────────────────────────────────────────

drop policy if exists "Posts viewable with anonymous author guard" on public.posts;
create policy "Posts viewable with anonymous author guard"
  on public.posts for select
  using (
    coalesce(is_anonymous, false) = false
    or (select auth.uid()) = creator_id
    or public.viewer_is_staff()
  );

drop policy if exists "Comments viewable with anonymous parent guard" on public.comments;
create policy "Comments viewable with anonymous parent guard"
  on public.comments for select
  using (
    not exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and coalesce(p.is_anonymous, false) = true
    )
    or (select auth.uid()) = author_id
    or public.viewer_is_staff()
  );

drop policy if exists "Circle threads viewable with confessions author guard" on public.circle_threads;
create policy "Circle threads viewable with confessions author guard"
  on public.circle_threads for select
  using (
    not public.community_is_confessions(community_id)
    or (select auth.uid()) = author_id
    or public.can_moderate_circle_for_user(community_id, (select auth.uid()))
    or public.viewer_is_staff()
  );

drop policy if exists "Circle replies viewable with confessions author guard" on public.circle_replies;
create policy "Circle replies viewable with confessions author guard"
  on public.circle_replies for select
  using (
    exists (
      select 1
      from public.circle_threads ct
      where ct.id = circle_replies.thread_id
        and (
          not public.community_is_confessions(ct.community_id)
          or (select auth.uid()) = circle_replies.author_id
          or public.can_moderate_circle_for_user(ct.community_id, (select auth.uid()))
          or public.viewer_is_staff()
        )
    )
  );

-- ─── Moderation delete (177) ────────────────────────────────────────────────

drop policy if exists "Admins can delete posts for moderation" on public.posts;
create policy "Admins can delete posts for moderation"
  on public.posts for delete
  using (public.current_user_role_admin());

drop policy if exists "Admins can delete comments for moderation" on public.comments;
create policy "Admins can delete comments for moderation"
  on public.comments for delete
  using (public.current_user_role_admin());

-- ─── Live streams admin (177 / 064) ─────────────────────────────────────────

drop policy if exists "Admins can read all live streams" on public.live_streams;
create policy "Admins can read all live streams"
  on public.live_streams for select
  using (public.current_user_role_admin());

drop policy if exists "Admins can update live streams" on public.live_streams;
create policy "Admins can update live streams"
  on public.live_streams for update
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

-- ─── Communities / pins / appeals (177) ─────────────────────────────────────

drop policy if exists "Admins can insert communities" on public.communities;
create policy "Admins can insert communities"
  on public.communities for insert
  with check (public.current_user_role_admin());

drop policy if exists "Admins can update communities" on public.communities;
create policy "Admins can update communities"
  on public.communities for update
  using (public.current_user_role_admin());

drop policy if exists "Admins can manage community post pins" on public.community_post_pins;
create policy "Admins can manage community post pins"
  on public.community_post_pins for all
  using (public.current_user_role_admin());

drop policy if exists "Admins can read all content appeals" on public.content_appeals;
create policy "Admins can read all content appeals"
  on public.content_appeals for select
  using (public.current_user_role_admin());

drop policy if exists "Admins can update content appeals" on public.content_appeals;
create policy "Admins can update content appeals"
  on public.content_appeals for update
  using (public.current_user_role_admin());

-- ─── Subscriptions / tips / ads / sound catalog (177) ───────────────────────

drop policy if exists "Admins can view all subscriptions" on public.user_subscriptions;
create policy "Admins can view all subscriptions"
  on public.user_subscriptions for select
  to authenticated
  using (public.current_user_role_admin());

drop policy if exists "Admins can view all creator tips" on public.creator_tips;
create policy "Admins can view all creator tips"
  on public.creator_tips for select
  to authenticated
  using (public.current_user_role_admin());

drop policy if exists "Admins can read all ad campaigns" on public.ad_campaigns;
create policy "Admins can read all ad campaigns"
  on public.ad_campaigns for select
  to authenticated
  using (public.current_user_role_admin());

drop policy if exists "Admins can insert ad campaigns" on public.ad_campaigns;
create policy "Admins can insert ad campaigns"
  on public.ad_campaigns for insert
  to authenticated
  with check (public.current_user_role_admin());

drop policy if exists "Admins can update ad campaigns" on public.ad_campaigns;
create policy "Admins can update ad campaigns"
  on public.ad_campaigns for update
  to authenticated
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

drop policy if exists "Staff read all sound_catalog" on public.sound_catalog;
create policy "Staff read all sound_catalog"
  on public.sound_catalog for select
  using (public.current_user_role_admin());

-- ─── Reports / bans / analytics / applications (188) ──────────────────────

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select
  using (public.current_user_role_admin());

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (public.current_user_role_admin());

drop policy if exists "Admins can manage bans" on public.user_bans;
create policy "Admins can manage bans"
  on public.user_bans for all
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

drop policy if exists "Admins can view all events" on public.analytics_events;
create policy "Admins can view all events"
  on public.analytics_events for select
  using (public.current_user_role_admin());

drop policy if exists "Admins can view all applications" on public.job_applications;
create policy "Admins can view all applications"
  on public.job_applications for select
  using (public.current_user_role_admin());

-- ─── Circle moderators admin (219) ──────────────────────────────────────────

drop policy if exists "Admins manage circle moderators" on public.circle_moderators;
create policy "Admins manage circle moderators"
  on public.circle_moderators for all
  using (public.current_user_role_admin())
  with check (public.current_user_role_admin());

-- ─── Legacy admin policies still present on some deployments (018 / 066) ────

drop policy if exists "Admins can manage all reports" on public.reports;
create policy "Admins can manage all reports"
  on public.reports for all
  using (public.current_user_role_admin());

drop policy if exists "Admins can delete any post" on public.posts;
create policy "Admins can delete any post"
  on public.posts for delete
  using (public.current_user_role_admin());

drop policy if exists "Admins can delete any comment" on public.comments;
create policy "Admins can delete any comment"
  on public.comments for delete
  using (public.current_user_role_admin());
