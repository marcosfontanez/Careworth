-- Short ring copy + subtitles for April 2026 frames (idempotent if 076–078 already ran with longer text).
update public.pulse_avatar_frames
set ring_caption = 'Beta Leaderboard'
where slug in ('2026-04-neon-gold', '2026-04-neon-silver', '2026-04-neon-bronze');

update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 1st · April 2026'
where slug = '2026-04-neon-gold';

update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 2nd & 3rd · April 2026'
where slug = '2026-04-neon-silver';

update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 4th & 5th · April 2026'
where slug = '2026-04-neon-bronze';
