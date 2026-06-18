-- ============================================================
-- June 2026 leaderboard pulse frames
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 253_june_2026_leaderboard_pulse_frames.sql ----------
-- June 2026 global Pulse top-5 prize borders (gold 1st Â· silver 2â€“3 Â· bronze 4â€“5).
-- Art: assets/images/pulse-rings/summer-solstice-2026-{gold,silver,bronze}.png
-- (processed from June 2026 celestial exports). Distinct from Summer Solstice legacy
-- shop IAP rows (prize_tier = campaign in migration 172).

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
    '2026-06-gold',
    'Celestial Gold',
    'Global leaderboard Â· 1st place Â· June 2026',
    'gold',
    '2026-06-01',
    '#FFEA00',
    '#FF9100',
    'June 2026 Â· Gold',
    1
  ),
  (
    '2026-06-silver',
    'Celestial Silver',
    'Global leaderboard Â· 2nd & 3rd Â· June 2026',
    'silver',
    '2026-06-01',
    '#E2E8F0',
    '#94A3B8',
    'June 2026 Â· Silver',
    2
  ),
  (
    '2026-06-bronze',
    'Celestial Bronze',
    'Global leaderboard Â· 4th & 5th Â· June 2026',
    'bronze',
    '2026-06-01',
    '#F59E0B',
    '#EA580C',
    'June 2026 Â· Bronze',
    3
  )
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  month_start = excluded.month_start,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption,
  sort_order = excluded.sort_order;


