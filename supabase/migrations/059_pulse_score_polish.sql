-- ══════════════════════════════════════════════════════════════════════
-- 059_pulse_score_polish.sql
--
-- Three polish items on top of the Pulse Score v2 engine (migration 058):
--
--   A. Denormalize `pulse_tier` + `pulse_score_current` onto public.profiles
--      so feed video overlays, search results, and any "show a tier badge
--      next to an avatar" surface can render the badge from the profile
--      row we already fetch — no extra RPCs, no N+1s.
--
--   B. Tier-promotion notification: when a user's tier goes UP between
--      monthly-score upserts, drop a row into public.notifications so the
--      existing notifications pipeline (client + push) handles the rest.
--
--   C. (No schema changes for compare mode — it's pure client.)
--
-- Every section is idempotent — safe to run on a database that already
-- has this migration, or (defensively) partially applied.
-- ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- A. Denormalized tier + score columns on profiles
-- ─────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists pulse_tier           text not null default 'murmur';
alter table public.profiles
  add column if not exists pulse_score_current  int  not null default 0;

-- Cheap lookups for "top creators" / "users at tier X" queries.
create index if not exists ix_profiles_pulse_tier
  on public.profiles (pulse_tier);
create index if not exists ix_profiles_pulse_score_current
  on public.profiles (pulse_score_current desc);

-- ─────────────────────────────────────────────────────────────────────
-- B. Trigger on user_monthly_pulse_scores — keeps profiles in sync + fires
--    tier-promotion notifications.
-- ─────────────────────────────────────────────────────────────────────
--
-- Strategy:
--   * Only act on the *current* month's row (`finalized = false` OR
--     month_start = current month). Finalized months are historical and
--     should not overwrite live tier.
--   * On INSERT:
--       - set profile's pulse_tier / pulse_score_current to NEW values
--       - if NEW.tier represents a promotion vs the profile's prior tier,
--         drop a notification.
--   * On UPDATE:
--       - keep profile in sync every time
--       - notify only when tier climbs (never demotes).
--
-- Demotions within a month (e.g. weaker final week) deliberately don't
-- notify — nothing crushes motivation like a "you dropped to Pulse" push.
create or replace function public.pulse_sync_profile_and_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_month date := public.pulse_current_month();
  v_prior_tier    text;
  v_tier_rank_old int;
  v_tier_rank_new int;
  v_is_current    boolean;
  v_message       text;
begin
  v_is_current := (NEW.month_start = v_current_month) and coalesce(NEW.finalized, false) = false;

  -- Only sync profile + fire notifications for the live current month.
  -- Historical rewrites (cron finalize, backfills) should not reshape
  -- a user's *present* tier.
  if not v_is_current then
    return NEW;
  end if;

  -- Snapshot the prior tier the profile currently shows. This is our
  -- promotion baseline — we compare NEW.tier against this, not against
  -- OLD.tier, because a first-of-the-month "insert" arrives with no OLD
  -- row, and we still want to fire "you leveled up" vs last month.
  select pulse_tier into v_prior_tier
    from public.profiles
    where id = NEW.user_id;

  v_prior_tier := coalesce(v_prior_tier, 'murmur');

  -- Push denormalized columns onto the profile, always.
  update public.profiles
    set pulse_tier          = coalesce(NEW.tier, 'murmur'),
        pulse_score_current = coalesce(NEW.overall, 0)
    where id = NEW.user_id;

  -- Tier-promotion detection. Rank each tier so we can compare.
  v_tier_rank_old := case v_prior_tier
    when 'murmur' then 0
    when 'pulse'  then 1
    when 'rhythm' then 2
    when 'beat'   then 3
    when 'anthem' then 4
    else 0
  end;

  v_tier_rank_new := case coalesce(NEW.tier, 'murmur')
    when 'murmur' then 0
    when 'pulse'  then 1
    when 'rhythm' then 2
    when 'beat'   then 3
    when 'anthem' then 4
    else 0
  end;

  if v_tier_rank_new > v_tier_rank_old then
    v_message := case coalesce(NEW.tier, 'murmur')
      when 'pulse'  then 'Your Pulse just reached PULSE — you''re being noticed.'
      when 'rhythm' then 'Your Pulse just reached RHYTHM — you''re a real presence.'
      when 'beat'   then 'Your Pulse just reached BEAT — you''re a force.'
      when 'anthem' then 'Your Pulse just reached ANTHEM — top-tier creator.'
      else 'Your Pulse just leveled up.'
    end;

    -- The notifications table uses (user_id, actor_id) both NOT NULL.
    -- "Actor" here is the user themselves — they earned it.
    insert into public.notifications (user_id, actor_id, type, message, target_id)
    values (
      NEW.user_id,
      NEW.user_id,
      'tier_up',
      v_message,
      NEW.user_id::text
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_pulse_sync_profile_and_notify on public.user_monthly_pulse_scores;
create trigger trg_pulse_sync_profile_and_notify
  after insert or update on public.user_monthly_pulse_scores
  for each row
  execute function public.pulse_sync_profile_and_notify();

-- ─────────────────────────────────────────────────────────────────────
-- Backfill: hydrate the denormalized columns for every user who already
-- has a current-month score row. Without this, existing users keep
-- rendering 'murmur' on feed badges until they next post.
-- ─────────────────────────────────────────────────────────────────────
do $$
declare
  v_month date := public.pulse_current_month();
begin
  update public.profiles p
    set pulse_tier          = coalesce(m.tier, 'murmur'),
        pulse_score_current = coalesce(m.overall, 0)
    from public.user_monthly_pulse_scores m
    where m.user_id = p.id
      and m.month_start = v_month;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RLS note: profiles already has a public-read policy from migration 001,
-- so the new columns inherit that read access. No policy changes needed.
-- ─────────────────────────────────────────────────────────────────────
