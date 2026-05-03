-- Richer neon gold for 1st-place monthly frame (UI + seeds stay aligned)
update public.pulse_avatar_frames
set
  ring_color = '#FFF176',
  glow_color = '#FF9100'
where slug = '2026-04-neon-gold';
