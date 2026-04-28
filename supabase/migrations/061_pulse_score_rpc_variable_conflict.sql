-- ══════════════════════════════════════════════════════════════════════
-- 061_pulse_score_rpc_variable_conflict.sql
--
-- Bug fix: `get_current_pulse_score` (introduced in 058, made VOLATILE
-- in 060) errors with:
--
--   ERROR: 42702: column reference "month_start" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
--
-- Why: the function declares `RETURNS TABLE (... month_start date, ...)`
-- which makes `month_start`, `reach`, `resonance`, `rhythm`, `range_`,
-- `reciprocity`, `overall`, and `tier` PL/pgSQL OUT variables. Every
-- one of those names is also a column in `public.user_monthly_pulse_scores`.
-- The body's `INSERT … ON CONFLICT (user_id, month_start)` references
-- `month_start` and PostgreSQL refuses to choose between the variable
-- and the column. The history sheet kept showing 32 because it reads
-- `user_monthly_pulse_scores` directly (where the value was last
-- successfully written before this RPC started failing); the My Pulse
-- pill showed 0 because the live RPC was throwing on every read so the
-- snapshot came back null and the fallback path lost its value.
--
-- Fix: add the `#variable_conflict use_column` directive at the top of
-- the function body. PL/pgSQL then resolves bare identifiers to the
-- table column when both a column and a variable share the name. The
-- final OUT-assignment statements (`overall := v_sub.overall;` etc.)
-- still target the variables — the LHS of `:=` is unambiguously a
-- variable to PL/pgSQL, so the directive doesn't break the return.
--
-- Same body, same grants, same VOLATILE marker as 060 — only the
-- `#variable_conflict` line is added.
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
-- VOLATILE (default) — see migration 060 for the rationale; this function
-- writes to user_monthly_pulse_scores on every call so leaderboards stay
-- fresh.
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_month  date := public.pulse_current_month();
  v_sub    record;
  v_streak int;
begin
  if p_user_id is null then return; end if;

  select * into v_sub from public.compute_pulse_subscores(p_user_id, v_month);

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
-- Smoke test (manual; comment out before applying via supabase db push
-- if it would noisily error in CI for users without a row yet):
--
--   select * from public.get_current_pulse_score(
--     'cbc9cb07-1053-4c28-bfae-1c5c0db138cd'::uuid
--   );
--
-- Expected: a single row with `overall = 32`, `tier = 'pulse'`,
-- `month_start = 2026-04-01`, no error.
-- ─────────────────────────────────────────────────────────────────────
