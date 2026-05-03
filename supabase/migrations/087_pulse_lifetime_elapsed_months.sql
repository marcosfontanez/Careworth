-- Lifetime leaderboard + history: count completed calendar months even when
-- finalize_current_month() has not flipped finalized=true yet (same idea as
-- migration 085 for celebrations). Stored month rows for month_start < now's
-- pulse month are stable enough to aggregate; the in-progress month stays out
-- until it becomes a prior month.

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
       or m.month_start < public.pulse_current_month()
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
           and (
             m2.finalized = true
             or m2.month_start < public.pulse_current_month()
           )
         order by m2.overall desc, m2.month_start desc
         limit 1),
        'murmur'
      ) as best_tier,
      coalesce(count(*) filter (where m.overall > 0), 0)::int as months_active,
      coalesce(count(*) filter (where m.tier = 'anthem'), 0)::int as anthem_months
    from public.user_monthly_pulse_scores m
    where m.user_id = p_user_id
      and (
        m.finalized = true
        or m.month_start < public.pulse_current_month()
      )
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

-- Keep user_pulse_lifetime rows aligned with the same eligibility rule (analytics /
-- any legacy readers that still query the table).
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
     or f.month_start < public.pulse_current_month()
  group by f.user_id
) a
join lateral (
  select distinct on (f2.user_id)
    f2.user_id,
    f2.month_start as best_month_start,
    f2.tier as best_tier
  from public.user_monthly_pulse_scores f2
  where f2.user_id = a.user_id
    and (
      f2.finalized = true
      or f2.month_start < public.pulse_current_month()
    )
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
