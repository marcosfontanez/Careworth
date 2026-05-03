-- Round of additive columns powering the new creator tools.
-- Safe to re-run.

-- ============================================================================
-- 1. posts: education mode, scheduling, series mode, A/B cover, mood preset
-- ============================================================================

alter table public.posts
  add column if not exists is_education boolean not null default false,
  add column if not exists education_citations jsonb,
  add column if not exists series_id uuid,
  add column if not exists series_part smallint,
  add column if not exists series_total smallint,
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_status text not null default 'live',
  add column if not exists cover_alt_url text,
  add column if not exists mood_preset text;

-- Constrain scheduled_status to known values. Default 'live' = post is published.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'posts_scheduled_status_chk'
  ) then
    alter table public.posts
      add constraint posts_scheduled_status_chk
      check (scheduled_status in ('live','scheduled','sending','failed'));
  end if;
end$$;

create index if not exists posts_series_id_idx
  on public.posts (series_id, series_part)
  where series_id is not null;

create index if not exists posts_scheduled_idx
  on public.posts (scheduled_status, scheduled_at)
  where scheduled_status = 'scheduled';

create index if not exists posts_is_education_idx
  on public.posts (is_education)
  where is_education = true;

comment on column public.posts.is_education is
  'Creator-flagged educational content. Surfaces a Learn shelf and unlocks citation fields.';
comment on column public.posts.education_citations is
  'Optional jsonb array of {label, url} citations for education-mode posts.';
comment on column public.posts.series_id is
  'Groups posts as Part X of Y. Same uuid across all parts of the series.';
comment on column public.posts.cover_alt_url is
  'Optional alternate cover thumbnail used by the cover A/B test runner.';
comment on column public.posts.mood_preset is
  'Saved mood-preset key applied at compose time (e.g. late_shift_coffee).';

-- ============================================================================
-- 2. profiles: brand_kit jsonb (color, accent, logo_url, scrubs_color)
-- ============================================================================

alter table public.profiles
  add column if not exists brand_kit jsonb not null default '{}'::jsonb;

comment on column public.profiles.brand_kit is
  'Creator brand identity: { primary, accent, scrubs, logo_url, font_key }. Applied to overlays.';

-- ============================================================================
-- 3. scheduled_posts dispatcher (placeholder cron-friendly view)
-- ============================================================================

create or replace view public.scheduled_posts_due_v1 as
select id
  from public.posts
 where scheduled_status = 'scheduled'
   and scheduled_at is not null
   and scheduled_at <= now();

comment on view public.scheduled_posts_due_v1 is
  'Posts whose scheduled_at has passed and are still queued. Cron edge function flips them to live.';
