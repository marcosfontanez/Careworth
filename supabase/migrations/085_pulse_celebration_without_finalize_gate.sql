-- Celebration + top-5 frame grants for the *prior* calendar month must work even
-- when finalize_current_month() has not run yet (cron mis-fire / date bug).
-- Rows for past months are no longer updated by get_current_pulse_score (it only
-- touches pulse_current_month()), so ranking on stored overall is stable enough to
-- show the modal and grant borders. finalize_current_month() remains authoritative
-- for lifetime totals and recomputed sub-scores.

-- ─── Celebration payload: prior month, any row (not only finalized) ─────────
create or replace function public.get_pulse_month_celebration()
returns table (
  month_start date,
  overall int,
  tier text,
  global_rank bigint,
  total_ranked bigint,
  is_top5 boolean,
  prize_tier text,
  frame_label text,
  frame_ring_color text,
  frame_glow_color text,
  frame_ring_caption text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current date;
  v_month date;
  v_overall int;
  v_tier text;
  v_rank bigint;
  v_total bigint;
  v_top5 boolean;
  v_prize text;
  v_flabel text;
  v_fring text;
  v_fglow text;
  v_fcaption text;
begin
  if v_uid is null then return; end if;

  v_current := public.pulse_current_month();
  v_month := (v_current - interval '1 month')::date;

  -- Only celebrate a fully elapsed calendar month (always true for v_month = current - 1).
  if v_month >= v_current then
    return;
  end if;

  select m.overall, m.tier
    into v_overall, v_tier
    from public.user_monthly_pulse_scores m
   where m.user_id = v_uid
     and m.month_start = v_month;

  if not found then
    return;
  end if;

  with ranked as (
    select
      m.user_id,
      row_number() over (
        order by m.overall desc, p.username asc nulls last, m.user_id asc
      ) as rk
      from public.user_monthly_pulse_scores m
      join public.profiles p on p.id = m.user_id
     where m.month_start = v_month
  ),
  tallies as (
    select count(*)::bigint as c from ranked
  )
  select r.rk, t.c
    into v_rank, v_total
    from ranked r
    cross join tallies t
   where r.user_id = v_uid;

  if v_rank is null then
    return;
  end if;

  v_top5 := v_rank <= 5;
  v_prize := case
    when v_rank = 1 then 'gold'
    when v_rank in (2, 3) then 'silver'
    when v_rank in (4, 5) then 'bronze'
    else null
  end;

  select f.label, f.ring_color, f.glow_color, f.ring_caption
    into v_flabel, v_fring, v_fglow, v_fcaption
    from public.user_pulse_avatar_frames u
    join public.pulse_avatar_frames f on f.id = u.frame_id
   where u.user_id = v_uid
     and f.month_start = v_month
   limit 1;

  month_start := v_month;
  overall := coalesce(v_overall, 0);
  tier := coalesce(v_tier, 'murmur');
  global_rank := v_rank;
  total_ranked := coalesce(v_total, 0);
  is_top5 := v_top5;
  prize_tier := v_prize;
  frame_label := v_flabel;
  frame_ring_color := v_fring;
  frame_glow_color := v_fglow;
  frame_ring_caption := v_fcaption;
  return next;
end;
$$;

grant execute on function public.get_pulse_month_celebration()
  to authenticated;

comment on function public.get_pulse_month_celebration() is
  'Prior UTC calendar month: caller rank + score + frame cosmetics (if unlock exists). Uses all monthly rows for that month so celebration works even before finalize_current_month runs.';

-- ─── Top-5 grants: past months only; rank on stored scores (no finalized gate) ─
create or replace function public.grant_pulse_top5_frames_for_month(p_month date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month  date := date_trunc('month', p_month)::date;
  v_gold   uuid;
  v_silver uuid;
  v_bronze uuid;
  v_n      int;
begin
  if v_month >= public.pulse_current_month() then
    raise notice 'grant_pulse_top5_frames_for_month: month % is still in progress; skipped', v_month;
    return 0;
  end if;

  select id into v_gold
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'gold'
    order by sort_order, id
    limit 1;
  select id into v_silver
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'silver'
    order by sort_order, id
    limit 1;
  select id into v_bronze
    from public.pulse_avatar_frames
    where month_start = v_month and prize_tier = 'bronze'
    order by sort_order, id
    limit 1;

  if v_gold is null or v_silver is null or v_bronze is null then
    raise notice 'grant_pulse_top5_frames_for_month: missing gold/silver/bronze catalog for %', v_month;
    return 0;
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank)
  select r.user_id,
         case
           when r.rk = 1 then v_gold
           when r.rk in (2, 3) then v_silver
           else v_bronze
         end,
         r.rk::int
  from (
    select m.user_id,
           row_number() over (
             order by m.overall desc, p.username asc nulls last, m.user_id asc
           ) as rk
    from public.user_monthly_pulse_scores m
    join public.profiles p on p.id = m.user_id
    where m.month_start = v_month
      and m.overall > 0
  ) r
  where r.rk <= 5
  on conflict (user_id, frame_id) do nothing;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- One-shot repair after deploy: unlock top-5 borders for the last completed month if rollover missed.
do $$
declare
  v_n int;
begin
  v_n := public.grant_pulse_top5_frames_for_month((public.pulse_current_month() - interval '1 month')::date);
  raise notice '085 repair: grant_pulse_top5_frames_for_month returned %', v_n;
end
$$;
