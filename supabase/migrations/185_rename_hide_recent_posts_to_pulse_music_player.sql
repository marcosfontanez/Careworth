-- Legacy column `hide_recent_posts_on_my_page` was persisted from Customize but
-- never read by My Pulse; repurpose with an accurate name for the Current Vibe player.

alter table public.profiles
  rename column hide_recent_posts_on_my_page to hide_pulse_music_player_on_my_page;

comment on column public.profiles.hide_pulse_music_player_on_my_page is
  'When true, the profile owner does not see the Current Vibe / music player on their own My Pulse tab. Visitors still see it.';
