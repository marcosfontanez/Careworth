-- Pulse Score: steeper sub-score curves so ~100 overall stays rare and
-- monthly leaderboards stay meaningful. v2 (058) Rhythm was tuned so
-- ~15 posts + 20-day streak could max Rhythm alone, which inflated many
-- users into the top band.
--
-- Changes (all in compute_pulse_subscores):
--   • Reach: gentler log (16·log10 vs 20·log10) — big audiences still win,
--     but 100 requires a very large following.
--   • Resonance: 25·log10 vs 30·log10 on engagement-per-post.
--   • Rhythm: lower ceilings — post volume + streak cap at 72 combined (not 100).
--   • Range: convex (power 1.35 on type coverage) so missing one format hurts;
--     all six types still = 100.
--   • Reciprocity: 10·log10 vs 12·log10 on weighted actions.
--
-- Leaderboard: tie-break on sub-scores (resonance, reach, …) when overall ties.

create or replace function public.compute_pulse_subscores(
  p_user_id     uuid,
  p_month_start date
)
returns table (
  reach       int,
  resonance   int,
  rhythm      int,
  range_      int,
  reciprocity int,
  overall     int,
  tier        text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m_start timestamptz := p_month_start::timestamptz;
  m_end   timestamptz := (p_month_start + interval '1 month')::timestamptz;

  v_followers bigint;

  v_posts_this_month      bigint;
  v_pu_this_month         bigint;
  v_feed_likes_rcvd       bigint;
  v_feed_comments_rcvd    bigint;
  v_feed_shares_rcvd      bigint;
  v_pu_likes_rcvd         bigint;
  v_pu_comments_rcvd      bigint;
  v_total_posts_made      bigint;
  v_engagement_rcvd       numeric;
  v_engagement_per_post   numeric;

  v_streak_days int;

  v_has_thought      boolean;
  v_has_clip         boolean;
  v_has_link         boolean;
  v_has_pics         boolean;
  v_has_feed_post    boolean;
  v_has_circle_post  boolean;
  v_range_count      int;

  v_likes_given       bigint;
  v_comments_given    bigint;
  v_shares_given      bigint;
  v_pu_likes_given    bigint;
  v_pu_comments_given bigint;
  v_circle_replies    bigint;
  v_reciprocity_raw   numeric;

  s_reach       int;
  s_resonance   int;
  s_rhythm      int;
  s_range       int;
  s_reciprocity int;
  s_overall     int;
  s_tier        text;
begin
  select count(*) into v_followers
    from public.follows where following_id = p_user_id;

  s_reach := least(100,
    greatest(0, round(16 * log(10::numeric, 1 + coalesce(v_followers, 0)::numeric))::int));

  select count(*) into v_posts_this_month
    from public.posts
    where creator_id = p_user_id
      and created_at >= m_start and created_at < m_end;

  select count(*) into v_pu_this_month
    from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end;

  v_total_posts_made := coalesce(v_posts_this_month, 0) + coalesce(v_pu_this_month, 0);

  select
    coalesce(count(*) filter (where pl.id is not null), 0),
    coalesce(count(*) filter (where c.id  is not null), 0),
    coalesce(count(*) filter (where ps.id is not null), 0)
  into v_feed_likes_rcvd, v_feed_comments_rcvd, v_feed_shares_rcvd
  from public.posts p
    left join public.post_likes  pl on pl.post_id = p.id
    left join public.comments    c  on c.post_id  = p.id
    left join public.post_shares ps on ps.post_id = p.id
  where p.creator_id = p_user_id
    and p.created_at >= m_start and p.created_at < m_end;

  select
    coalesce(count(*) filter (where pul.id is not null), 0),
    coalesce(count(*) filter (where puc.id is not null), 0)
  into v_pu_likes_rcvd, v_pu_comments_rcvd
  from public.profile_updates pu
    left join public.profile_update_likes    pul on pul.update_id = pu.id
    left join public.profile_update_comments puc on puc.update_id = pu.id
  where pu.user_id = p_user_id
    and pu.created_at >= m_start and pu.created_at < m_end;

  v_engagement_rcvd :=
      coalesce(v_feed_likes_rcvd,    0)::numeric
    + coalesce(v_pu_likes_rcvd,      0)::numeric
    + (coalesce(v_feed_comments_rcvd,0) + coalesce(v_pu_comments_rcvd,0))::numeric * 2
    + coalesce(v_feed_shares_rcvd,   0)::numeric * 3;

  if v_total_posts_made = 0 then
    s_resonance := 0;
  else
    v_engagement_per_post := v_engagement_rcvd / greatest(v_total_posts_made, 1);
    s_resonance := least(100,
      greatest(0, round(25 * log(10::numeric, 1 + v_engagement_per_post))::int));
  end if;

  select coalesce(current_streak_days, 0)
    into v_streak_days
    from public.user_streaks where user_id = p_user_id;

  -- Post slice: 2 pts/post, cap 40 (~20 posts). Streak: ~1.5 pts/day, cap 32 (~22 days).
  -- Combined cap 72 — Rhythm alone can no longer average to 100 for overall.
  s_rhythm := least(40, v_total_posts_made::int * 2)
            + least(32, (round(coalesce(v_streak_days, 0) * 1.5)::int));
  s_rhythm := least(72, greatest(0, s_rhythm));

  v_has_thought := exists (
    select 1 from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end
      and type in ('thought','status')
  );

  v_has_clip := exists (
    select 1 from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end
      and type in ('link_post','link_live')
      and coalesce(linked_circle_slug, '') = ''
  );

  v_has_link := exists (
    select 1 from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end
      and type = 'media_note'
      and linked_url is not null
      and length(trim(linked_url)) > 0
  );

  v_has_pics := exists (
    select 1 from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end
      and (
        type = 'pics'
        or (type = 'media_note' and (linked_url is null or length(trim(linked_url)) = 0))
      )
  );

  v_has_feed_post := exists (
    select 1 from public.posts
    where creator_id = p_user_id
      and created_at >= m_start and created_at < m_end
  );

  v_has_circle_post :=
       exists (
         select 1 from public.circle_threads
         where author_id = p_user_id
           and created_at >= m_start and created_at < m_end
       )
    or exists (
         select 1 from public.profile_updates
         where user_id = p_user_id
           and created_at >= m_start and created_at < m_end
           and (type = 'link_circle' or coalesce(linked_circle_slug,'') <> '')
       );

  v_range_count :=
      (case when v_has_thought     then 1 else 0 end)
    + (case when v_has_clip        then 1 else 0 end)
    + (case when v_has_link        then 1 else 0 end)
    + (case when v_has_pics        then 1 else 0 end)
    + (case when v_has_feed_post   then 1 else 0 end)
    + (case when v_has_circle_post then 1 else 0 end);

  s_range := round(
    100 * power(greatest(v_range_count, 0)::numeric / 6.0, 1.35)
  )::int;
  s_range := least(100, greatest(0, s_range));

  select coalesce(count(*),0) into v_likes_given
    from public.post_likes pl
    join public.posts p on p.id = pl.post_id
    where pl.user_id = p_user_id
      and p.creator_id <> p_user_id
      and pl.created_at >= m_start and pl.created_at < m_end;

  select coalesce(count(*),0) into v_comments_given
    from public.comments c
    join public.posts p on p.id = c.post_id
    where c.author_id = p_user_id
      and p.creator_id <> p_user_id
      and c.created_at >= m_start and c.created_at < m_end;

  select coalesce(count(*),0) into v_shares_given
    from public.post_shares ps
    join public.posts p on p.id = ps.post_id
    where ps.user_id = p_user_id
      and p.creator_id <> p_user_id
      and ps.created_at >= m_start and ps.created_at < m_end;

  select coalesce(count(*),0) into v_pu_likes_given
    from public.profile_update_likes pul
    join public.profile_updates pu on pu.id = pul.update_id
    where pul.user_id = p_user_id
      and pu.user_id <> p_user_id
      and pul.created_at >= m_start and pul.created_at < m_end;

  select coalesce(count(*),0) into v_pu_comments_given
    from public.profile_update_comments puc
    join public.profile_updates pu on pu.id = puc.update_id
    where puc.author_id = p_user_id
      and pu.user_id <> p_user_id
      and puc.created_at >= m_start and puc.created_at < m_end;

  select coalesce(count(*),0) into v_circle_replies
    from public.circle_replies cr
    join public.circle_threads ct on ct.id = cr.thread_id
    where cr.author_id = p_user_id
      and ct.author_id <> p_user_id
      and cr.created_at >= m_start and cr.created_at < m_end;

  v_reciprocity_raw :=
      coalesce(v_likes_given,       0)::numeric * 1
    + coalesce(v_pu_likes_given,    0)::numeric * 1
    + coalesce(v_comments_given,    0)::numeric * 3
    + coalesce(v_pu_comments_given, 0)::numeric * 3
    + coalesce(v_shares_given,      0)::numeric * 5
    + coalesce(v_circle_replies,    0)::numeric * 4;

  s_reciprocity := least(100,
    greatest(0, round(10 * log(10::numeric, 1 + v_reciprocity_raw))::int));

  s_overall := round(
    (s_reach + s_resonance + s_rhythm + s_range + s_reciprocity)::numeric / 5.0
  )::int;
  s_overall := least(100, greatest(0, s_overall));
  s_tier    := public.pulse_tier_from_score(s_overall);

  reach       := s_reach;
  resonance   := s_resonance;
  rhythm      := s_rhythm;
  range_      := s_range;
  reciprocity := s_reciprocity;
  overall     := s_overall;
  tier        := s_tier;
  return next;
end;
$$;

create or replace function public.get_top_current_pulse(
  p_limit     int  default 5,
  p_circle_id uuid default null
)
returns table (
  user_id       uuid,
  username      text,
  display_name  text,
  avatar_url    text,
  overall       int,
  tier          text,
  month_start   date
)
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select m.user_id, m.overall, m.tier, m.month_start,
           m.reach, m.resonance, m.rhythm, m.range_, m.reciprocity
    from public.user_monthly_pulse_scores m
    where m.month_start = public.pulse_current_month()
      and m.finalized = false
      and (
        p_circle_id is null
        or exists (
          select 1 from public.community_members cm
          where cm.community_id = p_circle_id and cm.user_id = m.user_id
        )
      )
  )
  select a.user_id,
         p.username,
         p.display_name,
         p.avatar_url,
         a.overall,
         a.tier,
         a.month_start
  from active a
  join public.profiles p on p.id = a.user_id
  order by
    a.overall desc,
    a.resonance desc,
    a.reach desc,
    a.reciprocity desc,
    a.rhythm desc,
    a.range_ desc,
    p.username asc nulls last
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.compute_pulse_subscores(uuid, date)
  to authenticated, anon, service_role;

grant execute on function public.get_top_current_pulse(int, uuid)
  to authenticated, anon, service_role;
