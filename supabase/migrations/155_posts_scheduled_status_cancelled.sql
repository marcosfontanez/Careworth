-- Distinct status for user-cancelled queued posts (vs system/dispatch `failed`).
alter table public.posts drop constraint if exists posts_scheduled_status_chk;

alter table public.posts
  add constraint posts_scheduled_status_chk
  check (scheduled_status in ('live', 'scheduled', 'sending', 'failed', 'cancelled'));
