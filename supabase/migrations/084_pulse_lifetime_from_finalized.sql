-- Lifetime leaderboard + history read from finalized monthly totals; fix
-- finalize_current_month() month selection (now() - 1 day only matched the
-- *prior* calendar month on the 1st UTC — any other day it targeted the
-- current month incorrectly and skipped real backfill). Process every
-- past month that still has finalized = false, then sync user_pulse_lifetime.

-- ─── Leaderboard: derive from user_monthly_pulse_scores (finalized only) ───
create or replace function public.get_top_lifetime_pulse(
  p_limit     int  default 5,
  p_circle_id uuid default null
)
returns table (
  user_id          uuid,
  username         text,
  display_name     text,
  avatar_url       text,
  lifetime_total   bigint,
  best_month_score int,
  best_tier        text,
  months_active    int,
  anthem_months    int
)
language sql
stable
security definer
set search_path = public
as $$
  with fin as (
    select m.user_id,
           m.overall,
           m.tier,
           m.month_start
    from public.user_monthly_pulse_scores m
    where m.finalized = true
  ),
  agg as (
    select f.user_id,
           sum(f.overall)::bigint as lifetime_total,
           max(f.overall) as best_month_score,
           count(*) filter (where f.overall > 0)::int as months_active,
           count(*) filter (where f.tier = 'anthem')::int as anthem_months
    from fin f
    group by f.user_id
  ),
  apex as (
    select distinct on (f.user_id)
      f.user_id,
      f.tier as best_tier
    from fin f
    join agg a on a.user_id = f.user_id
    order by f.user_id, f.overall desc, f.month_start desc
  )
  select a.user_id,
         p.username,
         p.display_name,
         p.avatar_url,
         a.lifetime_total,
         a.best_month_score,
         coalesce(x.best_tier, public.pulse_tier_from_score(a.best_month_score)) as best_tier,
         a.months_active,
         a.anthem_months
  from agg a
  join public.profiles p on p.id = a.user_id
  left join apex x on x.user_id = a.user_id
  where a.lifetime_total > 0
    and (
      p_circle_id is null
      or exists (
        select 1 from public.community_members cm
        where cm.community_id = p_circle_id and cm.user_id = a.user_id
      )
    )
  order by a.lifetime_total desc, p.username asc nulls last
  limit greatest(1, least(coalesce(p_limit, 5), 50));
$$;

-- ─── History sheet lifetime summary: same source as leaderboard ───
create or replace function public.get_pulse_history(
  p_user_id uuid default auth.uid()
)
returns table (
  month_start      date,
  reach            int,
  resonance        int,
  rhythm           int,
  range_           int,
  reciprocity      int,
  overall          int,
  tier             text,
  finalized        boolean,
  lifetime_total   bigint,
  best_month_score int,
  best_tier        text,
  months_active    int,
  anthem_months    int
)
language sql
stable
security definer
set search_path = public
as $$
  with months as (
    select m.month_start, m.reach, m.resonance, m.rhythm, m.range_,
           m.reciprocity, m.overall, m.tier, m.finalized
    from public.user_monthly_pulse_scores m
    where m.user_id = p_user_id
  ),
  life as (
    select
      coalesce(sum(m.overall), 0)::bigint as lifetime_total,
      coalesce(max(m.overall), 0)::int as best_month_score,
      coalesce(
        (select m2.tier
         from public.user_monthly_pulse_scores m2
         where m2.user_id = p_user_id
           and m2.finalized = true
         order by m2.overall desc, m2.month_start desc
         limit 1),
        'murmur'
      ) as best_tier,
      coalesce(count(*) filter (where m.overall > 0), 0)::int as months_active,
      coalesce(count(*) filter (where m.tier = 'anthem'), 0)::int as anthem_months
    from public.user_monthly_pulse_scores m
    where m.user_id = p_user_id
      and m.finalized = true
  )
  select months.*,
         coalesce((select lifetime_total from life), 0)::bigint,
         coalesce((select best_month_score from life), 0)::int,
         coalesce((select best_tier from life), 'murmur')::text,
         coalesce((select months_active from life), 0)::int,
         coalesce((select anthem_months from life), 0)::int
  from months
  order by months.month_start desc;
$$;

-- ─── Finalize: all calendar months before this one that are not finalized yet ───
create or replace function public.finalize_current_month()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month     date;
  v_processed int  := 0;
  r           record;
  s           record;
begin
  for v_month in
    select distinct m.month_start
    from public.user_monthly_pulse_scores m
    where m.month_start < public.pulse_current_month()
      and m.finalized = false
    order by m.month_start asc
  loop
    insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
    select distinct p.creator_id, v_month, false
    from public.posts p
    where p.created_at >= v_month::timestamptz
      and p.created_at < (v_month + interval '1 month')::timestamptz
      and p.creator_id is not null
    on conflict (user_id, month_start) do nothing;

    insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
    select distinct pu.user_id, v_month, false
    from public.profile_updates pu
    where pu.created_at >= v_month::timestamptz
      and pu.created_at < (v_month + interval '1 month')::timestamptz
      and pu.user_id is not null
    on conflict (user_id, month_start) do nothing;

    for r in
      select user_id
      from public.user_monthly_pulse_scores
      where month_start = v_month
        and finalized = false
    loop
      select * into s from public.compute_pulse_subscores(r.user_id, v_month);

      update public.user_monthly_pulse_scores
      set reach       = s.reach,
          resonance   = s.resonance,
          rhythm      = s.rhythm,
          range_      = s.range_,
          reciprocity = s.reciprocity,
          overall     = s.overall,
          tier        = s.tier,
          finalized   = true,
          computed_at = now()
      where user_id = r.user_id and month_start = v_month;

      insert into public.user_pulse_lifetime (
        user_id, lifetime_total, best_month_score, best_month_start,
        best_tier, months_active, anthem_months, last_finalized_at, updated_at
      ) values (
        r.user_id,
        s.overall::bigint,
        s.overall,
        v_month,
        s.tier,
        case when s.overall > 0 then 1 else 0 end,
        case when s.tier = 'anthem' then 1 else 0 end,
        now(),
        now()
      )
      on conflict (user_id) do update
        set lifetime_total     = public.user_pulse_lifetime.lifetime_total + s.overall::bigint,
            best_month_score   = greatest(public.user_pulse_lifetime.best_month_score, s.overall),
            best_month_start   = case
                                   when s.overall > public.user_pulse_lifetime.best_month_score
                                     then v_month
                                   else public.user_pulse_lifetime.best_month_start
                                 end,
            best_tier          = case
                                   when s.overall > public.user_pulse_lifetime.best_month_score
                                     then s.tier
                                   else public.user_pulse_lifetime.best_tier
                                 end,
            months_active      = public.user_pulse_lifetime.months_active
                                  + case when s.overall > 0 then 1 else 0 end,
            anthem_months      = public.user_pulse_lifetime.anthem_months
                                  + case when s.tier = 'anthem' then 1 else 0 end,
            last_finalized_at  = now(),
            updated_at         = now();

      v_processed := v_processed + 1;
    end loop;

    perform public.grant_pulse_top5_frames_for_month(v_month);
  end loop;

  return v_processed;
end;
$$;

-- ─── Rebuild cache from finalized months (repairs empty/stale aggregates) ───
insert into public.user_pulse_lifetime (
  user_id,
  lifetime_total,
  best_month_score,
  best_month_start,
  best_tier,
  months_active,
  anthem_months,
  last_finalized_at,
  updated_at
)
select
  a.user_id,
  a.lifetime_total,
  a.best_month_score,
  ap.best_month_start,
  ap.best_tier,
  a.months_active,
  a.anthem_months,
  now(),
  now()
from (
  select
    f.user_id,
    sum(f.overall)::bigint as lifetime_total,
    max(f.overall) as best_month_score,
    count(*) filter (where f.overall > 0)::int as months_active,
    count(*) filter (where f.tier = 'anthem')::int as anthem_months
  from public.user_monthly_pulse_scores f
  where f.finalized = true
  group by f.user_id
) a
join lateral (
  select distinct on (f2.user_id)
    f2.user_id,
    f2.month_start as best_month_start,
    f2.tier as best_tier
  from public.user_monthly_pulse_scores f2
  where f2.user_id = a.user_id
    and f2.finalized = true
  order by f2.user_id, f2.overall desc, f2.month_start desc
) ap on ap.user_id = a.user_id
where a.lifetime_total > 0
on conflict (user_id) do update
  set lifetime_total     = excluded.lifetime_total,
      best_month_score   = excluded.best_month_score,
      best_month_start   = excluded.best_month_start,
      best_tier          = excluded.best_tier,
      months_active      = excluded.months_active,
      anthem_months      = excluded.anthem_months,
      last_finalized_at  = excluded.last_finalized_at,
      updated_at         = excluded.updated_at;
