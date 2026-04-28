-- ══════════════════════════════════════════════════════════════════════
-- 060_pulse_score_rpc_volatile.sql
--
-- Bug fix: `get_current_pulse_score` in migration 058 was declared
-- `STABLE`, but its body performs an UPSERT into
-- `user_monthly_pulse_scores` to keep leaderboard reads fresh.
-- PostgreSQL disallows data modification inside a STABLE function, so
-- every client call errored silently — the live pill on My Pulse showed
-- 0 while the history sheet (which reads directly from the stored row
-- seeded by the 058 backfill) showed the correct score.
--
-- Fix: recreate the function as VOLATILE (the default). Same body,
-- same grants — no data shape changes.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.get_current_pulse_score(
  p_user_id uuid default auth.uid()
)
returns table (
  reach       int,
  resonance   int,
  rhythm      int,
  range_      int,
  reciprocity int,
  overall     int,
  tier        text,
  month_start date,
  streak_days int
)
language plpgsql
-- NOTE: intentionally VOLATILE (default) — this function writes to
-- user_monthly_pulse_scores on every call so leaderboards stay fresh.
security definer
set search_path = public
as $$
declare
  v_month  date := public.pulse_current_month();
  v_sub    record;
  v_streak int;
begin
  if p_user_id is null then return; end if;

  select * into v_sub from public.compute_pulse_subscores(p_user_id, v_month);

  -- Upsert into the active-month row so leaderboard queries are fresh.
  -- We never flip `finalized=true` here — only the cron rollover does.
  insert into public.user_monthly_pulse_scores (
    user_id, month_start, reach, resonance, rhythm, range_, reciprocity,
    overall, tier, finalized, computed_at
  ) values (
    p_user_id, v_month, v_sub.reach, v_sub.resonance, v_sub.rhythm,
    v_sub.range_, v_sub.reciprocity, v_sub.overall, v_sub.tier, false, now()
  )
  on conflict (user_id, month_start) do update
    set reach       = excluded.reach,
        resonance   = excluded.resonance,
        rhythm      = excluded.rhythm,
        range_      = excluded.range_,
        reciprocity = excluded.reciprocity,
        overall     = excluded.overall,
        tier        = excluded.tier,
        computed_at = now()
    where public.user_monthly_pulse_scores.finalized = false;

  select coalesce(current_streak_days, 0) into v_streak
    from public.user_streaks where user_id = p_user_id;

  reach       := v_sub.reach;
  resonance   := v_sub.resonance;
  rhythm      := v_sub.rhythm;
  range_      := v_sub.range_;
  reciprocity := v_sub.reciprocity;
  overall     := v_sub.overall;
  tier        := v_sub.tier;
  month_start := v_month;
  streak_days := coalesce(v_streak, 0);
  return next;
end;
$$;

grant execute on function public.get_current_pulse_score(uuid)
  to authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────────────
-- Defensive re-backfill of the denormalized profile columns.
--
-- Idempotent with the 059 backfill. We run it again here so that any
-- users whose current-month row existed before 059's trigger was
-- installed (or who were affected by the broken STABLE RPC and never
-- got an UPSERT fire) are guaranteed to have a fresh
-- `profile.pulse_score_current` / `pulse_tier`. This is what the My
-- Pulse pill now falls back to as its instant first-paint value.
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
      and m.month_start = v_month
      and (p.pulse_score_current is distinct from coalesce(m.overall, 0)
           or p.pulse_tier        is distinct from coalesce(m.tier, 'murmur'));
end;
$$;
