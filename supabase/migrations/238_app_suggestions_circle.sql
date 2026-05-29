-- Migration 238: "App Suggestions" circle — user-driven feature requests.
--
-- A dedicated Circle where users can ask for new features, upgrades, or
-- anything they want to see inside PulseVerse.
--
-- Pinning model (matches services/circleContent.ts ranking):
--   - Circles with a non-null `featured_order` are PINS — they show first in
--     the Popular Circles strip, ordered by featured_order ascending (1, 2, …).
--   - Every other circle falls back to the popularity score.
--   - The strip shows the top 10 total; the rest live under "See all" / search.
--
-- We only want ONE pin right now (App Suggestions), so this migration also
-- CLEARS the stale featured_order values left on the old curated rooms
-- (bug-reports, memes, border-envy, …) so they rank purely by popularity again.

insert into public.communities (slug, name, icon, description, accent_color, member_count, post_count)
values
  (
    'app-suggestions',
    'App Suggestions',
    '💡',
    'Got an idea? This is the place to ask for new features, upgrades, or anything you want to see inside PulseVerse. Post a suggestion, react to ideas you love, and help shape where the app goes next. The team reads every post here.',
    '#22D3EE',
    0,
    0
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color;

-- Clear every existing pin so only App Suggestions remains pinned. All other
-- circles return to popularity-based ordering in the slider.
update public.communities
set featured_order = null
where featured_order is not null
  and slug <> 'app-suggestions';

-- Pin App Suggestions to the front (single pin → order 1).
update public.communities
set featured_order = 1
where slug = 'app-suggestions';
