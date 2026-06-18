-- Confirm post_profile_board_shoutout includes rate-limit guards
select
  prosrc like '%rate limited cooldown%' as has_cooldown_guard,
  prosrc like '%rate limited hourly cap%' as has_hourly_cap
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'post_profile_board_shoutout';
