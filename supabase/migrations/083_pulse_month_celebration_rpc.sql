-- One-shot celebration payload: previous calendar month's finalized Pulse score,
-- global rank (same ordering as monthly leaderboard / top-5 frame grants), and
-- optional unlocked frame cosmetics for ranks 1–5.

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

  select m.overall, m.tier
    into v_overall, v_tier
    from public.user_monthly_pulse_scores m
   where m.user_id = v_uid
     and m.month_start = v_month
     and m.finalized = true;

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
       and m.finalized = true
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
  'Returns the caller''s finalized stats for the most recently completed calendar month (UTC), global rank, and prize-frame cosmetics if top 5. Empty set if no finalized row yet.';
