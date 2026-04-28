-- 049 — Global @mention system.
--
-- Provides:
--   1. `public.mentions` join table — one row per (content, mentioned user).
--      Indexed for "who was mentioned in X" and "everywhere Y was mentioned".
--   2. `public.extract_handles(body text) → text[]` — deterministic parser
--      that matches the client-side regex used by CaptionWithMentions and
--      the MentionAutocomplete composer.
--   3. `public.record_mentions(...)` — resolves handles to profile ids,
--      inserts dedup rows into `public.mentions`, and emits a `mention`
--      notification per unique target (skipping self-mentions).
--   4. Trigger wrappers on every text-bearing content table:
--        profile_updates, posts, comments, circle_threads, circle_replies.
--      All wrap the body in EXCEPTION WHEN OTHERS so a malformed handle
--      NEVER rolls back the user's primary write. Errors go to
--      `trigger_errors` for later inspection (see migration 039 pattern).
--
-- We deliberately do NOT fire on UPDATE in this migration — users can still
-- edit content without causing duplicate notifications. A future migration
-- can add diff-aware mention editing if the product calls for it.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.mentions (
  id                   uuid primary key default gen_random_uuid(),
  content_type         text not null
    check (content_type in (
      'profile_update', 'post', 'post_comment', 'circle_thread', 'circle_reply'
    )),
  content_id           uuid not null,
  mentioned_user_id    uuid not null references public.profiles(id) on delete cascade,
  mentioner_id         uuid not null references public.profiles(id) on delete cascade,
  created_at           timestamptz not null default now(),
  unique (content_type, content_id, mentioned_user_id)
);

create index if not exists ix_mentions_mentioned_user
  on public.mentions (mentioned_user_id, created_at desc);

create index if not exists ix_mentions_mentioner
  on public.mentions (mentioner_id, created_at desc);

create index if not exists ix_mentions_content
  on public.mentions (content_type, content_id);

alter table public.mentions enable row level security;

-- Authors of the content + the mentioned users can read their own rows.
-- Keeping this permissive-read since mentions are derived from public text.
create policy "Mentions are readable by everyone"
  on public.mentions for select using (true);

-- Inserts only flow from SECURITY DEFINER triggers, but explicitly deny
-- direct client inserts/updates/deletes.
revoke insert, update, delete on public.mentions from anon, authenticated;

comment on table public.mentions is
  'Global @mention graph. Populated by SECURITY DEFINER triggers on every text-bearing content table.';

-- ---------------------------------------------------------------------------
-- Handle parser
-- ---------------------------------------------------------------------------
-- Matches client-side regex: /@([a-zA-Z0-9_.]+)/g. Returns a distinct, trimmed,
-- lowercased array of handles. Caps at 20 to avoid pathological triggers.
create or replace function public.extract_handles(body text)
returns text[]
language plpgsql
immutable
as $$
declare
  result text[];
begin
  if body is null or length(body) = 0 then
    return '{}'::text[];
  end if;
  select coalesce(array_agg(distinct lower(m[1])), '{}'::text[])
    into result
    from regexp_matches(body, '@([a-zA-Z0-9_.]{3,30})', 'g') as m;
  if array_length(result, 1) is null then
    return '{}'::text[];
  end if;
  if array_length(result, 1) > 20 then
    result := result[1:20];
  end if;
  return result;
end;
$$;

comment on function public.extract_handles(text) is
  'Extracts unique lowercased @handles from text, matching the client regex. Caps at 20.';

-- ---------------------------------------------------------------------------
-- Core recorder: mentions + notifications in one place.
-- ---------------------------------------------------------------------------
create or replace function public.record_mentions(
  p_content_type text,
  p_content_id   uuid,
  p_author_id    uuid,
  p_body         text,
  p_message      text,
  p_notify_target_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  handles  text[];
  h        text;
  target_id uuid;
  notify_target text;
begin
  if p_content_id is null or p_author_id is null then
    return;
  end if;

  handles := public.extract_handles(coalesce(p_body, ''));
  if array_length(handles, 1) is null then
    return;
  end if;

  -- Encode the target as `{content_type}:{id}` so the client can route
  -- unambiguously (post → /post, profile_update → /my-pulse, thread → /circles).
  notify_target := p_content_type || ':' || coalesce(p_notify_target_id, p_content_id::text);

  foreach h in array handles loop
    select id into target_id from public.profiles where username = h limit 1;
    if target_id is null then
      continue;
    end if;
    if target_id = p_author_id then
      continue;
    end if;

    begin
      insert into public.mentions (
        content_type, content_id, mentioned_user_id, mentioner_id
      ) values (
        p_content_type, p_content_id, target_id, p_author_id
      )
      on conflict (content_type, content_id, mentioned_user_id) do nothing;

      -- Only emit a notification when the mention row is actually new.
      if found then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read)
        values (
          target_id,
          p_author_id,
          'mention',
          p_message,
          notify_target,
          false
        );
      end if;
    exception when others then
      perform public.log_trigger_error(
        'record_mentions', 'INSERT', p_content_type, sqlstate, sqlerrm,
        jsonb_build_object(
          'content_id', p_content_id,
          'author_id',  p_author_id,
          'handle',     h
        )
      );
    end;
  end loop;
end;
$$;

comment on function public.record_mentions(text, uuid, uuid, text, text, text) is
  'Resolves handles in `p_body`, writes into public.mentions and public.notifications, and swallows any failure to avoid breaking the primary insert.';

-- ---------------------------------------------------------------------------
-- Per-table trigger wrappers
-- ---------------------------------------------------------------------------

-- profile_updates — body is stored in `content` (and optionally `preview_text`)
create or replace function public.mentions_for_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_handle text;
begin
  begin
    select username into author_handle from public.profiles where id = new.user_id;
    perform public.record_mentions(
      'profile_update',
      new.id,
      new.user_id,
      coalesce(new.content, '') || ' ' || coalesce(new.preview_text, ''),
      coalesce('@' || author_handle, 'Someone')
        || ' mentioned you in their Pulse',
      new.id::text
    );
  exception when others then
    perform public.log_trigger_error(
      'mentions_for_profile_update', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('profile_update_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_profile_updates_mentions on public.profile_updates;
create trigger tr_profile_updates_mentions
  after insert on public.profile_updates
  for each row execute function public.mentions_for_profile_update();

-- posts — body lives in `caption`
create or replace function public.mentions_for_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_handle text;
begin
  begin
    select username into author_handle from public.profiles where id = new.creator_id;
    perform public.record_mentions(
      'post',
      new.id,
      new.creator_id,
      coalesce(new.caption, ''),
      coalesce('@' || author_handle, 'Someone') || ' mentioned you in a post',
      new.id::text
    );
  exception when others then
    perform public.log_trigger_error(
      'mentions_for_post', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('post_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_posts_mentions on public.posts;
create trigger tr_posts_mentions
  after insert on public.posts
  for each row execute function public.mentions_for_post();

-- comments — body lives in `content` (schema from 001_initial_schema.sql)
create or replace function public.mentions_for_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_handle text;
begin
  begin
    select username into author_handle from public.profiles where id = new.author_id;
    perform public.record_mentions(
      'post_comment',
      new.id,
      new.author_id,
      coalesce(new.content, ''),
      coalesce('@' || author_handle, 'Someone') || ' mentioned you in a comment',
      new.post_id::text
    );
  exception when others then
    perform public.log_trigger_error(
      'mentions_for_comment', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('comment_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_comments_mentions on public.comments;
create trigger tr_comments_mentions
  after insert on public.comments
  for each row execute function public.mentions_for_comment();

-- circle_threads — title + body
create or replace function public.mentions_for_circle_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_handle text;
begin
  begin
    select username into author_handle from public.profiles where id = new.author_id;
    perform public.record_mentions(
      'circle_thread',
      new.id,
      new.author_id,
      coalesce(new.title, '') || ' ' || coalesce(new.body, ''),
      coalesce('@' || author_handle, 'Someone') || ' mentioned you in a circle thread',
      new.id::text
    );
  exception when others then
    perform public.log_trigger_error(
      'mentions_for_circle_thread', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('thread_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_circle_threads_mentions on public.circle_threads;
create trigger tr_circle_threads_mentions
  after insert on public.circle_threads
  for each row execute function public.mentions_for_circle_thread();

-- circle_replies — body
create or replace function public.mentions_for_circle_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_handle text;
begin
  begin
    select username into author_handle from public.profiles where id = new.author_id;
    perform public.record_mentions(
      'circle_reply',
      new.id,
      new.author_id,
      coalesce(new.body, ''),
      coalesce('@' || author_handle, 'Someone') || ' mentioned you in a circle reply',
      new.thread_id::text
    );
  exception when others then
    perform public.log_trigger_error(
      'mentions_for_circle_reply', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('reply_id', new.id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_circle_replies_mentions on public.circle_replies;
create trigger tr_circle_replies_mentions
  after insert on public.circle_replies
  for each row execute function public.mentions_for_circle_reply();
