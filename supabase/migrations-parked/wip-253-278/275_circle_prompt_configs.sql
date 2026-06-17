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
      'Comedy must stay harmless — no bullying or hate framed as a joke.'
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
