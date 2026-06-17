-- ============================================================
-- Profile pulse status
-- Reconciled from WIP migrations-parked/wip-253-278 (Phase 3)
-- ============================================================

-- ---------- source: 258_profiles_pulse_status.sql ----------
-- ============================================================
-- Today's Pulse â€” durable profile status line (Phase 1)
-- ------------------------------------------------------------
-- Nullable status fields on profiles. Separate from the 5-slot
-- profile_updates rail so status persists when updates roll off.
-- ============================================================

alter table public.profiles
  add column if not exists pulse_status_text varchar(120),
  add column if not exists pulse_status_emoji varchar(8),
  add column if not exists pulse_status_updated_at timestamptz;

comment on column public.profiles.pulse_status_text is
  'Owner-set Today''s Pulse status line (max 120 chars). Shown on My Pulse when set.';

comment on column public.profiles.pulse_status_emoji is
  'Optional single emoji prefix for Today''s Pulse status.';

comment on column public.profiles.pulse_status_updated_at is
  'When pulse_status_text was last saved or cleared.';

-- Re-apply column grants so authenticated/anon REST reads include new fields.
do $$
declare
  col_list text;
begin
  select string_agg(quote_ident(column_name), ', ')
    into col_list
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name <> 'role_admin';

  execute 'revoke select on public.profiles from authenticated';
  execute format('grant select (%s) on public.profiles to authenticated', col_list);

  execute 'revoke select on public.profiles from anon';
  execute format('grant select (%s) on public.profiles to anon', col_list);
end $$;


