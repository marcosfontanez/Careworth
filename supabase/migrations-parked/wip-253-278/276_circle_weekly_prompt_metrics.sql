-- Migration 276: Circle weekly prompt performance metrics
--
-- Lightweight performance-learning layer. After a prompt week completes, we
-- aggregate the engagement on content (threads + wall posts) that was created
-- from each "This Week" prompt card, so the generator (Edge Function) can favor
-- styles that drove participation and avoid styles that flopped.
--
-- The heavy lifting lives in a SQL function (public.calc_circle_weekly_prompt_metrics)
-- so it can run reliably from pg_cron (no HTTP/pg_net needed) AND be invoked by
-- the calculate-circle-weekly-prompt-metrics Edge Function for manual runs.
--
-- Engagement on content is read from the maintained denormalized counters
-- (circle_threads.reply_count / reaction_count, posts.comment_count / like_count)
-- — no per-row scans of replies/comments needed.
--
-- RLS: server-only (admin analytics, not user-facing).
--
-- Idempotent: IF NOT EXISTS + upsert on (prompt_id) + create-or-replace fn.

-- ---------------------------------------------------------------------------
-- 1. circle_weekly_prompt_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.circle_weekly_prompt_metrics (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.circle_weekly_prompts(id) on delete cascade,
  circle_id uuid not null references public.communities(id) on delete cascade,
  circle_slug text not null,
  week_start_date date not null,
  prompt_style text,
  impressions_count integer not null default 0,
  post_count integer not null default 0,
  comment_count integer not null default 0,
  reaction_count integer not null default 0,
  unique_participants_count integer not null default 0,
  circle_join_count integer not null default 0,
  engagement_score numeric not null default 0,
  calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint circle_weekly_prompt_metrics_prompt_uq unique (prompt_id)
);

comment on table public.circle_weekly_prompt_metrics is
  'Aggregated engagement per weekly prompt. Feeds the AI generator so it learns which styles perform per Circle. Server-only.';

create index if not exists idx_cwpm_circle on public.circle_weekly_prompt_metrics (circle_id);
create index if not exists idx_cwpm_slug on public.circle_weekly_prompt_metrics (circle_slug);
create index if not exists idx_cwpm_week on public.circle_weekly_prompt_metrics (week_start_date);
create index if not exists idx_cwpm_score on public.circle_weekly_prompt_metrics (engagement_score);
create index if not exists idx_cwpm_style on public.circle_weekly_prompt_metrics (prompt_style);

alter table public.circle_weekly_prompt_metrics enable row level security;

-- Server-only: no anon/authenticated policies => denied. service_role bypasses RLS.
revoke all on public.circle_weekly_prompt_metrics from anon, authenticated;
grant all on public.circle_weekly_prompt_metrics to service_role;

-- ---------------------------------------------------------------------------
-- 2. Calculation function. Computes + upserts metrics for every prompt of a
--    given week. Continues past individual failures and returns a summary.
--    p_week_start defaults to the PREVIOUS completed week (Monday-anchored).
-- ---------------------------------------------------------------------------
create or replace function public.calc_circle_weekly_prompt_metrics(
  p_week_start date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := coalesce(p_week_start, public.circle_week_start(now() - interval '7 days'));
  v_week_end date := v_week + 7;
  r record;
  v_thread_count int;
  v_thread_replies int;
  v_thread_reactions int;
  v_wall_count int;
  v_wall_comments int;
  v_wall_likes int;
  v_post_count int;
  v_comment_count int;
  v_reaction_count int;
  v_participants int;
  v_joins int;
  v_score numeric;
  v_calculated int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  for r in
    select id, circle_id, circle_slug, prompt_style
    from public.circle_weekly_prompts
    where week_start_date = v_week
  loop
    begin
      -- Threads created from this prompt card (Questions tab content).
      select
        count(*) filter (where t.deleted_at is null
                          and coalesce(t.moderation_status, 'active') = 'active'),
        coalesce(sum(coalesce(t.reply_count, 0)) filter (where t.deleted_at is null), 0),
        coalesce(sum(coalesce(t.reaction_count, 0)) filter (where t.deleted_at is null), 0)
      into v_thread_count, v_thread_replies, v_thread_reactions
      from public.circle_threads t
      where t.weekly_prompt_id = r.id;

      -- Wall posts created from this prompt card (meme/video/image content).
      select
        count(*),
        coalesce(sum(coalesce(p.comment_count, 0)), 0),
        coalesce(sum(coalesce(p.like_count, 0)), 0)
      into v_wall_count, v_wall_comments, v_wall_likes
      from public.posts p
      where p.weekly_prompt_id = r.id;

      v_post_count := v_thread_count + v_wall_count;
      v_comment_count := v_thread_replies + v_wall_comments;
      v_reaction_count := v_thread_reactions + v_wall_likes;

      -- Unique participants = distinct authors across threads + wall posts.
      select count(*) into v_participants
      from (
        select t.author_id as uid
        from public.circle_threads t
        where t.weekly_prompt_id = r.id and t.author_id is not null
        union
        select p.creator_id as uid
        from public.posts p
        where p.weekly_prompt_id = r.id and p.creator_id is not null
      ) participants;

      -- Circle joins during the prompt week.
      select count(*) into v_joins
      from public.community_members cm
      where cm.community_id = r.circle_id
        and cm.joined_at >= v_week::timestamptz
        and cm.joined_at < v_week_end::timestamptz;

      v_score :=
        (v_post_count * 5)
        + (v_comment_count * 3)
        + (v_reaction_count * 1)
        + (v_participants * 4)
        + (v_joins * 6);

      insert into public.circle_weekly_prompt_metrics (
        prompt_id, circle_id, circle_slug, week_start_date, prompt_style,
        impressions_count, post_count, comment_count, reaction_count,
        unique_participants_count, circle_join_count, engagement_score,
        calculated_at, metadata
      )
      values (
        r.id, r.circle_id, r.circle_slug, v_week, r.prompt_style,
        0, v_post_count, v_comment_count, v_reaction_count,
        v_participants, v_joins, v_score,
        now(), jsonb_build_object('thread_count', v_thread_count, 'wall_post_count', v_wall_count)
      )
      on conflict (prompt_id) do update set
        circle_slug = excluded.circle_slug,
        week_start_date = excluded.week_start_date,
        prompt_style = excluded.prompt_style,
        post_count = excluded.post_count,
        comment_count = excluded.comment_count,
        reaction_count = excluded.reaction_count,
        unique_participants_count = excluded.unique_participants_count,
        circle_join_count = excluded.circle_join_count,
        engagement_score = excluded.engagement_score,
        calculated_at = now(),
        metadata = excluded.metadata;

      v_calculated := v_calculated + 1;
    exception when others then
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object('circle_slug', r.circle_slug, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'week_start_date', v_week,
    'prompts_calculated', v_calculated,
    'prompts_failed', v_failed,
    'errors', v_errors
  );
end;
$$;

comment on function public.calc_circle_weekly_prompt_metrics(date) is
  'Aggregates + upserts engagement metrics for all weekly prompts of a week (default: previous completed week). Continues past per-prompt failures.';

revoke all on function public.calc_circle_weekly_prompt_metrics(date) from public;
grant execute on function public.calc_circle_weekly_prompt_metrics(date) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Weekly schedule (metrics). pg_cron runs SQL in-DB (no pg_net needed), so
--    the metrics job is reliable without secrets. The AI GENERATION job is an
--    Edge Function (needs OPENAI_API_KEY) and must be scheduled via Supabase
--    Scheduled Functions / external cron — see the function README.
--
--    Monday 10:00 UTC ≈ 06:00 America/New_York during EDT (UTC-4). During EST
--    (UTC-5) this is 05:00 ET. Documented assumption: UTC-fixed schedule.
--    The generation job should run AFTER this (e.g. 10:15 UTC) so it sees the
--    previous week's freshly-calculated metrics.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'circle-weekly-prompt-metrics';

    perform cron.schedule(
      'circle-weekly-prompt-metrics',
      '0 10 * * 1',
      $cron$ select public.calc_circle_weekly_prompt_metrics(); $cron$
    );
  end if;
end;
$$;
