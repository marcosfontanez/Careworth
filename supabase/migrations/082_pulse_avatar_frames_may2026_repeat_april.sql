-- May 2026 monthly Pulse top-5 prize borders — same neon art as April 2026
-- (migrations 076 + 078–081). Required before May rollover so
-- grant_pulse_top5_frames_for_month finds gold/silver/bronze for 2026-05-01.

insert into public.pulse_avatar_frames (
  slug,
  label,
  subtitle,
  prize_tier,
  month_start,
  ring_color,
  glow_color,
  ring_caption,
  sort_order
)
values
  (
    '2026-05-neon-gold',
    'Neon Gold',
    'Beta Leaderboard · 1st · May 2026',
    'gold',
    '2026-05-01',
    '#FFF176',
    '#FF9100',
    'Beta Leaderboard',
    1
  ),
  (
    '2026-05-neon-silver',
    'Neon Silver',
    'Beta Leaderboard · 2nd & 3rd · May 2026',
    'silver',
    '2026-05-01',
    '#E8EEFF',
    '#7EB6FF',
    'Beta Leaderboard',
    2
  ),
  (
    '2026-05-neon-bronze',
    'Neon Bronze',
    'Beta Leaderboard · 4th & 5th · May 2026',
    'bronze',
    '2026-05-01',
    '#A86232',
    '#3D1E0A',
    'Beta Leaderboard',
    3
  )
on conflict (slug) do nothing;
