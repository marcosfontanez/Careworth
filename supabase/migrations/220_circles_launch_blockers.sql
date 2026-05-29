-- Sprint 2E: Launch blockers — notification fan-out queue, thread reactions,
-- PostgREST privacy hardening (definer viewer-safe views + tighter SELECT RLS),
-- auto pending_review on reported circle content.
-- Idempotent: safe to re-run in SQL Editor (drops policies/views before recreate).

-- ---------------------------------------------------------------------------
-- 1. Notification fan-out queue (overflow beyond 250 members per community)
-- ---------------------------------------------------------------------------
create table if not exists public.circle_post_notification_fanout (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  message text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  cursor_joined_at timestamptz not null,
  batch_size int not null default 250,
  status text not null default 'pending',
  batches_sent int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint circle_post_notification_fanout_status_ck
    check (status in ('pending', 'processing', 'done', 'failed'))
);

create index if not exists idx_circle_post_notification_fanout_pending
  on public.circle_post_notification_fanout (status, created_at asc)
  where status = 'pending';

comment on table public.circle_post_notification_fanout is
  'Deferred circle_new_post notifications when a community has >250 notify_new_posts members.';

alter table public.circle_post_notification_fanout enable row level security;

-- Only service role / cron should touch the queue (no client reads).
revoke all on public.circle_post_notification_fanout from anon, authenticated;
grant all on public.circle_post_notification_fanout to service_role;

create or replace function public.notify_community_members_on_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid_text text;
  v_community_id uuid;
  v_redact_actor boolean;
  v_message text;
  v_min_joined timestamptz;
  v_has_more boolean;
begin
  begin
    if coalesce(new.scheduled_status, 'live') is distinct from 'live' then
      return new;
    end if;
    if new.communities is null or cardinality(new.communities) < 1 then
      return new;
    end if;

    foreach cid_text in array new.communities
    loop
      if cid_text is null or btrim(cid_text) = '' then
        continue;
      end if;

      v_community_id := cid_text::uuid;
      v_redact_actor := coalesce(new.is_anonymous, false)
        or public.community_is_confessions(v_community_id);

      if v_redact_actor and public.community_is_confessions(v_community_id) then
        v_message := 'New anonymous post in Confessions';
      elsif v_redact_actor then
        v_message := 'New anonymous post in a circle you joined';
      else
        v_message := 'New post in a circle you joined';
      end if;

      with batch as (
        select cm.user_id, cm.joined_at
        from public.community_members cm
        where cm.community_id = v_community_id
          and cm.user_id is distinct from new.creator_id
          and cm.notify_new_posts is true
        order by cm.joined_at desc
        limit 250
      )
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      select
        b.user_id,
        case when v_redact_actor then null else new.creator_id end,
        'circle_new_post',
        v_message,
        new.id::text,
        false,
        v_community_id
      from batch b;

      select min(b.joined_at)
        into v_min_joined
      from (
        select cm.joined_at
        from public.community_members cm
        where cm.community_id = v_community_id
          and cm.user_id is distinct from new.creator_id
          and cm.notify_new_posts is true
        order by cm.joined_at desc
        limit 250
      ) b;

      if v_min_joined is null then
        continue;
      end if;

      select exists (
        select 1
        from public.community_members cm
        where cm.community_id = v_community_id
          and cm.user_id is distinct from new.creator_id
          and cm.notify_new_posts is true
          and cm.joined_at < v_min_joined
      ) into v_has_more;

      if v_has_more then
        insert into public.circle_post_notification_fanout (
          post_id,
          community_id,
          message,
          actor_id,
          cursor_joined_at
        )
        values (
          new.id,
          v_community_id,
          v_message,
          case when v_redact_actor then null else new.creator_id end,
          v_min_joined
        );
      end if;
    end loop;
  exception when others then
    perform public.log_trigger_error(
      'notify_community_members_on_new_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

comment on function public.notify_community_members_on_new_post() is
  'Notifies up to 250 members immediately; enqueues fan-out jobs for larger communities.';

create or replace function public.process_circle_post_notification_fanout(p_job_limit int default 10)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  job record;
  processed int := 0;
  v_post_creator uuid;
  v_min_joined timestamptz;
  v_has_more boolean;
begin
  for job in
    select *
    from public.circle_post_notification_fanout
    where status = 'pending'
    order by created_at asc
    limit greatest(1, least(coalesce(p_job_limit, 10), 50))
    for update skip locked
  loop
    begin
      update public.circle_post_notification_fanout
      set status = 'processing', updated_at = now()
      where id = job.id;

      select p.creator_id into v_post_creator
      from public.posts p
      where p.id = job.post_id;

      if v_post_creator is null then
        update public.circle_post_notification_fanout
        set status = 'done', updated_at = now()
        where id = job.id;
        processed := processed + 1;
        continue;
      end if;

      with batch as (
        select cm.user_id, cm.joined_at
        from public.community_members cm
        where cm.community_id = job.community_id
          and cm.user_id is distinct from v_post_creator
          and cm.notify_new_posts is true
          and cm.joined_at < job.cursor_joined_at
        order by cm.joined_at desc
        limit job.batch_size
      )
      insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
      select
        b.user_id,
        job.actor_id,
        'circle_new_post',
        job.message,
        job.post_id::text,
        false,
        job.community_id
      from batch b;

      select min(b.joined_at)
        into v_min_joined
      from (
        select cm.joined_at
        from public.community_members cm
        where cm.community_id = job.community_id
          and cm.user_id is distinct from v_post_creator
          and cm.notify_new_posts is true
          and cm.joined_at < job.cursor_joined_at
        order by cm.joined_at desc
        limit job.batch_size
      ) b;

      if v_min_joined is null then
        update public.circle_post_notification_fanout
        set status = 'done', updated_at = now()
        where id = job.id;
      else
        select exists (
          select 1
          from public.community_members cm
          where cm.community_id = job.community_id
            and cm.user_id is distinct from v_post_creator
            and cm.notify_new_posts is true
            and cm.joined_at < v_min_joined
        ) into v_has_more;

        if v_has_more then
          update public.circle_post_notification_fanout
          set
            status = 'pending',
            cursor_joined_at = v_min_joined,
            batches_sent = batches_sent + 1,
            updated_at = now()
          where id = job.id;
        else
          update public.circle_post_notification_fanout
          set status = 'done', updated_at = now()
          where id = job.id;
        end if;
      end if;

      processed := processed + 1;
    exception when others then
      update public.circle_post_notification_fanout
      set status = 'failed', updated_at = now()
      where id = job.id;
      perform public.log_trigger_error(
        'process_circle_post_notification_fanout', 'UPDATE', 'circle_post_notification_fanout',
        sqlstate, sqlerrm,
        jsonb_build_object('job_id', job.id)
      );
    end;
  end loop;

  return processed;
end;
$$;

comment on function public.process_circle_post_notification_fanout(int) is
  'Processes pending circle_new_post fan-out jobs. Schedule via pg_cron or Edge Function (service role).';

revoke all on function public.process_circle_post_notification_fanout(int) from public;
grant execute on function public.process_circle_post_notification_fanout(int) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Circle thread reactions (heart toggle; syncs reaction_count)
-- ---------------------------------------------------------------------------
create table if not exists public.circle_thread_reactions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.circle_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart',
  created_at timestamptz not null default now(),
  unique (thread_id, user_id),
  constraint circle_thread_reactions_reaction_ck check (reaction in ('heart'))
);

create index if not exists idx_circle_thread_reactions_thread
  on public.circle_thread_reactions (thread_id);

alter table public.circle_thread_reactions enable row level security;

create or replace function public.user_can_react_to_circle_thread(p_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_threads t
    join public.community_members cm on cm.community_id = t.community_id
    where t.id = p_thread_id
      and t.moderation_status = 'active'
      and t.deleted_at is null
      and cm.user_id = (select auth.uid())
  );
$$;

create or replace function public.sync_circle_thread_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if tg_op = 'INSERT' then
      update public.circle_threads
      set reaction_count = reaction_count + 1
      where id = new.thread_id;
    elsif tg_op = 'DELETE' then
      update public.circle_threads
      set reaction_count = greatest(0, reaction_count - 1)
      where id = old.thread_id;
    end if;
  exception when others then
    perform public.log_trigger_error(
      'sync_circle_thread_reaction_count', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('thread_id', coalesce(new.thread_id, old.thread_id))
    );
  end;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_circle_thread_reactions_sync_count on public.circle_thread_reactions;
create trigger trg_circle_thread_reactions_sync_count
  after insert or delete on public.circle_thread_reactions
  for each row execute function public.sync_circle_thread_reaction_count();

drop policy if exists "Users can view circle thread reactions" on public.circle_thread_reactions;
create policy "Users can view circle thread reactions"
  on public.circle_thread_reactions for select
  using (true);

drop policy if exists "Members can react to circle threads" on public.circle_thread_reactions;
create policy "Members can react to circle threads"
  on public.circle_thread_reactions for insert
  with check (
    (select auth.uid()) = user_id
    and public.user_can_react_to_circle_thread(thread_id)
  );

drop policy if exists "Users can remove own circle thread reactions" on public.circle_thread_reactions;
create policy "Users can remove own circle thread reactions"
  on public.circle_thread_reactions for delete
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.circle_thread_reactions to authenticated;
grant all on public.circle_thread_reactions to service_role;

-- ---------------------------------------------------------------------------
-- 3. Auto pending_review on reported circle threads / replies (3+ pending reports)
-- ---------------------------------------------------------------------------
create or replace function public.auto_moderate_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_count int;
begin
  select count(*) into report_count
  from public.reports
  where target_type = new.target_type
    and target_id = new.target_id
    and status = 'pending';

  if report_count >= 5 and new.target_type = 'post' then
    update public.posts
    set privacy_mode = 'private'
    where id = new.target_id::uuid;
  elsif report_count >= 3 and new.target_type = 'circle_thread' then
    update public.circle_threads
    set
      moderation_status = 'pending_review',
      moderated_at = now(),
      moderation_reason = coalesce(moderation_reason, 'Auto-queued after multiple reports')
    where id = new.target_id::uuid
      and moderation_status = 'active';
  elsif report_count >= 3 and new.target_type = 'circle_reply' then
    update public.circle_replies
    set
      moderation_status = 'pending_review',
      moderated_at = now(),
      moderation_reason = coalesce(moderation_reason, 'Auto-queued after multiple reports')
    where id = new.target_id::uuid
      and moderation_status = 'active';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. PostgREST privacy — definer viewer-safe views + tighter base-table SELECT
--    (SECURITY DEFINER is intentional for Confessions/anonymous masking;
--     Supabase Security Advisor may still flag these as CRITICAL — expected.)
-- ---------------------------------------------------------------------------
revoke select on public.posts from anon;
revoke select on public.comments from anon;
revoke select on public.circle_threads from anon;
revoke select on public.circle_replies from anon;

drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Posts viewable with anonymous author guard" on public.posts;
create policy "Posts viewable with anonymous author guard"
  on public.posts for select
  using (
    coalesce(is_anonymous, false) = false
    or (select auth.uid()) = creator_id
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

drop policy if exists "Comments are viewable by everyone" on public.comments;
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
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

drop policy if exists "Circle threads are viewable by everyone" on public.circle_threads;
drop policy if exists "Circle threads viewable with confessions author guard" on public.circle_threads;
create policy "Circle threads viewable with confessions author guard"
  on public.circle_threads for select
  using (
    not public.community_is_confessions(community_id)
    or (select auth.uid()) = author_id
    or public.can_moderate_circle_for_user(community_id, (select auth.uid()))
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
    )
  );

drop policy if exists "Circle replies are viewable by everyone" on public.circle_replies;
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
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and coalesce(p.role_admin, false) = true
          )
        )
    )
  );

create or replace function public.viewer_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and coalesce(p.role_admin, false) = true
  );
$$;

comment on function public.viewer_is_staff() is
  'True when the current JWT user is global staff (profiles.role_admin).';

create or replace function public.viewer_can_read_post_row(
  p_creator_id uuid,
  p_privacy_mode text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_privacy_mode, 'public') = 'public'
    or (select auth.uid()) is not distinct from p_creator_id
    or public.viewer_is_staff();
$$;

create or replace function public.viewer_can_read_circle_thread_row(
  p_community_id uuid,
  p_author_id uuid,
  p_moderation_status text,
  p_deleted_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      coalesce(p_moderation_status, 'active') = 'active'
      and p_deleted_at is null
    )
    or (select auth.uid()) is not distinct from p_author_id
    or public.can_moderate_circle_for_user(p_community_id, (select auth.uid()))
    or public.viewer_is_staff();
$$;

create or replace function public.viewer_can_read_circle_reply_row(
  p_community_id uuid,
  p_author_id uuid,
  p_moderation_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p_moderation_status, 'active') = 'active'
    or (select auth.uid()) is not distinct from p_author_id
    or public.can_moderate_circle_for_user(p_community_id, (select auth.uid()))
    or public.viewer_is_staff();
$$;

drop view if exists public.posts_viewer_safe;

create view public.posts_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  p.id,
  public.viewer_safe_creator_id(p.creator_id, p.is_anonymous) as creator_id,
  p.type,
  p.caption,
  p.created_at,
  p.edited_at,
  p.media_url,
  p.thumbnail_url,
  p.additional_media,
  p.hashtags,
  p.communities,
  p.feed_type_eligible,
  p.role_context,
  p.specialty_context,
  p.location_context,
  p.is_anonymous,
  p.privacy_mode,
  p.like_count,
  p.comment_count,
  p.share_count,
  p.view_count,
  p.save_count,
  p.reaction_heart_count,
  p.reaction_haha_count,
  p.reaction_wow_count,
  p.reaction_sad_count,
  p.reaction_angry_count,
  p.reaction_clap_count,
  p.ranking_score,
  p.sound_title,
  p.sound_source_post_id,
  p.sound_source_media_url,
  p.stitch_source_post_id,
  p.source_live_stream_id,
  p.source_post_id,
  p.source_creator_id,
  p.duet_parent_id,
  p.duet_layout_mode,
  p.video_look_id,
  p.video_overlay_text,
  p.mood_preset,
  p.cover_alt_url,
  p.clip_start_seconds,
  p.clip_end_seconds,
  p.allow_viewer_clips,
  p.allow_remix,
  p.allow_clip_downloads,
  p.comments_disabled,
  p.is_education,
  p.evidence_label,
  p.evidence_url,
  p.education_citations,
  p.shift_context,
  p.scheduled_status,
  p.scheduled_at,
  p.series_id,
  p.series_part,
  p.series_total,
  p.media_processing_status,
  p.media_processing_error,
  p.media_processing_job_id
from public.posts p
where public.viewer_can_read_post_row(p.creator_id, p.privacy_mode);

comment on view public.posts_viewer_safe is
  'SECURITY DEFINER (intentional): masks anonymous creator_id; filters private/hidden rows per viewer.';

grant select on public.posts_viewer_safe to anon, authenticated, service_role;

drop view if exists public.comments_viewer_safe;

create view public.comments_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  c.id,
  c.post_id,
  public.viewer_safe_creator_id(c.author_id, coalesce(p.is_anonymous, false)) as author_id,
  c.parent_id,
  c.content,
  c.created_at,
  c.like_count,
  c.reaction_heart_count,
  c.reaction_haha_count,
  c.reaction_wow_count,
  c.reaction_sad_count,
  c.reaction_angry_count,
  c.reaction_clap_count,
  c.media_url,
  c.deleted_at
from public.comments c
join public.posts p on p.id = c.post_id
where c.deleted_at is null
  and public.viewer_can_read_post_row(p.creator_id, p.privacy_mode);

comment on view public.comments_viewer_safe is
  'SECURITY DEFINER (intentional): masks comment author on anonymous posts; inherits post visibility.';

grant select on public.comments_viewer_safe to anon, authenticated, service_role;

drop view if exists public.circle_threads_viewer_safe;

create view public.circle_threads_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  t.id,
  t.community_id,
  public.viewer_safe_circle_author_id(t.author_id, t.community_id) as author_id,
  t.kind,
  t.title,
  t.body,
  t.media_thumb_url,
  t.linked_post_id,
  t.created_at,
  t.updated_at,
  t.reply_count,
  t.reaction_count,
  t.share_count,
  t.deleted_at,
  t.deleted_by,
  t.moderation_status,
  t.moderated_by,
  t.moderated_at,
  t.moderation_reason
from public.circle_threads t
where public.viewer_can_read_circle_thread_row(
  t.community_id,
  t.author_id,
  t.moderation_status,
  t.deleted_at
);

comment on view public.circle_threads_viewer_safe is
  'SECURITY DEFINER (intentional): masks Confessions author_id; filters moderated/deleted unless staff/mod/author.';

grant select on public.circle_threads_viewer_safe to anon, authenticated, service_role;

drop view if exists public.circle_replies_viewer_safe;

create view public.circle_replies_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  cr.id,
  cr.thread_id,
  public.viewer_safe_circle_author_id(cr.author_id, ct.community_id) as author_id,
  cr.body,
  cr.created_at,
  cr.reaction_count,
  cr.moderation_status,
  cr.moderated_by,
  cr.moderated_at,
  cr.moderation_reason
from public.circle_replies cr
join public.circle_threads ct on ct.id = cr.thread_id
where public.viewer_can_read_circle_reply_row(
  ct.community_id,
  cr.author_id,
  cr.moderation_status
);

comment on view public.circle_replies_viewer_safe is
  'SECURITY DEFINER (intentional): masks Confessions reply author_id; filters moderated replies unless staff/mod/author.';

grant select on public.circle_replies_viewer_safe to anon, authenticated, service_role;
