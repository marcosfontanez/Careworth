-- ============================================================================
-- 177: Security + RLS hygiene (Advisor-driven)
--
-- 1) EXECUTE grants: undo migration 150's blanket grants — revoke ALL from anon +
--    authenticated on every function in public, then grant only intentional RPCs.
--    Trigger-returning + leading-underscore helpers lose direct PostgREST RPC for both.
-- 2) search_path: pin mutable-search-path functions already flagged (behavior unchanged).
-- 3) RLS auth_rls_initplan: wrap auth.uid() as (select auth.uid()) where policies use it.
--
-- PUBLIC pseudo-role: migration 150 never revoked EXECUTE from PUBLIC; functions can remain
-- callable through PUBLIC alongside anon/authenticated. Section 1a-rev removes that gap.
--
-- NOT in this file:
-- - Storage listing hardening → migration 179 (operation-scoped SELECT + helpers).
-- - multiple_permissive_policies merges (needs equivalence proofs).
-- - Revoke default EXECUTE from anon/authenticated on new functions (broader lockdown than 150)
--   remains an optional follow-up if you want installs to default-deny RPCs.
-- - Auth leaked-password protection (Supabase Dashboard → Auth → Providers / Password).
-- ============================================================================

-- ─── 1a) Clear blanket EXECUTE from migration 150 ────────────────────────────

revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;
revoke execute on all functions in schema public from public;

-- Future functions created by migration owners: stop implicitly granting EXECUTE to PUBLIC.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

do $$
declare
  r text := 'supabase_admin';
begin
  if exists (select 1 from pg_roles where pg_roles.rolname = r) then
    begin
      execute format(
        'alter default privileges for role %I in schema public revoke execute on functions from public',
        r
      );
    exception
      when insufficient_privilege then
        raise notice 'migration 177: skipped alter default privileges revoke execute from public for % (insufficient privilege)', r;
    end;
  end if;
end $$;

-- ─── 1b–1c) Intentional EXECUTE grants (skip missing signatures on drifted prod) ─

do $$
declare
  grants text[] := array[
    'public.get_for_you_post_ids(uuid, int)|anon, authenticated',
    'public.get_ranked_feed_v2(uuid, int, timestamptz)|anon, authenticated',
    'public.get_ranked_feed(uuid, int, timestamptz)|anon, authenticated',
    'public.get_top_today(int)|anon, authenticated',
    'public.search_sound_library(text, int)|anon, authenticated',
    'public.search_hashtags(text, int)|anon, authenticated',
    'public.get_viral_sounds_this_week(int, text)|anon, authenticated',
    'public.get_community_card_stats(uuid[])|anon, authenticated',
    'public.get_mutual_follow_ids(uuid)|anon, authenticated',
    'public.check_username_available(text)|anon, authenticated',
    'public.border_catalog_leaderboard_rank_defaults(integer)|anon, authenticated',
    'public.get_current_pulse_score(uuid)|anon, authenticated',
    'public.get_top_current_pulse(int, uuid)|anon, authenticated',
    'public.get_top_lifetime_pulse(int, uuid)|anon, authenticated',
    'public.get_pulse_history(uuid)|anon, authenticated',
    'public.increment_ad_impression(uuid)|anon, authenticated',
    'public.increment_ad_click(uuid)|anon, authenticated',
    'public.bump_streak(uuid)|anon, authenticated',
    'public.get_feed_exclusions(uuid)|authenticated',
    'public.get_pulse_month_celebration()|authenticated',
    'public.get_top_events(int)|authenticated',
    'public.get_daily_active_users(int)|authenticated',
    'public.admin_profile_set_is_verified(uuid, boolean)|authenticated',
    'public.admin_profile_set_role_admin(uuid, boolean)|authenticated',
    'public.admin_post_set_privacy_mode(uuid, text)|authenticated',
    'public.admin_upsert_sound_catalog(uuid, text, text, int, boolean)|authenticated',
    'public.admin_delete_sound_catalog(uuid)|authenticated',
    'public.admin_shop_border_stats()|authenticated',
    'public.admin_border_catalog_create_monthly_champions(text, text)|authenticated',
    'public.bump_community_profile_open(uuid)|authenticated',
    'public.economy_create_or_get_wallets(uuid)|authenticated',
    'public.economy_claim_free_shop_border(uuid)|authenticated',
    'public.economy_equip_border(uuid)|authenticated',
    'public.economy_accept_pending_border_gift(uuid)|authenticated',
    'public.economy_send_creator_gift(uuid, uuid, text, uuid, text)|authenticated',
    'public.economy_send_live_stream_gift(text, text, text, text, integer, integer, text)|authenticated',
    'public.economy_admin_grant_shop_item(uuid, uuid, text, text)|authenticated',
    'public.economy_grant_sparks_from_valid_receipt(uuid)|authenticated',
    'public.economy_grant_border_from_valid_receipt(uuid, uuid)|authenticated',
    'public.economy_gift_border_from_valid_receipt(uuid, text, uuid, uuid, text)|authenticated',
    'public.increment_creator_earnings(uuid, numeric)|authenticated',
    'public.increment_creator_earnings(uuid)|authenticated',
    'public.increment_poll_vote(uuid, text)|authenticated',
    'public.update_user_streak(uuid)|authenticated',
    'public.update_user_streak()|authenticated',
    'public.reward_deliveries_list_pending()|authenticated',
    'public.reward_delivery_set_status(uuid, text)|authenticated',
    'public.reward_delivery_enqueue_border_self(uuid, uuid, jsonb)|authenticated',
    'public.reward_delivery_enqueue_sparks_pack(uuid, uuid, integer, jsonb)|authenticated',
    'public.reward_delivery_enqueue_client(text, text, text, jsonb, integer, uuid, uuid, text)|authenticated',
    'public.pin_profile_update(uuid)|authenticated',
    'public.unpin_profile_update(uuid)|authenticated',
    'public.toggle_profile_update_like(uuid)|authenticated',
    'public.claim_pulse_beta_border()|authenticated',
    'public.set_selected_pulse_avatar_frame(uuid)|authenticated',
    'public.live_touch_stream_attendance(uuid)|authenticated'
  ];
  row text;
  parts text[];
  sig text;
  grantees text;
begin
  foreach row in array grants loop
    parts := string_to_array(row, '|');
    sig := parts[1];
    grantees := parts[2];
    if to_regprocedure(sig) is not null then
      execute format('grant execute on function %s to %s', sig, grantees);
    end if;
  end loop;
end $$;

-- service_role: migration 150 granted EXECUTE; revoking authenticated does not revoke service_role.

-- ─── 1d) Trigger-returning functions: not callable via PostgREST RPC ───────

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_type ret on ret.oid = p.prorettype
    where n.nspname = 'public'
      and ret.typname = 'trigger'
  loop
    execute format('revoke execute on function %s from anon, authenticated', r.sig);
  end loop;
end $$;

-- ─── 1e) Leading underscore helpers (internal convention): no client RPC ───

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname like '\_%' escape '\'
  loop
    execute format('revoke execute on function %s from anon, authenticated', r.sig);
  end loop;
end $$;

-- ─── 1f) Legacy coin transfer superseded by economy_send_live_stream_gift (143) ─

do $$
begin
  if to_regprocedure('public.transfer_gift_coins(uuid, text, integer)') is not null then
    execute 'revoke execute on function public.transfer_gift_coins(uuid, text, integer) from anon';
    execute 'revoke execute on function public.transfer_gift_coins(uuid, text, integer) from authenticated';
  end if;
end $$;

-- ─── 2) search_path pinning (Advisor: function_search_path_mutable) ─────────

do $$
declare
  pins text[] := array[
    'public.increment_view_count()',
    'public.increment_ad_impression(uuid)',
    'public.increment_ad_click(uuid)',
    'public.increment_creator_earnings(uuid, numeric)',
    'public.increment_creator_earnings(uuid)',
    'public.get_top_today(int)',
    'public.get_ranked_feed(uuid, int, timestamptz)',
    'public.transfer_gift_coins(uuid, text, integer)',
    'public.search_hashtags(text, int)',
    'public.search_sound_library(text, int)',
    'public.live_streams_assign_livekit_room()',
    'public.cleanup_rate_limits()',
    'public.auto_moderate_content()',
    'public.update_ranking_scores()',
    'public.check_and_award_milestones()',
    'public.increment_poll_vote(uuid, text)'
  ];
  sig text;
begin
  foreach sig in array pins loop
    if to_regprocedure(sig) is not null then
      execute format('alter function %s set search_path = public', sig);
    end if;
  end loop;
end $$;

-- ─── 3) RLS initplan-friendly auth.uid() (semantics unchanged) ───────────────

-- profiles (001)
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check ((select auth.uid()) = id);

-- posts
drop policy if exists "Users can create own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

create policy "Users can create own posts"
  on public.posts for insert with check ((select auth.uid()) = creator_id);

create policy "Users can update own posts"
  on public.posts for update using ((select auth.uid()) = creator_id);

create policy "Users can delete own posts"
  on public.posts for delete using ((select auth.uid()) = creator_id);

drop policy if exists "Admins can delete posts for moderation" on public.posts;

create policy "Admins can delete posts for moderation"
  on public.posts for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

-- post_likes
drop policy if exists "Users can manage own likes" on public.post_likes;

create policy "Users can manage own likes"
  on public.post_likes for all using ((select auth.uid()) = user_id);

-- saved_posts
drop policy if exists "Users can view own saved posts" on public.saved_posts;
drop policy if exists "Users can manage own saved posts" on public.saved_posts;

create policy "Users can view own saved posts"
  on public.saved_posts for select using ((select auth.uid()) = user_id);

create policy "Users can manage own saved posts"
  on public.saved_posts for all using ((select auth.uid()) = user_id);

-- comments
drop policy if exists "Users can create comments" on public.comments;
drop policy if exists "Users can update own comments" on public.comments;
drop policy if exists "Users can delete own comments" on public.comments;

create policy "Users can create comments"
  on public.comments for insert with check ((select auth.uid()) = author_id);

create policy "Users can update own comments"
  on public.comments for update using ((select auth.uid()) = author_id);

create policy "Users can delete own comments"
  on public.comments for delete using ((select auth.uid()) = author_id);

drop policy if exists "Admins can delete comments for moderation" on public.comments;

create policy "Admins can delete comments for moderation"
  on public.comments for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

-- follows
drop policy if exists "Users can manage own follows" on public.follows;

create policy "Users can manage own follows"
  on public.follows for all using ((select auth.uid()) = follower_id);

-- community_members
drop policy if exists "Users can manage own memberships" on public.community_members;

create policy "Users can manage own memberships"
  on public.community_members for all using ((select auth.uid()) = user_id);

-- notifications
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;

create policy "Users can view own notifications"
  on public.notifications for select using ((select auth.uid()) = user_id);

create policy "Users can update own notifications"
  on public.notifications for update using ((select auth.uid()) = user_id);

-- post_views
drop policy if exists "Users can insert their own views" on public.post_views;
drop policy if exists "Users can read their own views" on public.post_views;

create policy "Users can insert their own views"
  on public.post_views for insert with check ((select auth.uid()) = viewer_id);

create policy "Users can read their own views"
  on public.post_views for select using ((select auth.uid()) = viewer_id);

-- rate_limits (002)
drop policy if exists "Users can manage own rate limits" on public.rate_limits;

create policy "Users can manage own rate limits"
  on public.rate_limits for all using ((select auth.uid()) = user_id);

-- stream_messages (044)
drop policy if exists "Authenticated users post to live streams" on public.stream_messages;
drop policy if exists "Authors and hosts can update messages" on public.stream_messages;

create policy "Authenticated users post to live streams"
  on public.stream_messages for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.live_streams ls
      where ls.id = stream_id and ls.status = 'live'
    )
  );

create policy "Authors and hosts can update messages"
  on public.stream_messages for update
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.live_streams ls
      where ls.id = stream_id and ls.host_id = (select auth.uid())
    )
  );

-- circle_threads / circle_replies (025): drop named policies only — keep public SELECT policies as-is.
drop policy if exists "Authenticated users can create threads" on public.circle_threads;
drop policy if exists "Authors can update own threads" on public.circle_threads;
drop policy if exists "Authors can delete own threads" on public.circle_threads;

create policy "Authenticated users can create threads"
  on public.circle_threads for insert with check ((select auth.uid()) = author_id);

create policy "Authors can update own threads"
  on public.circle_threads for update using ((select auth.uid()) = author_id);

create policy "Authors can delete own threads"
  on public.circle_threads for delete using ((select auth.uid()) = author_id);

drop policy if exists "Authenticated users can post replies" on public.circle_replies;
drop policy if exists "Authors can update own replies" on public.circle_replies;
drop policy if exists "Authors can delete own replies" on public.circle_replies;

create policy "Authenticated users can post replies"
  on public.circle_replies for insert with check ((select auth.uid()) = author_id);

create policy "Authors can update own replies"
  on public.circle_replies for update using ((select auth.uid()) = author_id);

create policy "Authors can delete own replies"
  on public.circle_replies for delete using ((select auth.uid()) = author_id);

-- live_streams (006 + 064 + 065): SELECT policies use no auth.uid — skip those.
drop policy if exists "Hosts can manage their own streams" on public.live_streams;

create policy "Hosts can manage their own streams"
  on public.live_streams for all using ((select auth.uid()) = host_id);

drop policy if exists "Admins can read all live streams" on public.live_streams;

create policy "Admins can read all live streams"
  on public.live_streams for select
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_admin = true)
  );

drop policy if exists "Admins can update live streams" on public.live_streams;

create policy "Admins can update live streams"
  on public.live_streams for update
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_admin = true)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_admin = true)
  );

-- communities / pins (063)
drop policy if exists "Admins can insert communities" on public.communities;
drop policy if exists "Admins can update communities" on public.communities;

create policy "Admins can insert communities"
  on public.communities for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

create policy "Admins can update communities"
  on public.communities for update using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

drop policy if exists "Admins can manage community post pins" on public.community_post_pins;

create policy "Admins can manage community post pins"
  on public.community_post_pins for all using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

-- Staff appeals (064)
drop policy if exists "Admins can read all content appeals" on public.content_appeals;
drop policy if exists "Admins can update content appeals" on public.content_appeals;

create policy "Admins can read all content appeals"
  on public.content_appeals for select
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_admin = true)
  );

create policy "Admins can update content appeals"
  on public.content_appeals for update
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role_admin = true)
  );

-- live_stream_reminders (176)
drop policy if exists "Users manage own live reminders select" on public.live_stream_reminders;
drop policy if exists "Users manage own live reminders insert" on public.live_stream_reminders;
drop policy if exists "Users manage own live reminders delete" on public.live_stream_reminders;

create policy "Users manage own live reminders select"
  on public.live_stream_reminders for select
  using ((select auth.uid()) = user_id);

create policy "Users manage own live reminders insert"
  on public.live_stream_reminders for insert
  with check ((select auth.uid()) = user_id);

create policy "Users manage own live reminders delete"
  on public.live_stream_reminders for delete
  using ((select auth.uid()) = user_id);

-- host earnings (046)
drop policy if exists "Host reads own earnings" on public.host_earnings;

create policy "Host reads own earnings"
  on public.host_earnings for select using ((select auth.uid()) = host_id);

drop policy if exists "Host reads own totals" on public.host_earnings_totals;

create policy "Host reads own totals"
  on public.host_earnings_totals for select using ((select auth.uid()) = host_id);

-- subscriptions (010 + 157 admin SELECT)
drop policy if exists "Users can read own subscription" on public.user_subscriptions;
drop policy if exists "Users can update own subscription" on public.user_subscriptions;
drop policy if exists "Users can insert own subscription" on public.user_subscriptions;
drop policy if exists "Admins can view all subscriptions" on public.user_subscriptions;

create policy "Users can read own subscription"
  on public.user_subscriptions for select using ((select auth.uid()) = user_id);

create policy "Users can update own subscription"
  on public.user_subscriptions for update using ((select auth.uid()) = user_id);

create policy "Users can insert own subscription"
  on public.user_subscriptions for insert with check ((select auth.uid()) = user_id);

create policy "Admins can view all subscriptions"
  on public.user_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

-- creator_tips admin read (157)
drop policy if exists "Admins can view all creator tips" on public.creator_tips;

create policy "Admins can view all creator tips"
  on public.creator_tips for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

-- ad_campaigns admin (019 / 177)
drop policy if exists "Admins can read all ad campaigns" on public.ad_campaigns;
drop policy if exists "Admins can insert ad campaigns" on public.ad_campaigns;
drop policy if exists "Admins can update ad campaigns" on public.ad_campaigns;

create policy "Admins can read all ad campaigns"
  on public.ad_campaigns for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

create policy "Admins can insert ad campaigns"
  on public.ad_campaigns for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

create policy "Admins can update ad campaigns"
  on public.ad_campaigns for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

-- streak_activity (012)
drop policy if exists "Users log their own activity" on public.streak_activity;

create policy "Users log their own activity"
  on public.streak_activity for insert with check ((select auth.uid()) = user_id);

-- creator_earnings select (010)
drop policy if exists "Creators can view own earnings" on public.creator_earnings;

create policy "Creators can view own earnings"
  on public.creator_earnings for select using ((select auth.uid()) = creator_id);

-- sound_catalog staff read (070)
drop policy if exists "Staff read all sound_catalog" on public.sound_catalog;

create policy "Staff read all sound_catalog"
  on public.sound_catalog for select
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and coalesce(pr.role_admin, false) = true
    )
  );
