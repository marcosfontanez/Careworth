-- Curved prize caption (stored per frame) + truer bronze metal tint for April 2026 bronze tier.
alter table public.pulse_avatar_frames
  add column if not exists ring_caption text;

update public.pulse_avatar_frames
set
  ring_color = '#A86232',
  glow_color = '#3D1E0A',
  ring_caption = 'Beta Leaderboard'
where slug = '2026-04-neon-bronze';

update public.pulse_avatar_frames
set ring_caption = 'Beta Leaderboard'
where slug in ('2026-04-neon-gold', '2026-04-neon-silver');
