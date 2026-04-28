-- saved_sounds.user_id referenced profiles(id); inserts fail if auth user exists but profile row
-- is missing/stale (edge cases). Align FK with auth.users like other user-owned rows.

alter table public.saved_sounds
  drop constraint if exists saved_sounds_user_id_fkey;

alter table public.saved_sounds
  add constraint saved_sounds_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
