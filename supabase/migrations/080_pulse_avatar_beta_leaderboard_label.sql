-- Top-center ring label copy: “Beta Leaderboard” (replaces shorter “Beta Leader” if 079 already ran).
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
