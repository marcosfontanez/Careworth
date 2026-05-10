-- ============================================================================
-- 132: Pulse avatar frame rarity (aligned with shop_items.rarity_tier)
--
-- Tier policy (document for future migrations):
--   mythic    — Global monthly Pulse top 5 (only five winners / month).
--   legendary — Premium IAP borders (e.g. ~$4.99 flagship shop tier).
--   epic      — Flagship charity / collab IAP (~$1.99), strong scarcity story.
--   rare      — Limited-time free events (Mother's Day, etc.), beta program.
--   common    — Wide promotional / brand giveaway borders (easy to obtain).
--
-- acquisition_tag: short vault chip beside the rarity pill (source story).
-- ============================================================================

alter table public.pulse_avatar_frames
  add column if not exists rarity_tier text not null default 'common'
    constraint pulse_avatar_frames_rarity_tier_chk
    check (rarity_tier in ('common', 'rare', 'epic', 'legendary', 'mythic'));

alter table public.pulse_avatar_frames
  add column if not exists acquisition_tag text;

comment on column public.pulse_avatar_frames.rarity_tier is
  'Rarity aligned with shop_items.rarity_tier — drives badges in vault / profile. See migration 132 header for policy.';

comment on column public.pulse_avatar_frames.acquisition_tag is
  'Optional vault chip copy, e.g. "Monthly top 5 · global", "Charity · Pulse Shop", "Promo giveaway".';

-- Monthly leaderboard podium (gold / silver / bronze per month)
update public.pulse_avatar_frames
set
  rarity_tier = 'mythic',
  acquisition_tag = 'Monthly top 5 · global'
where prize_tier in ('gold', 'silver', 'bronze');

-- Shop-mirrored charity / Pride art (matches epic charity border in shop)
update public.pulse_avatar_frames
set
  rarity_tier = 'epic',
  acquisition_tag = 'Charity · Pulse Shop'
where slug = 'pride-month-2026-border';

-- Beta program (limited rollout, not as scarce as monthly champions)
update public.pulse_avatar_frames
set
  rarity_tier = 'rare',
  acquisition_tag = 'Beta program'
where slug = 'beta-tester-border';

-- Beta Pioneer free shop listing: promotional / wide distribution
update public.shop_items
set
  rarity = 'common',
  rarity_tier = 'common',
  source_type = 'promotional',
  prestige_score = 12
where slug in ('beta-pioneer', 'border_beta_pioneer');
