-- ============================================================
-- Circle weekly prompts + configs
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 274_circle_weekly_prompts.sql ----------
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
--   - There is no is_active/is_discoverable column â€” every communities row is
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
-- 2. Post / thread linkage â€” nullable, additive, safe.
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
-- 3. Read RPC â€” current week's active prompt for a Circle (by slug), with a
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


-- ---------- source: 275_circle_prompt_configs.sql ----------
-- Migration 275: Circle prompt configs (AI generation guidance per Circle)
--
-- Stores tone / audience / guidance / banned topics / safety notes that the
-- generate-circle-weekly-prompts Edge Function feeds into the model so each
-- Circle gets on-brand, safe prompts. This is OPTIONAL guidance: Circles
-- without a config row still get prompts (the generator falls back to the
-- Circle's name + description + metadata.rules).
--
-- We use a dedicated table (not communities.metadata) because:
--   - It keeps AI guidance / banned topics out of the client-read metadata blob
--     that the mobile app parses on every Circle open.
--   - banned_topics is a first-class text[] the Edge Function can iterate.
--
-- RLS: server-only. Guidance is operational config, not user-facing content.
--
-- Idempotent: IF NOT EXISTS + ON CONFLICT upsert seed.

create table if not exists public.circle_prompt_configs (
  circle_id uuid primary key references public.communities(id) on delete cascade,
  circle_slug text not null,
  tone text,
  audience text,
  prompt_guidance text,
  banned_topics text[] not null default '{}',
  safety_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.circle_prompt_configs is
  'Per-Circle AI prompt-generation guidance (tone/audience/guidance/banned topics/safety). Read by the generate-circle-weekly-prompts Edge Function (service role).';

create index if not exists idx_circle_prompt_configs_slug on public.circle_prompt_configs (circle_slug);

alter table public.circle_prompt_configs enable row level security;

-- Server-only: no anon/authenticated policies => denied. service_role bypasses RLS.
revoke all on public.circle_prompt_configs from anon, authenticated;
grant all on public.circle_prompt_configs to service_role;

-- updated_at touch
create or replace function public.touch_circle_prompt_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_circle_prompt_configs_touch on public.circle_prompt_configs;
create trigger trg_circle_prompt_configs_touch
  before update on public.circle_prompt_configs
  for each row execute function public.touch_circle_prompt_config_updated_at();

-- ---------------------------------------------------------------------------
-- Seed guidance for the general-public Circles (migration 273). Joined to
-- communities by slug so circle_id stays correct. Skips silently if a slug
-- isn't present yet. ON CONFLICT keeps re-runs idempotent.
-- ---------------------------------------------------------------------------
insert into public.circle_prompt_configs
  (circle_id, circle_slug, tone, audience, prompt_guidance, banned_topics, safety_notes)
select c.id, v.slug, v.tone, v.audience, v.guidance, v.banned_topics, v.safety_notes
from (
  values
    (
      'petverse',
      'funny, wholesome, pet-parent friendly',
      'pet owners and animal lovers',
      'Generate prompts about pets, funny pet habits, pet stories, pet reactions, pet photos, and pet videos. Encourage sharing a photo, clip, or short story.',
      array[]::text[],
      'Keep it kind. No animal cruelty content.'
    ),
    (
      'foodie-finds',
      'fun, craving-driven, casual',
      'home cooks, snackers, and restaurant-goers',
      'Generate prompts about meals, snacks, restaurants, recipes, hidden gems, comfort food, and food debates. Encourage a photo or quick story.',
      array[]::text[],
      'No medical/diet claims framed as advice.'
    ),
    (
      'main-character-moments',
      'funny, cinematic, relatable',
      'everyday storytellers',
      'Generate prompts about memorable everyday moments, embarrassing situations, life plot twists, and funny personal stories. Encourage a short story or clip.',
      array[]::text[],
      'No targeting or shaming of identifiable private people.'
    ),
    (
      'the-drama-room',
      'storytime, debate-friendly, safe',
      'people who love tea, debates, and "am I wrong" stories',
      'Generate prompts about petty drama, "am I wrong," relationship situations, neighbor stories, workplace stories, and personal lessons. Frame everything as personal experience or opinion.',
      array['doxxing', 'private names', 'addresses', 'phone numbers', 'workplaces', 'schools', 'targeted accusations', 'revenge posting', 'harassment'],
      'No doxxing, no private names, no addresses, no targeted accusations, no harassment, no revenge posting. Always remind users to keep names and identifying details out.'
    ),
    (
      'laugh-lab',
      'comedic, light, punchy',
      'people who love jokes, memes, and skits',
      'Generate prompts that encourage jokes, skits, memes, harmless fails, parody, and funny everyday moments. Keep it short and shareable.',
      array[]::text[],
      'Comedy must stay harmless â€” no bullying or hate framed as a joke.'
    ),
    (
      'diy-home-glow',
      'inspiring, practical, transformation-focused',
      'home DIYers and decorators',
      'Generate prompts about home projects, decor, organization, cleaning resets, thrift flips, and before/after transformations. Encourage before/after photos.',
      array[]::text[],
      'No unsafe DIY (electrical/structural) framed as instruction.'
    ),
    (
      'fandom-lounge',
      'excited, pop-culture aware, debate-friendly',
      'fans of TV, movies, music, games',
      'Generate prompts about TV, movies, music, games, celebrities, theories, favorite characters, reactions, and fandom debates.',
      array[]::text[],
      'No harassment of real public figures; keep debates about the work.'
    ),
    (
      'creator-corner',
      'helpful, creator-focused, practical',
      'content creators and editors',
      'Generate prompts about content creation, editing workflows, AI tools, prompts, creator setups, behind-the-scenes, and growth lessons. Favor practical challenges and showcases.',
      array['guaranteed growth', 'follower-buying', 'engagement pods as guaranteed'],
      'Avoid fake growth promises or guaranteed-viral claims.'
    ),
    (
      'travel-mode',
      'adventurous, aspirational, useful',
      'travelers and trip planners',
      'Generate prompts about trips, hidden gems, travel mistakes, dream destinations, local recommendations, beaches, cruises, and road trips.',
      array[]::text[],
      'No prompts that encourage sharing a live home-empty travel schedule with identifying location.'
    ),
    (
      'money-moves',
      'practical, encouraging, safe',
      'people working on budgeting and side hustles',
      'Generate prompts about budgeting, saving, side hustles, financial lessons, small business wins, and smart spending. Frame as discussion, not advice.',
      array['investment advice', 'guaranteed income', 'crypto pump', 'get-rich-quick', 'requests for money', 'suspicious links'],
      'No guaranteed income claims, no investment advice, no crypto pump language, no scams, no requests for money. Include the spirit of "shared for discussion only, not financial advice."'
    ),
    (
      'cozy-corner',
      'calm, soft, comforting',
      'people who love slow, cozy living',
      'Generate prompts about books, coffee, reset days, comfort routines, quiet moments, soft living, and relaxing content.',
      array[]::text[],
      'Keep it gentle and inclusive.'
    ),
    (
      'glow-up-garage',
      'motivating, transformation-focused, positive',
      'people on self-improvement journeys',
      'Generate prompts about personal transformations, fitness journeys, style upgrades, room makeovers, cars, hair, makeup, and progress videos. Encourage before/after and progress check-ins.',
      array['extreme dieting', 'disordered eating', 'unsafe fitness claims'],
      'No body-shaming. Avoid extreme/unsafe diet or fitness claims.'
    )
) as v(slug, tone, audience, guidance, banned_topics, safety_notes)
join public.communities c on c.slug = v.slug
on conflict (circle_id) do update set
  circle_slug = excluded.circle_slug,
  tone = excluded.tone,
  audience = excluded.audience,
  prompt_guidance = excluded.prompt_guidance,
  banned_topics = excluded.banned_topics,
  safety_notes = excluded.safety_notes,
  updated_at = now();


