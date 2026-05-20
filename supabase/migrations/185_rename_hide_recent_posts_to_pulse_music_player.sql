-- Legacy column `hide_recent_posts_on_my_page` was persisted from Customize but
-- never read by My Pulse; repurpose with an accurate name for the Current Vibe player.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'hide_recent_posts_on_my_page'
  ) then
    alter table public.profiles
      rename column hide_recent_posts_on_my_page to hide_pulse_music_player_on_my_page;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'hide_pulse_music_player_on_my_page'
  ) then
    alter table public.profiles
      add column hide_pulse_music_player_on_my_page boolean not null default false;
  end if;
end $$;

comment on column public.profiles.hide_pulse_music_player_on_my_page is
  'When true, the profile owner does not see the Current Vibe / music player on their own My Pulse tab. Visitors still see it.';
