-- Refresh April 2026 frame subtitles (“Beta Leaderboard” copy; safe if 076 already ran).
update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 1st · April 2026'
where slug = '2026-04-neon-gold';

update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 2nd & 3rd · April 2026'
where slug = '2026-04-neon-silver';

update public.pulse_avatar_frames
set subtitle = 'Beta Leaderboard · 4th & 5th · April 2026'
where slug = '2026-04-neon-bronze';
