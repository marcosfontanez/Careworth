-- Verify migration 273: General Public Circles
--
-- Run in Supabase SQL editor (or psql) AFTER applying migration 273.
-- Each query is a quick health check; expected results are noted inline.

-- 1) All 12 public Circles exist with identity + metadata.
--    Expect 12 rows. `has_rules` / `has_prompt` should all be true.
select
  slug,
  name,
  icon,
  accent_color,
  featured_order,
  member_count,
  post_count,
  (metadata ? 'rules') as has_rules,
  (metadata ? 'weekly_prompt') as has_prompt,
  (metadata ? 'welcome_copy') as has_welcome,
  categories
from public.communities
where slug in (
  'petverse','foodie-finds','main-character-moments','the-drama-room','laugh-lab',
  'diy-home-glow','fandom-lounge','creator-corner','travel-mode','money-moves',
  'cozy-corner','glow-up-garage'
)
order by featured_order nulls last, name;

-- 2) The five hero Circles are pinned (featured_order 2..6). Expect 5 rows.
select slug, featured_order
from public.communities
where slug in ('petverse','the-drama-room','main-character-moments','foodie-finds','laugh-lab')
order by featured_order;

-- 3) Existing healthcare Circles are untouched. Expect all original rows present.
select slug, name, member_count, post_count
from public.communities
where slug in ('nurses','doctors','confessions','memes','student-nurses','app-suggestions')
order by slug;

-- 4) None of the new Circles use the confessions/anonymous slug. Expect 0 rows.
select slug from public.communities
where slug in (
  'petverse','foodie-finds','main-character-moments','the-drama-room','laugh-lab',
  'diy-home-glow','fandom-lounge','creator-corner','travel-mode','money-moves',
  'cozy-corner','glow-up-garage'
)
and lower(slug) = 'confessions';

-- 5) The Drama Room + Money Moves carry their extra moderation rules.
select slug, metadata -> 'rules' as rules
from public.communities
where slug in ('the-drama-room','money-moves');
