-- Sprint 2E: Large-Circle notification digest (replaces per-post fan-out beyond 250 members).
-- Small Circles (<=250 notify-enabled members): unchanged direct circle_new_post rows.
-- Large Circles (>250): one digest notification per user per Circle per 60-minute UTC window.
-- Confessions: actor_id stays null; digest copy never exposes real authors.
-- Preserves migration 216/217/220 author exclusion + notify_new_posts + anonymous redaction.
-- circle_post_notification_fanout remains for draining legacy pending jobs only.

-- ---------------------------------------------------------------------------
-- 1. Digest state (service-role / definer only — no client reads)
-- ---------------------------------------------------------------------------
create table if not exists public.circle_notification_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  post_count int not null default 1 check (post_count >= 1),
  latest_post_id uuid references public.posts(id) on delete set null,
  latest_activity_at timestamptz not null default now(),
  notification_id uuid references public.notifications(id) on delete set null,
  is_confessions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, community_id, window_start)
);

create index if not exists idx_circle_notification_digests_community_window
  on public.circle_notification_digests (community_id, window_start desc);

comment on table public.circle_notification_digests is
  'Rolling digest windows for large-Circle wall posts; links to a single in-app notification row per user/Circle/window.';

alter table public.circle_notification_digests enable row level security;

revoke all on public.circle_notification_digests from anon, authenticated;
grant all on public.circle_notification_digests to service_role;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.circle_notify_direct_max()
returns int
language sql
immutable
as $$ select 250 $$;

create or replace function public.circle_digest_window_minutes()
returns int
language sql
immutable
as $$ select 60 $$;

create or replace function public.circle_digest_window_bounds(p_at timestamptz default now())
returns table (window_start timestamptz, window_end timestamptz)
language sql
stable
as $$
  select
    date_trunc('hour', timezone('utc', p_at)),
    date_trunc('hour', timezone('utc', p_at))
      + make_interval(mins => public.circle_digest_window_minutes());
$$;

comment on function public.circle_digest_window_bounds(timestamptz) is
  'UTC hour-aligned digest buckets (default 60 minutes).';

create or replace function public.format_circle_digest_message(
  p_post_count int,
  p_community_name text,
  p_is_confessions boolean
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_is_confessions, false) and greatest(coalesce(p_post_count, 1), 1) <= 1 then
      'New activity in Confessions'
    when coalesce(p_is_confessions, false) then
      greatest(coalesce(p_post_count, 1), 1)::text || ' new posts in Confessions'
    when greatest(coalesce(p_post_count, 1), 1) <= 1 then
      'New post in ' || coalesce(nullif(btrim(p_community_name), ''), 'a circle you joined')
    else
      greatest(coalesce(p_post_count, 1), 1)::text
        || ' new posts in '
        || coalesce(nullif(btrim(p_community_name), ''), 'a circle you joined')
  end;
$$;

-- Set-based digest upsert for all notify-enabled members in a large Circle.
create or replace function public.notify_large_circle_post_digest(
  p_post_id uuid,
  p_community_id uuid,
  p_creator_id uuid,
  p_redact_actor boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_community_name text;
  v_is_confessions boolean;
  v_window_start timestamptz;
  v_window_end timestamptz;
begin
  select c.name, public.community_is_confessions(p_community_id)
    into v_community_name, v_is_confessions
  from public.communities c
  where c.id = p_community_id;

  select wb.window_start, wb.window_end
    into v_window_start, v_window_end
  from public.circle_digest_window_bounds(now()) wb;

  -- Bump existing digest windows + linked notification copy.
  with existing as (
    select d.id as digest_id, d.notification_id, d.post_count
    from public.circle_notification_digests d
    where d.community_id = p_community_id
      and d.window_start = v_window_start
      and d.user_id in (
        select cm.user_id
        from public.community_members cm
        where cm.community_id = p_community_id
          and cm.user_id is distinct from p_creator_id
          and cm.notify_new_posts is true
      )
  ),
  bumped as (
    update public.circle_notification_digests d
    set
      post_count = d.post_count + 1,
      latest_post_id = p_post_id,
      latest_activity_at = now(),
      updated_at = now()
    from existing e
    where d.id = e.digest_id
    returning d.notification_id, d.post_count, d.is_confessions
  )
  update public.notifications n
  set message = public.format_circle_digest_message(
    b.post_count,
    v_community_name,
    coalesce(b.is_confessions, v_is_confessions)
  )
  from bumped b
  where n.id = b.notification_id;

  -- First post in this window for members without an active digest row.
  with window_bounds as (
    select v_window_start as window_start, v_window_end as window_end
  ),
  recipients as (
    select cm.user_id
    from public.community_members cm
    where cm.community_id = p_community_id
      and cm.user_id is distinct from p_creator_id
      and cm.notify_new_posts is true
      and not exists (
        select 1
        from public.circle_notification_digests d
        where d.user_id = cm.user_id
          and d.community_id = p_community_id
          and d.window_start = v_window_start
      )
  ),
  inserted_notifications as (
    insert into public.notifications (
      user_id, actor_id, type, message, target_id, read, community_id
    )
    select
      r.user_id,
      null,
      'circle_post_digest',
      public.format_circle_digest_message(1, v_community_name, v_is_confessions),
      p_community_id::text,
      false,
      p_community_id
    from recipients r
    returning id, user_id
  )
  insert into public.circle_notification_digests (
    user_id,
    community_id,
    window_start,
    window_end,
    post_count,
    latest_post_id,
    latest_activity_at,
    notification_id,
    is_confessions
  )
  select
    ins.user_id,
    p_community_id,
    wb.window_start,
    wb.window_end,
    1,
    p_post_id,
    now(),
    ins.id,
    v_is_confessions
  from inserted_notifications ins
  cross join window_bounds wb;
end;
$$;

comment on function public.notify_large_circle_post_digest(uuid, uuid, uuid, boolean) is
  'Large-Circle wall post digest: upserts one notification per member per 60-minute UTC window.';

revoke all on function public.notify_large_circle_post_digest(uuid, uuid, uuid, boolean) from public;
grant execute on function public.notify_large_circle_post_digest(uuid, uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Wall-post trigger — small Circle direct fan-out, large Circle digest
-- ---------------------------------------------------------------------------
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
  v_notify_count int;
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

      select count(*)::int
        into v_notify_count
      from public.community_members cm
      where cm.community_id = v_community_id
        and cm.user_id is distinct from new.creator_id
        and cm.notify_new_posts is true;

      if coalesce(v_notify_count, 0) <= public.circle_notify_direct_max() then
        insert into public.notifications (user_id, actor_id, type, message, target_id, read, community_id)
        select
          cm.user_id,
          case when v_redact_actor then null else new.creator_id end,
          'circle_new_post',
          v_message,
          new.id::text,
          false,
          v_community_id
        from public.community_members cm
        where cm.community_id = v_community_id
          and cm.user_id is distinct from new.creator_id
          and cm.notify_new_posts is true
        order by cm.joined_at desc;
      else
        perform public.notify_large_circle_post_digest(
          new.id,
          v_community_id,
          new.creator_id,
          v_redact_actor
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
  'Small Circles (<=250 notify-enabled members): direct circle_new_post. Larger Circles: 60-minute digest upsert (circle_post_digest).';
