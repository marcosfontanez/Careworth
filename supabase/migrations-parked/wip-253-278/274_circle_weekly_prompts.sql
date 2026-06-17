-- Migration 274: Circle weekly AI "This Week" prompts
--
-- Adds the storage + read path for the AI-powered weekly conversation starter
-- system. One prompt per Circle per week (Monday-anchored). History is retained
-- permanently (rows are never deleted by the app) so the generator can avoid
-- repetition and the performance layer (migration 276) can score each prompt.
--
-- Model notes (see audit):
--   - "Circles" are rows in public.communities (NOT a `circles` table). The task
--     spec named the FK `circles(id)`; the real table is `communities(id)`.
--   - There is no is_active/is_discoverable column — every communities row is
--     discoverable, so weekly prompts are generated for ALL Circles (healthcare,
--     Confessions, and the new general-public Circles).
--   - The "This Week" CTA in app/communities/[slug] opens the composer with
--     intent='thread', which creates a `circle_threads` row (Questions tab). It
--     can also create a wall `posts` row (meme/video). We add a nullable
--     `weekly_prompt_id` to BOTH so engagement can be attributed either way.
--   - RLS: anyone may READ active prompts (they are not user data); only the
--     service role / server may write. This does not touch existing Circle RLS.
--
-- Idempotent: safe to re-run (IF NOT EXISTS, drop-then-create policies).

-- ---------------------------------------------------------------------------
-- 0. Week-start helper (Monday-anchored, UTC date). Used by read + metrics.
-- ---------------------------------------------------------------------------
create or replace function public.circle_week_start(p_ts timestamptz default now())
returns date
language sql
immutable
as $$
  -- Postgres date_trunc('week', ...) is ISO (Monday) based.
  select (date_trunc('week', (p_ts at time zone 'UTC')))::date;
$$;

comment on function public.circle_week_start(timestamptz) is
  'Monday-anchored (ISO) week start date for a timestamp, in UTC. Shared by weekly-prompt read + metrics.';

-- ---------------------------------------------------------------------------
-- 1. circle_weekly_prompts
-- ---------------------------------------------------------------------------
create table if not exists public.circle_weekly_prompts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.communities(id) on delete cascade,
  circle_slug text not null,
  week_start_date date not null,
  prompt_title text not null,
  prompt_body text not null,
  prompt_cta text,
  prompt_type text not null default 'weekly_conversation_starter',
  prompt_style text,
  generation_source text not null default 'ai',
  model_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint circle_weekly_prompts_circle_week_uq unique (circle_id, week_start_date),
  constraint circle_weekly_prompts_status_ck
    check (status in ('active', 'archived', 'rejected', 'draft'))
);

comment on table public.circle_weekly_prompts is
  'One weekly AI-generated "This Week" conversation starter per Circle (Monday-anchored). History retained for the generator + metrics.';

create index if not exists idx_circle_weekly_prompts_circle on public.circle_weekly_prompts (circle_id);
create index if not exists idx_circle_weekly_prompts_slug on public.circle_weekly_prompts (circle_slug);
create index if not exists idx_circle_weekly_prompts_week on public.circle_weekly_prompts (week_start_date);
create index if not exists idx_circle_weekly_prompts_status on public.circle_weekly_prompts (status);
create index if not exists idx_circle_weekly_prompts_style on public.circle_weekly_prompts (prompt_style);
-- Fast "current active prompt for this Circle" lookups (read path).
create index if not exists idx_circle_weekly_prompts_slug_active_week
  on public.circle_weekly_prompts (circle_slug, week_start_date desc)
  where status = 'active';

alter table public.circle_weekly_prompts enable row level security;

-- Read: anyone may see ACTIVE prompts. They contain no private user data and
-- mirror the public Circle identity. Writes are service-role only (no policy
-- for anon/authenticated => denied; service_role bypasses RLS).
drop policy if exists "Anyone can read active weekly prompts" on public.circle_weekly_prompts;
create policy "Anyone can read active weekly prompts"
  on public.circle_weekly_prompts for select
  using (status = 'active');

revoke all on public.circle_weekly_prompts from anon, authenticated;
grant select on public.circle_weekly_prompts to anon, authenticated;
grant all on public.circle_weekly_prompts to service_role;

-- ---------------------------------------------------------------------------
-- 2. Post / thread linkage — nullable, additive, safe.
--    Normal posting never sets these; they are only populated when a user
--    posts from the "This Week" prompt card. ON DELETE SET NULL so removing a
--    prompt never deletes user content.
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists weekly_prompt_id uuid
  references public.circle_weekly_prompts(id) on delete set null;

alter table public.circle_threads
  add column if not exists weekly_prompt_id uuid
  references public.circle_weekly_prompts(id) on delete set null;

comment on column public.posts.weekly_prompt_id is
  'Set when a wall post was created from a Circle "This Week" prompt card (migration 274). Nullable; normal posts leave it null.';
comment on column public.circle_threads.weekly_prompt_id is
  'Set when a thread was created from a Circle "This Week" prompt card (migration 274). Nullable; normal threads leave it null.';

create index if not exists idx_posts_weekly_prompt
  on public.posts (weekly_prompt_id)
  where weekly_prompt_id is not null;
create index if not exists idx_circle_threads_weekly_prompt
  on public.circle_threads (weekly_prompt_id)
  where weekly_prompt_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Read RPC — current week's active prompt for a Circle (by slug), with a
--    fallback to the most recent active prompt. SECURITY INVOKER so it honors
--    the SELECT RLS above. Returns at most one row.
-- ---------------------------------------------------------------------------
create or replace function public.get_current_circle_weekly_prompt(p_circle_slug text)
returns setof public.circle_weekly_prompts
language sql
stable
security invoker
set search_path = public
as $$
  with current_week as (
    select *
    from public.circle_weekly_prompts
    where circle_slug = lower(btrim(p_circle_slug))
      and status = 'active'
      and week_start_date = public.circle_week_start()
    order by created_at desc
    limit 1
  ),
  latest_active as (
    select *
    from public.circle_weekly_prompts
    where circle_slug = lower(btrim(p_circle_slug))
      and status = 'active'
    order by week_start_date desc, created_at desc
    limit 1
  )
  select * from current_week
  union all
  select * from latest_active
  where not exists (select 1 from current_week)
  limit 1;
$$;

comment on function public.get_current_circle_weekly_prompt(text) is
  'Returns the current-week active weekly prompt for a Circle slug, falling back to the most recent active prompt. Honors RLS (security invoker).';

grant execute on function public.get_current_circle_weekly_prompt(text) to anon, authenticated, service_role;
