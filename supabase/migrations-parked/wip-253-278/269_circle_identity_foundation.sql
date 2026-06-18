-- Circle identity: room metadata, pinned welcome/rules threads, expanded flair tags, top helpers.

-- ---------------------------------------------------------------------------
-- 1. communities.metadata — welcome copy, rules, weekly prompt override
-- ---------------------------------------------------------------------------
alter table public.communities
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.communities.metadata is
  'Circle identity config: welcome_copy, rules[], weekly_prompt{}, welcome_thread_id (legacy fallback).';

-- ---------------------------------------------------------------------------
-- 2. Expanded thread flair (display/filter beyond coarse kind)
-- ---------------------------------------------------------------------------
alter table public.circle_threads
  add column if not exists flair_tag text null;

alter table public.circle_threads
  drop constraint if exists circle_threads_flair_tag_check;

alter table public.circle_threads
  add constraint circle_threads_flair_tag_check check (
    flair_tag is null
    or flair_tag in (
      'question',
      'story',
      'humor',
      'career_advice',
      'caregiver_support',
      'student_help',
      'education',
      'rant_vent',
      'mythbuster',
      'live_qa'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Pinned threads (welcome / rules / highlight)
-- ---------------------------------------------------------------------------
create table if not exists public.community_thread_pins (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  thread_id uuid not null references public.circle_threads (id) on delete cascade,
  pin_role text not null default 'highlight'
    check (pin_role in ('welcome', 'rules', 'highlight')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (community_id, thread_id)
);

create unique index if not exists idx_community_thread_pins_one_welcome
  on public.community_thread_pins (community_id)
  where pin_role = 'welcome';

create unique index if not exists idx_community_thread_pins_one_rules
  on public.community_thread_pins (community_id)
  where pin_role = 'rules';

create index if not exists idx_community_thread_pins_community_sort
  on public.community_thread_pins (community_id, sort_order);

alter table public.community_thread_pins enable row level security;

drop policy if exists "Community thread pins are viewable by everyone" on public.community_thread_pins;
create policy "Community thread pins are viewable by everyone"
  on public.community_thread_pins for select using (true);

drop policy if exists "Admins can manage community thread pins" on public.community_thread_pins;
create policy "Admins can manage community thread pins"
  on public.community_thread_pins for all
  using (public.current_user_role_admin());

-- ---------------------------------------------------------------------------
-- 4. Refresh viewer-safe threads (include flair_tag)
-- ---------------------------------------------------------------------------
drop view if exists public.circle_threads_viewer_safe;

create view public.circle_threads_viewer_safe
with (security_invoker = false, security_barrier = true) as
select
  t.id,
  t.community_id,
  public.viewer_safe_circle_author_id(t.author_id, t.community_id) as author_id,
  t.kind,
  t.flair_tag,
  case
    when public.community_is_confessions(t.community_id)
      and (select auth.uid()) is null
      and not public.viewer_is_staff()
    then null::text
    else t.title
  end as title,
  case
    when public.community_is_confessions(t.community_id)
      and (select auth.uid()) is null
      and not public.viewer_is_staff()
    then null::text
    else t.body
  end as body,
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
  'SECURITY DEFINER: masks Confessions author_id; hides title/body for anonymous web; filters moderated/deleted unless staff/mod/author.';

grant select on public.circle_threads_viewer_safe to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Top helpers this week (non-confession rooms only)
-- ---------------------------------------------------------------------------
create or replace function public.get_circle_top_helpers(
  p_community_id uuid,
  p_limit int default 3
)
returns table (
  user_id uuid,
  helpful_count bigint,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cr.author_id as user_id,
    count(*)::bigint as helpful_count,
    coalesce(nullif(trim(p.display_name), ''), 'Member') as display_name
  from public.circle_reply_reactions crr
  join public.circle_replies cr on cr.id = crr.reply_id
  join public.circle_threads t on t.id = cr.thread_id
  join public.profiles p on p.id = cr.author_id
  where t.community_id = p_community_id
    and crr.reaction_type = 'helpful'
    and crr.created_at >= (now() - interval '7 days')
    and cr.moderation_status = 'active'
    and t.moderation_status = 'active'
    and t.deleted_at is null
    and not public.community_is_confessions(p_community_id)
    and cr.author_id <> '00000000-0000-0000-0000-000000000001'::uuid
  group by cr.author_id, p.display_name
  order by helpful_count desc, cr.author_id
  limit greatest(1, least(coalesce(p_limit, 3), 10));
$$;

revoke all on function public.get_circle_top_helpers(uuid, int) from public;
grant execute on function public.get_circle_top_helpers(uuid, int) to authenticated;
grant execute on function public.get_circle_top_helpers(uuid, int) to service_role;
