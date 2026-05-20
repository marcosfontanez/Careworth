-- Supabase Performance Advisor: "Auth RLS Initialization Plan"
-- Wrap stable auth helpers as (select auth.uid()) so Postgres evaluates once per
-- statement instead of re-running initplans per row. Semantics unchanged.
--
-- Policies recreated here were introduced before migration 177 or never updated there.

-- ─── saved_jobs / user_interests (001) ───────────────────────────────────────

drop policy if exists "Users can view own saved jobs" on public.saved_jobs;
create policy "Users can view own saved jobs"
  on public.saved_jobs for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own saved jobs" on public.saved_jobs;
create policy "Users can manage own saved jobs"
  on public.saved_jobs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own interests" on public.user_interests;
create policy "Users can manage own interests"
  on public.user_interests for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── reports / blocked_users / user_bans / analytics_events (002 + 018 + 100) ─

drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
  on public.reports for insert
  with check ((select auth.uid()) = reporter_id);

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
  on public.reports for select
  using ((select auth.uid()) = reporter_id);

drop policy if exists "Admins can view all reports" on public.reports;
create policy "Admins can view all reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

drop policy if exists "Participants can see blocks involving them" on public.blocked_users;
create policy "Participants can see blocks involving them"
  on public.blocked_users for select
  using (
    (select auth.uid()) = blocker_id or (select auth.uid()) = blocked_id
  );

drop policy if exists "Users insert own blocks" on public.blocked_users;
create policy "Users insert own blocks"
  on public.blocked_users for insert
  with check ((select auth.uid()) = blocker_id);

drop policy if exists "Users delete own blocks" on public.blocked_users;
create policy "Users delete own blocks"
  on public.blocked_users for delete
  using ((select auth.uid()) = blocker_id);

drop policy if exists "Admins can manage bans" on public.user_bans;
create policy "Admins can manage bans"
  on public.user_bans for all
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

drop policy if exists "Users can see own bans" on public.user_bans;
create policy "Users can see own bans"
  on public.user_bans for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own events" on public.analytics_events;
create policy "Users can insert own events"
  on public.analytics_events for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all events" on public.analytics_events;
create policy "Admins can view all events"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

-- ─── job_applications / comment_likes (004) ───────────────────────────────────

drop policy if exists "Users can view own applications" on public.job_applications;
create policy "Users can view own applications"
  on public.job_applications for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create applications" on public.job_applications;
create policy "Users can create applications"
  on public.job_applications for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins can view all applications" on public.job_applications;
create policy "Admins can view all applications"
  on public.job_applications for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role_admin = true
    )
  );

drop policy if exists "Users can manage own comment likes" on public.comment_likes;
create policy "Users can manage own comment likes"
  on public.comment_likes for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── monetization (010): postings / tips / payouts ────────────────────────────

drop policy if exists "Employers can manage own postings" on public.job_postings;
create policy "Employers can manage own postings"
  on public.job_postings for all
  using ((select auth.uid()) = employer_id)
  with check ((select auth.uid()) = employer_id);

drop policy if exists "Users can send tips" on public.creator_tips;
create policy "Users can send tips"
  on public.creator_tips for insert
  with check ((select auth.uid()) = from_user_id);

drop policy if exists "Creators can view received tips" on public.creator_tips;
create policy "Creators can view received tips"
  on public.creator_tips for select
  using (
    (select auth.uid()) = to_creator_id or (select auth.uid()) = from_user_id
  );

drop policy if exists "Creators can manage own payout requests" on public.payout_requests;
create policy "Creators can manage own payout requests"
  on public.payout_requests for all
  using ((select auth.uid()) = creator_id)
  with check ((select auth.uid()) = creator_id);

-- ─── user_coins (011) ──────────────────────────────────────────────────────────

drop policy if exists "Users can read own coins" on public.user_coins;
create policy "Users can read own coins"
  on public.user_coins for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own coins" on public.user_coins;
create policy "Users can update own coins"
  on public.user_coins for update
  using ((select auth.uid()) = user_id);

-- ─── skill endorsements / user_skills (012) ────────────────────────────────────

drop policy if exists "Authenticated users can endorse" on public.skill_endorsements;
create policy "Authenticated users can endorse"
  on public.skill_endorsements for insert
  with check (
    (select auth.uid()) = endorser_id and endorser_id != endorsee_id
  );

drop policy if exists "Users can remove their endorsements" on public.skill_endorsements;
create policy "Users can remove their endorsements"
  on public.skill_endorsements for delete
  using ((select auth.uid()) = endorser_id);

drop policy if exists "Users can manage their own skills" on public.user_skills;
create policy "Users can manage their own skills"
  on public.user_skills for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own skills" on public.user_skills;
create policy "Users can update their own skills"
  on public.user_skills for update
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own skills" on public.user_skills;
create policy "Users can delete their own skills"
  on public.user_skills for delete
  using ((select auth.uid()) = user_id);

-- ─── saved_sounds (017) ───────────────────────────────────────────────────────

drop policy if exists "Users can view own saved sounds" on public.saved_sounds;
create policy "Users can view own saved sounds"
  on public.saved_sounds for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save sounds" on public.saved_sounds;
create policy "Users can save sounds"
  on public.saved_sounds for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove saved sounds" on public.saved_sounds;
create policy "Users can remove saved sounds"
  on public.saved_sounds for delete
  using ((select auth.uid()) = user_id);

-- ─── messaging (100) ──────────────────────────────────────────────────────────

drop policy if exists "Users can view own conversations" on public.conversations;
create policy "Users can view own conversations"
  on public.conversations for select
  using (
    ((select auth.uid()) = participant_1 or (select auth.uid()) = participant_2)
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = participant_1 and bu.blocked_id = participant_2)
         or (bu.blocker_id = participant_2 and bu.blocked_id = participant_1)
    )
  );

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
  on public.conversations for insert
  with check (
    ((select auth.uid()) = participant_1 or (select auth.uid()) = participant_2)
    and not exists (
      select 1 from public.blocked_users bu
      where (bu.blocker_id = participant_1 and bu.blocked_id = participant_2)
         or (bu.blocker_id = participant_2 and bu.blocked_id = participant_1)
    )
  );

drop policy if exists "Users can view messages in own conversations" on public.messages;
create policy "Users can view messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (
        c.participant_1 = (select auth.uid()) or c.participant_2 = (select auth.uid())
      )
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );

drop policy if exists "Users can send messages in own conversations" on public.messages;
create policy "Users can send messages in own conversations"
  on public.messages for insert
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (
        c.participant_1 = (select auth.uid()) or c.participant_2 = (select auth.uid())
      )
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );

drop policy if exists "Users can update messages in non-blocked chats" on public.messages;
create policy "Users can update messages in non-blocked chats"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (
        c.participant_1 = (select auth.uid()) or c.participant_2 = (select auth.uid())
      )
      and not exists (
        select 1 from public.blocked_users bu
        where (bu.blocker_id = c.participant_1 and bu.blocked_id = c.participant_2)
           or (bu.blocker_id = c.participant_2 and bu.blocked_id = c.participant_1)
      )
    )
  );

-- ─── post_collab_invites (092) ────────────────────────────────────────────────

drop policy if exists collab_invites_host_select on public.post_collab_invites;
create policy collab_invites_host_select
  on public.post_collab_invites for select
  using (
    (select auth.uid()) = host_creator_id or (select auth.uid()) = invitee_user_id
  );

drop policy if exists collab_invites_host_insert on public.post_collab_invites;
create policy collab_invites_host_insert
  on public.post_collab_invites for insert
  with check ((select auth.uid()) = host_creator_id);

drop policy if exists collab_invites_parties_update on public.post_collab_invites;
create policy collab_invites_parties_update
  on public.post_collab_invites for update
  using (
    (select auth.uid()) = host_creator_id or (select auth.uid()) = invitee_user_id
  );

-- ─── collab_projects / collab_slots (094 + 096 invitee select) ─────────────────

drop policy if exists collab_projects_host_all on public.collab_projects;
create policy collab_projects_host_all
  on public.collab_projects for all
  using ((select auth.uid()) = host_creator_id)
  with check ((select auth.uid()) = host_creator_id);

drop policy if exists collab_projects_invitee_select on public.collab_projects;
create policy collab_projects_invitee_select
  on public.collab_projects for select
  using (
    exists (
      select 1 from public.collab_slots s
      where s.project_id = collab_projects.id
        and s.invitee_user_id = (select auth.uid())
    )
  );

drop policy if exists collab_slots_host_all on public.collab_slots;
create policy collab_slots_host_all
  on public.collab_slots for all
  using (
    exists (
      select 1 from public.collab_projects cp
      where cp.id = project_id and cp.host_creator_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collab_projects cp
      where cp.id = project_id and cp.host_creator_id = (select auth.uid())
    )
  );

drop policy if exists collab_slots_invitee_select on public.collab_slots;
create policy collab_slots_invitee_select
  on public.collab_slots for select
  using (invitee_user_id = (select auth.uid()));

drop policy if exists collab_slots_invitee_update on public.collab_slots;
create policy collab_slots_invitee_update
  on public.collab_slots for update
  using (invitee_user_id = (select auth.uid()));

-- ─── creator_media_jobs / post_cover_ab_events (093) ──────────────────────────

drop policy if exists creator_media_jobs_select_own on public.creator_media_jobs;
create policy creator_media_jobs_select_own
  on public.creator_media_jobs for select
  using ((select auth.uid()) = user_id);

drop policy if exists creator_media_jobs_insert_own on public.creator_media_jobs;
create policy creator_media_jobs_insert_own
  on public.creator_media_jobs for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists creator_media_jobs_update_own on public.creator_media_jobs;
create policy creator_media_jobs_update_own
  on public.creator_media_jobs for update
  using ((select auth.uid()) = user_id);

drop policy if exists post_cover_ab_events_insert on public.post_cover_ab_events;
create policy post_cover_ab_events_insert
  on public.post_cover_ab_events for insert
  with check ((select auth.uid()) = viewer_id);

drop policy if exists post_cover_ab_events_select_creator on public.post_cover_ab_events;
create policy post_cover_ab_events_select_creator
  on public.post_cover_ab_events for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.creator_id = (select auth.uid())
    )
  );

-- ─── storage.objects (108): avatars / post-media / collab-clips ───────────────

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and (select auth.uid())::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and (select auth.uid())::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media' and (select auth.uid())::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media' and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "collab_clips_insert_own_folder" on storage.objects;
create policy "collab_clips_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "collab_clips_select_host" on storage.objects;
create policy "collab_clips_select_host"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and exists (
      select 1 from public.collab_projects cp
      where cp.id::text = split_part(name, '/', 2)
        and cp.host_creator_id = (select auth.uid())
    )
  );

drop policy if exists "collab_clips_select_uploader" on storage.objects;
create policy "collab_clips_select_uploader"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "collab_clips_update_own" on storage.objects;
create policy "collab_clips_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

drop policy if exists "collab_clips_delete_own" on storage.objects;
create policy "collab_clips_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'collab-clips'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );
