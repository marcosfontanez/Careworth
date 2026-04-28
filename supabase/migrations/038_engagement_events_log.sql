-- Append-only audit log of every engagement action (like, save, follow, comment).
-- Lets us recover/rebuild post_likes / saved_posts / follows / comments if the
-- denormalised tables ever get corrupted (bad migration, bad delete cascade,
-- bad RLS policy, etc.) and gives us a permanent paper trail of "who liked
-- what when" that survives schema changes.
--
-- Design rules:
--   1. Triggers write events from inside the same transaction as the source
--      INSERT/DELETE, so if the user's like commits, the event commits.
--   2. The event-write itself is wrapped in EXCEPTION WHEN OTHERS -- if the
--      log table is broken for any reason, the user's primary action MUST
--      still succeed. Logging is best-effort.
--   3. Clients can read their OWN history (RLS), but cannot insert / update /
--      delete -- the only writer is `append_engagement_event` running under
--      security definer from the source-table triggers.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.engagement_events (
  id           bigserial primary key,
  user_id      uuid not null,
  event_type   text not null check (event_type in (
                  'like','unlike',
                  'save','unsave',
                  'follow','unfollow',
                  'comment','comment_delete'
                )),
  target_id    uuid,                  -- post_id, profile_id, comment_id (nullable for forward compat)
  target_kind  text,                  -- 'post','profile','comment'
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now()
);

create index if not exists ix_engagement_events_user_time
  on public.engagement_events (user_id, occurred_at desc);

create index if not exists ix_engagement_events_target_time
  on public.engagement_events (target_kind, target_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- RLS: read your own history; nobody can write directly.
-- ---------------------------------------------------------------------------
alter table public.engagement_events enable row level security;

drop policy if exists "engagement_events_select_self" on public.engagement_events;
create policy "engagement_events_select_self" on public.engagement_events
  for select using (auth.uid() = user_id);

revoke insert, update, delete on public.engagement_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper: append one event. ALWAYS swallow errors so callers (triggers) never
-- block the user's primary write.
-- ---------------------------------------------------------------------------
create or replace function public.append_engagement_event(
  p_user_id     uuid,
  p_event_type  text,
  p_target_id   uuid,
  p_target_kind text,
  p_payload     jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.engagement_events (user_id, event_type, target_id, target_kind, payload)
    values (p_user_id, p_event_type, p_target_id, p_target_kind, coalesce(p_payload, '{}'::jsonb));
  exception when others then
    -- Logging must never break the parent transaction. Drop the event silently.
    null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers on the source tables.
-- ---------------------------------------------------------------------------

-- Likes
create or replace function public.log_post_like_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_engagement_event(new.user_id, 'like',   new.post_id, 'post');
  elsif tg_op = 'DELETE' then
    perform public.append_engagement_event(old.user_id, 'unlike', old.post_id, 'post');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_post_like_event on public.post_likes;
create trigger tr_log_post_like_event
  after insert or delete on public.post_likes
  for each row execute function public.log_post_like_event();

-- Saves
create or replace function public.log_saved_post_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_engagement_event(new.user_id, 'save',   new.post_id, 'post');
  elsif tg_op = 'DELETE' then
    perform public.append_engagement_event(old.user_id, 'unsave', old.post_id, 'post');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_saved_post_event on public.saved_posts;
create trigger tr_log_saved_post_event
  after insert or delete on public.saved_posts
  for each row execute function public.log_saved_post_event();

-- Follows
create or replace function public.log_follow_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_engagement_event(new.follower_id, 'follow',   new.following_id, 'profile');
  elsif tg_op = 'DELETE' then
    perform public.append_engagement_event(old.follower_id, 'unfollow', old.following_id, 'profile');
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_follow_event on public.follows;
create trigger tr_log_follow_event
  after insert or delete on public.follows
  for each row execute function public.log_follow_event();

-- Comments
create or replace function public.log_comment_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.append_engagement_event(
      new.author_id, 'comment', new.post_id, 'post',
      jsonb_build_object('comment_id', new.id, 'parent_id', new.parent_id)
    );
  elsif tg_op = 'DELETE' then
    perform public.append_engagement_event(
      old.author_id, 'comment_delete', old.post_id, 'post',
      jsonb_build_object('comment_id', old.id, 'parent_id', old.parent_id)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_log_comment_event on public.comments;
create trigger tr_log_comment_event
  after insert or delete on public.comments
  for each row execute function public.log_comment_event();

-- ---------------------------------------------------------------------------
-- Backfill: synthesise events from current state so existing rows aren't lost.
-- Uses created_at where available, else now(). Safe to re-run (only fills if
-- the events table is empty, so we don't double-count if someone re-applies).
-- ---------------------------------------------------------------------------
do $backfill$
begin
  if (select count(*) from public.engagement_events) = 0 then
    insert into public.engagement_events (user_id, event_type, target_id, target_kind, payload, occurred_at)
    select user_id, 'like', post_id, 'post', '{}'::jsonb, coalesce(created_at, now())
    from public.post_likes;

    insert into public.engagement_events (user_id, event_type, target_id, target_kind, payload, occurred_at)
    select user_id, 'save', post_id, 'post', '{}'::jsonb, coalesce(saved_at, now())
    from public.saved_posts;

    insert into public.engagement_events (user_id, event_type, target_id, target_kind, payload, occurred_at)
    select follower_id, 'follow', following_id, 'profile', '{}'::jsonb, coalesce(created_at, now())
    from public.follows;

    insert into public.engagement_events (user_id, event_type, target_id, target_kind, payload, occurred_at)
    select author_id, 'comment', post_id, 'post',
           jsonb_build_object('comment_id', id, 'parent_id', parent_id),
           coalesce(created_at, now())
    from public.comments;
  end if;
end
$backfill$;
