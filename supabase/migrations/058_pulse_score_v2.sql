-- 058_pulse_score_v2.sql
--
-- Pulse Score v2 — monthly 0–100 "health" score with 5 sub-dimensions and a
-- cumulative lifetime leaderboard. Supersedes the lifetime linear formula in
-- utils/pulseScore.ts which rewarded mega-viral hits with astronomical,
-- permanent scores and gave no signal for consistency, variety, or showing
-- up for others.
--
-- Design at a glance
-- ──────────────────
-- Every user gets five sub-scores (each 0–100) computed live from activity
-- in the *current calendar month*. The overall Pulse Score is the mean of
-- the five, mapped to a 5-tier identity label (Murmur / Pulse / Rhythm /
-- Beat / Anthem). On the 1st of each month the current month is finalized,
-- stamped as a permanent monthly record, and added to the user's lifetime
-- total. Lifetime leaderboards are sum-of-all-finalized-months so longevity
-- and consistency win over one lucky viral month.
--
-- The five axes
-- ─────────────
--   1. Reach        — min(100, 20·log₁₀(1+followers))
--   2. Resonance    — per-post engagement on this month's posts (log-scaled)
--   3. Rhythm       — post count this month + current activity streak
--   4. Range        — distinct content types used this month (of 6)
--   5. Reciprocity  — engagement you gave to others (log-scaled)
--
-- Reach uses current follower count (never resets — we don't punish you for
-- retaining an audience). The other four are month-scoped.
--
-- Tables
-- ──────
--   user_monthly_pulse_scores  — one row per (user, month). Active month
--                                is written back on every score read;
--                                `finalized=true` is stamped by the cron
--                                rollover. Historical rows are immutable.
--   user_pulse_lifetime        — cached aggregate used by the lifetime
--                                leaderboard (sum, best month, apex count).
--   user_streaks               — daily-granularity activity streak for the
--                                Rhythm sub-score.
--
-- RPCs
-- ────
--   get_current_pulse_score(user_id)    — live sub-scores + tier for NOW
--   get_pulse_history(user_id)          — all finalized months + current
--   get_top_current_pulse(limit, circle?) — leaderboard (global or circle)
--   get_top_lifetime_pulse(limit, circle?) — lifetime leaderboard
--   bump_streak(user_id)                — mark user active today
--   finalize_current_month()            — cron rollover on the 1st
--
-- Idempotent throughout. Safe to re-run.

-- ══════════════════════════════════════════════════════════════════════
-- 1. Tables
-- ══════════════════════════════════════════════════════════════════════

-- user_monthly_pulse_scores ────────────────────────────────────────────
-- One row per (user, month). We upsert into the *current* month on every
-- score read so leaderboards stay fresh without any cron work between
-- rollovers. Past months have `finalized=true` and are never rewritten.
create table if not exists public.user_monthly_pulse_scores (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  month_start  date not null,
  reach        int  not null default 0,
  resonance    int  not null default 0,
  rhythm       int  not null default 0,
  range_       int  not null default 0,  -- `range` is reserved in Postgres
  reciprocity  int  not null default 0,
  overall      int  not null default 0,
  tier         text not null default 'murmur',
  finalized    boolean not null default false,
  computed_at  timestamptz not null default now(),
  primary key (user_id, month_start)
);

create index if not exists idx_ump_month_overall
  on public.user_monthly_pulse_scores (month_start, overall desc);

create index if not exists idx_ump_user_month
  on public.user_monthly_pulse_scores (user_id, month_start desc);

alter table public.user_monthly_pulse_scores enable row level security;

-- Leaderboards need anyone to read anyone's row; only the backend writes
-- (all writes go through SECURITY DEFINER RPCs, no client UPDATE/INSERT).
drop policy if exists "ump_select_all" on public.user_monthly_pulse_scores;
create policy "ump_select_all"
  on public.user_monthly_pulse_scores for select using (true);

-- user_pulse_lifetime ──────────────────────────────────────────────────
-- Aggregate cache for the lifetime leaderboard. Updated by
-- finalize_current_month() when a month rolls over, so it's always
-- exactly the sum of finalized rows — but cheap to query on a leaderboard
-- pull because it's already denormalized.
create table if not exists public.user_pulse_lifetime (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  lifetime_total     bigint not null default 0,
  best_month_score   int    not null default 0,
  best_month_start   date,
  best_tier          text   not null default 'murmur',
  months_active      int    not null default 0,
  anthem_months      int    not null default 0,
  last_finalized_at  timestamptz,
  updated_at         timestamptz not null default now()
);

create index if not exists idx_upl_lifetime_total
  on public.user_pulse_lifetime (lifetime_total desc);

alter table public.user_pulse_lifetime enable row level security;

drop policy if exists "upl_select_all" on public.user_pulse_lifetime;
create policy "upl_select_all"
  on public.user_pulse_lifetime for select using (true);

-- user_streaks ─────────────────────────────────────────────────────────
-- Day-granularity "any meaningful action today" streak, fed by triggers
-- on every engagement table (posts, comments, likes, shares, My Pulse
-- likes/comments, circle threads/replies). Bumped at most once per day
-- per user — the calling trigger tolerates no-op bumps on the same day.
--
-- NOTE: migration 012 already created a `user_streaks` table with a
-- different column layout (`current_streak`, `best_streak`, etc.). We
-- keep that table and additively add the Pulse-specific streak-day
-- columns via `add column if not exists` so both features coexist
-- without stomping each other's data.
create table if not exists public.user_streaks (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  current_streak_days  int  not null default 0,
  longest_streak_days  int  not null default 0,
  last_active_date     date,
  updated_at           timestamptz not null default now()
);

-- Defensive no-ops if the table was created by migration 012 first.
alter table public.user_streaks
  add column if not exists current_streak_days int not null default 0;
alter table public.user_streaks
  add column if not exists longest_streak_days int not null default 0;
alter table public.user_streaks
  add column if not exists last_active_date    date;
alter table public.user_streaks
  add column if not exists updated_at          timestamptz not null default now();

alter table public.user_streaks enable row level security;

drop policy if exists "streaks_select_all" on public.user_streaks;
create policy "streaks_select_all"
  on public.user_streaks for select using (true);

-- ══════════════════════════════════════════════════════════════════════
-- 2. Helpers
-- ══════════════════════════════════════════════════════════════════════

-- Floor a timestamp to the first day of the month (UTC). This is the
-- canonical month key everywhere in this migration.
create or replace function public.pulse_month_floor(ts timestamptz)
returns date language sql immutable as $$
  select (date_trunc('month', ts at time zone 'UTC'))::date;
$$;

-- Current month key. Used by every RPC to decide "now" without drifting.
create or replace function public.pulse_current_month()
returns date language sql stable as $$
  select public.pulse_month_floor(now());
$$;

-- Map an overall 0–100 score to a tier name. Single source of truth;
-- client mirrors this mapping in utils/pulseScore.ts.
create or replace function public.pulse_tier_from_score(p_overall int)
returns text language sql immutable as $$
  select case
    when p_overall >= 80 then 'anthem'
    when p_overall >= 60 then 'beat'
    when p_overall >= 40 then 'rhythm'
    when p_overall >= 20 then 'pulse'
    else 'murmur'
  end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. Streak bump
-- ══════════════════════════════════════════════════════════════════════

-- bump_streak(user) — call on any meaningful user action. Idempotent
-- within the same UTC day. Extends the streak if yesterday was active,
-- resets to 1 if there was a gap, updates longest_streak_days as a
-- high-water mark. Trigger-safe: never fails, never blocks the write
-- that called it.
create or replace function public.bump_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today        date := (now() at time zone 'UTC')::date;
  v_last       date;
  v_current    int;
  v_longest    int;
begin
  if p_user_id is null then return; end if;

  select last_active_date, current_streak_days, longest_streak_days
    into v_last, v_current, v_longest
  from public.user_streaks
  where user_id = p_user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak_days, longest_streak_days, last_active_date)
    values (p_user_id, 1, 1, today);
    return;
  end if;

  if v_last = today then
    -- Already counted today; nothing to do.
    return;
  end if;

  if v_last = today - 1 then
    v_current := v_current + 1;
  else
    -- Gap of >1 day — streak resets.
    v_current := 1;
  end if;

  v_longest := greatest(v_longest, v_current);

  update public.user_streaks
    set current_streak_days = v_current,
        longest_streak_days = v_longest,
        last_active_date    = today,
        updated_at          = now()
    where user_id = p_user_id;
end;
$$;

grant execute on function public.bump_streak(uuid) to authenticated, anon, service_role;

-- Generic trigger that extracts the owner uuid from `NEW` and bumps.
-- We install this on every engagement table below so each meaningful
-- action counts toward the streak exactly once (the bump itself
-- self-deduplicates within a day).
create or replace function public.pulse_streak_trg_bump()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_col text := tg_argv[0]; -- column name carrying the actor's uuid on NEW
begin
  execute format('select ($1).%I', v_col) into v_uid using new;
  if v_uid is not null then
    perform public.bump_streak(v_uid);
  end if;
  return new;
exception when others then
  -- Never fail the originating write if the streak bump errors.
  return new;
end;
$$;

-- Install streak-bump triggers on every engagement table. Each `drop +
-- create` keeps this migration idempotent. The tg_argv tells the generic
-- handler which column on NEW holds the actor's uuid.
do $$
declare
  cfg record;
begin
  for cfg in
    select * from (values
      ('posts',                  'creator_id'),
      ('comments',               'author_id'),
      ('post_likes',             'user_id'),
      ('post_shares',            'user_id'),
      ('profile_updates',        'user_id'),
      ('profile_update_likes',   'user_id'),
      ('profile_update_comments','author_id'),
      ('circle_threads',         'author_id'),
      ('circle_replies',         'author_id')
    ) as t(tbl, col)
  loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=cfg.tbl) then
      execute format(
        'drop trigger if exists pulse_streak_bump on public.%I', cfg.tbl
      );
      execute format(
        'create trigger pulse_streak_bump
           after insert on public.%I
           for each row execute function public.pulse_streak_trg_bump(%L)',
        cfg.tbl, cfg.col
      );
    end if;
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. Sub-score compute — the heart of Pulse Score v2
-- ══════════════════════════════════════════════════════════════════════

-- compute_pulse_subscores(user, month_start) → (reach, resonance, rhythm,
--                                               range_, reciprocity,
--                                               overall, tier)
--
-- Deterministic, side-effect-free. Given a user and a month, returns the
-- five 0–100 sub-scores plus the derived overall and tier. Everything
-- else (get_current_pulse_score, finalize_current_month) wraps this.
--
-- All windows are `[month_start, month_start + 1 month)` — half-open so
-- the final day counts but the 1st of the next month does not. Reach is
-- the only lifetime input; the other four are month-scoped.
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

  -- Reach inputs
  v_followers bigint;

  -- Resonance inputs (engagement received on THIS-MONTH posts)
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

  -- Rhythm inputs
  v_streak_days int;

  -- Range inputs
  v_has_thought      boolean;
  v_has_clip         boolean;
  v_has_link         boolean;
  v_has_pics         boolean;
  v_has_feed_post    boolean;
  v_has_circle_post  boolean;
  v_range_count      int;

  -- Reciprocity inputs (engagement GIVEN to *other* creators)
  v_likes_given       bigint;
  v_comments_given    bigint;
  v_shares_given      bigint;
  v_pu_likes_given    bigint;
  v_pu_comments_given bigint;
  v_circle_replies    bigint;
  v_reciprocity_raw   numeric;

  -- Sub-scores
  s_reach       int;
  s_resonance   int;
  s_rhythm      int;
  s_range       int;
  s_reciprocity int;
  s_overall     int;
  s_tier        text;
begin
  -- ── 1. Reach ────────────────────────────────────────────────────────
  select count(*) into v_followers
    from public.follows where following_id = p_user_id;

  s_reach := least(100,
    greatest(0, round(20 * log(10::numeric, 1 + coalesce(v_followers, 0)::numeric))::int));

  -- ── 2. Resonance ────────────────────────────────────────────────────
  --
  -- Engagement on posts *created this month*. Scopes the denominator so
  -- a creator who posts 3 great clips averages the same as one who posts
  -- 30 mediocre ones (prevents post-farming). Comments×2 and shares×3
  -- because they're higher-intent than a like.
  select count(*) into v_posts_this_month
    from public.posts
    where creator_id = p_user_id
      and created_at >= m_start and created_at < m_end;

  select count(*) into v_pu_this_month
    from public.profile_updates
    where user_id = p_user_id
      and created_at >= m_start and created_at < m_end;

  v_total_posts_made := coalesce(v_posts_this_month, 0) + coalesce(v_pu_this_month, 0);

  -- Engagement counts over the SAME set of this-month posts (any time).
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
      greatest(0, round(30 * log(10::numeric, 1 + v_engagement_per_post))::int));
  end if;

  -- ── 3. Rhythm ───────────────────────────────────────────────────────
  --
  -- Up to 60pts from post volume this month (caps at 15+ posts) + up to
  -- 40pts from current streak (caps at 20+ day streak). Both caps chosen
  -- so that a creator who posts 3×/week and shows up daily naturally
  -- lands near 100 without needing to grind.
  select coalesce(current_streak_days, 0)
    into v_streak_days
    from public.user_streaks where user_id = p_user_id;

  s_rhythm := least(60, v_total_posts_made::int * 4)
            + least(40, coalesce(v_streak_days, 0) * 2);
  s_rhythm := least(100, greatest(0, s_rhythm));

  -- ── 4. Range ────────────────────────────────────────────────────────
  --
  -- "Are you using PulseVerse richly?" Counts distinct types used this
  -- month out of six buckets: Thought / Clip / Link / Pics on My Pulse,
  -- plus Feed post + Circle post. Maps 1:1 to utils/myPulseDisplayType.ts
  -- so the UI and DB agree on what "Clip" or "Pics" means.
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

  s_range := round(v_range_count * 100.0 / 6.0)::int;
  s_range := least(100, greatest(0, s_range));

  -- ── 5. Reciprocity ──────────────────────────────────────────────────
  --
  -- "How much do you show up for others?" Only counts engagement GIVEN
  -- to OTHER creators (so self-likes can't farm the score). Weights:
  --   comment =3, share =5, circle reply =4, like =1.
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
    greatest(0, round(12 * log(10::numeric, 1 + v_reciprocity_raw))::int));

  -- ── 6. Overall + tier ──────────────────────────────────────────────
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

grant execute on function public.compute_pulse_subscores(uuid, date)
  to authenticated, anon, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 5. Read RPCs
-- ══════════════════════════════════════════════════════════════════════

-- get_current_pulse_score — live current-month sub-scores for the caller
-- (or any target user). ALSO writes back the result to
-- user_monthly_pulse_scores for the active month so leaderboards are
-- always up-to-date without a separate refresher job. Leaderboard queries
-- read the stored row; the score pill reads this RPC directly.
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
stable
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

-- get_pulse_history — returns every month the user has a row for
-- (finalized + the in-progress current month) plus a lifetime summary.
-- Used by the "tap the pill" history sheet.
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
    select lifetime_total, best_month_score, best_tier, months_active, anthem_months
    from public.user_pulse_lifetime where user_id = p_user_id
  )
  select months.*,
         coalesce((select lifetime_total   from life), 0)::bigint,
         coalesce((select best_month_score from life), 0)::int,
         coalesce((select best_tier        from life), 'murmur')::text,
         coalesce((select months_active    from life), 0)::int,
         coalesce((select anthem_months    from life), 0)::int
  from months
  order by months.month_start desc;
$$;

grant execute on function public.get_pulse_history(uuid)
  to authenticated, anon, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 6. Leaderboards
-- ══════════════════════════════════════════════════════════════════════

-- get_top_current_pulse(limit, circle_id?) — Top-N this calendar month.
-- If `p_circle_id` is given, only users who are members of that Circle
-- are considered. Global when null.
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
    select m.user_id, m.overall, m.tier, m.month_start
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
  order by a.overall desc, p.username asc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.get_top_current_pulse(int, uuid)
  to authenticated, anon, service_role;

-- get_top_lifetime_pulse(limit, circle_id?) — all-time leaderboard by
-- cumulative score. The lifetime table is maintained by
-- finalize_current_month(), so reads are a single indexed scan.
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
  select l.user_id,
         p.username,
         p.display_name,
         p.avatar_url,
         l.lifetime_total,
         l.best_month_score,
         l.best_tier,
         l.months_active,
         l.anthem_months
  from public.user_pulse_lifetime l
  join public.profiles p on p.id = l.user_id
  where l.lifetime_total > 0
    and (
      p_circle_id is null
      or exists (
        select 1 from public.community_members cm
        where cm.community_id = p_circle_id and cm.user_id = l.user_id
      )
    )
  order by l.lifetime_total desc, p.username asc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.get_top_lifetime_pulse(int, uuid)
  to authenticated, anon, service_role;

-- ══════════════════════════════════════════════════════════════════════
-- 7. Monthly finalize (cron rollover)
-- ══════════════════════════════════════════════════════════════════════

-- finalize_current_month()
--
-- Runs on the 1st of each month (via pg_cron below). Finalizes the month
-- that just ended:
--   1. Recomputes sub-scores for every user that had activity in that
--      month (anyone with a row in user_monthly_pulse_scores for that
--      month, OR anyone with a streak touched during that month).
--   2. Writes the final numbers + tier, flips `finalized=true`.
--   3. Bumps user_pulse_lifetime: adds this month's overall to the
--      running total, updates best_month_score / best_tier if beaten,
--      increments anthem_months for tier='anthem', months_active for
--      any overall > 0.
--
-- Idempotent: re-running the same call does nothing because finalized
-- rows are skipped on the recompute pass and the lifetime bump is
-- conditional on the row being newly finalized.
create or replace function public.finalize_current_month()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_month date := public.pulse_month_floor(now() - interval '1 day');
  v_processed  int  := 0;
  r            record;
  s            record;
begin
  -- Seed rows for any user who was active in the prior month but
  -- didn't have a monthly row yet (e.g. never opened the app after
  -- the score was wired up).
  insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
  select distinct p.creator_id, v_prev_month, false
    from public.posts p
    where p.created_at >= v_prev_month::timestamptz
      and p.created_at <  (v_prev_month + interval '1 month')::timestamptz
      and p.creator_id is not null
  on conflict (user_id, month_start) do nothing;

  insert into public.user_monthly_pulse_scores (user_id, month_start, finalized)
  select distinct pu.user_id, v_prev_month, false
    from public.profile_updates pu
    where pu.created_at >= v_prev_month::timestamptz
      and pu.created_at <  (v_prev_month + interval '1 month')::timestamptz
      and pu.user_id is not null
  on conflict (user_id, month_start) do nothing;

  -- Recompute + finalize every not-yet-finalized row for the prior month.
  for r in
    select user_id
    from public.user_monthly_pulse_scores
    where month_start = v_prev_month
      and finalized = false
  loop
    select * into s from public.compute_pulse_subscores(r.user_id, v_prev_month);

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
      where user_id = r.user_id and month_start = v_prev_month;

    -- Bump lifetime aggregate.
    insert into public.user_pulse_lifetime (
      user_id, lifetime_total, best_month_score, best_month_start,
      best_tier, months_active, anthem_months, last_finalized_at, updated_at
    ) values (
      r.user_id,
      s.overall::bigint,
      s.overall,
      v_prev_month,
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
                                   then v_prev_month
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

  return v_processed;
end;
$$;

grant execute on function public.finalize_current_month()
  to authenticated, anon, service_role;

-- Schedule the rollover for 00:00 UTC on the 1st of every month. We only
-- try to schedule it if pg_cron is installed — Supabase ships it enabled
-- on most tiers, but we don't want to fail the migration on a tier that
-- doesn't have it. If pg_cron isn't available, finalize_current_month()
-- can be invoked manually (Supabase dashboard → SQL editor) or via a
-- scheduled Edge Function.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Clean up any prior schedule to keep the migration idempotent.
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'pulse-finalize-month';

    perform cron.schedule(
      'pulse-finalize-month',
      '0 0 1 * *',
      $cron$ select public.finalize_current_month(); $cron$
    );
  end if;
exception when others then
  -- Non-fatal: admins can wire a schedule manually if needed.
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 8. Backfill (safe, zero-downtime)
-- ══════════════════════════════════════════════════════════════════════
--
-- Seed the current month with a first compute for every user that has
-- any activity in it. This gives the leaderboards immediate content on
-- launch instead of "no scores yet for May". Future reads will keep the
-- row fresh through get_current_pulse_score's upsert.

do $$
declare
  v_month date := public.pulse_current_month();
  r record;
  s record;
begin
  for r in
    select distinct creator_id as uid from public.posts
    where created_at >= v_month::timestamptz
      and created_at <  (v_month + interval '1 month')::timestamptz
      and creator_id is not null
    union
    select distinct user_id as uid from public.profile_updates
    where created_at >= v_month::timestamptz
      and created_at <  (v_month + interval '1 month')::timestamptz
      and user_id is not null
  loop
    select * into s from public.compute_pulse_subscores(r.uid, v_month);

    insert into public.user_monthly_pulse_scores (
      user_id, month_start, reach, resonance, rhythm, range_,
      reciprocity, overall, tier, finalized, computed_at
    ) values (
      r.uid, v_month, s.reach, s.resonance, s.rhythm, s.range_,
      s.reciprocity, s.overall, s.tier, false, now()
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
  end loop;
end;
$$;
