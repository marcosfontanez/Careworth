-- ============================================================================
-- 180: Harden high-risk SECURITY DEFINER RPCs (177 audit follow-up)
--
-- - Creator tip earnings: bind ledger updates to a tip row owned by caller.
-- - Streak helpers: only the signed-in user matching p_user_id (triggers OK).
-- - Poll vote RPC: require prior vote row + active poll window.
-- - Ad metrics: active campaign window + budget guard; authenticated-only RPC.
-- - Mutual follows: self-viewer only; drop anon EXECUTE.
--
-- Does not change feed ranking, storage policies, or broad RLS.
-- ============================================================================

-- ─── 1) Creator tips → earnings (single authenticated path per tip row) ─────

alter table public.creator_tips
  add column if not exists ledger_applied boolean not null default false;

comment on column public.creator_tips.ledger_applied is
  'True after increment_creator_earnings(uuid) applied this tip to creator_earnings (idempotent guard).';

drop function if exists public.increment_creator_earnings(uuid, numeric);

create or replace function public.increment_creator_earnings(p_tip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.creator_tips%rowtype;
  v_amt numeric;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into r
  from public.creator_tips
  where id = p_tip_id
  for update;

  if not found then
    raise exception 'tip_not_found';
  end if;

  if r.from_user_id is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

  if r.ledger_applied then
    raise exception 'tip_already_applied';
  end if;

  v_amt := r.amount::numeric;

  insert into public.creator_earnings (creator_id, total_tips, monthly_earnings, lifetime_earnings, pending_payout)
  values (r.to_creator_id, v_amt, v_amt * 0.95, v_amt * 0.95, v_amt * 0.95)
  on conflict (creator_id) do update set
    total_tips = creator_earnings.total_tips + excluded.total_tips,
    monthly_earnings = creator_earnings.monthly_earnings + (v_amt * 0.95),
    lifetime_earnings = creator_earnings.lifetime_earnings + (v_amt * 0.95),
    pending_payout = creator_earnings.pending_payout + (v_amt * 0.95),
    updated_at = now();

  update public.creator_tips
  set ledger_applied = true
  where id = p_tip_id;
end;
$$;

comment on function public.increment_creator_earnings(uuid) is
  'Apply one creator_tips row to creator_earnings; caller must be from_user_id (tip insert + RPC).';

grant execute on function public.increment_creator_earnings(uuid) to authenticated;

alter function public.increment_creator_earnings(uuid) set search_path = public;

-- ─── 2) Pulse bump_streak — caller must match subject user ───────────────────

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
  if p_user_id is null then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

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
    return;
  end if;

  if v_last = today - 1 then
    v_current := coalesce(v_current, 0) + 1;
  else
    v_current := 1;
  end if;

  v_longest := greatest(coalesce(v_longest, 0), v_current);

  update public.user_streaks
    set current_streak_days = v_current,
        longest_streak_days = v_longest,
        last_active_date    = today,
        updated_at          = now()
    where user_id = p_user_id;
end;
$$;

revoke execute on function public.bump_streak(uuid) from anon;
grant execute on function public.bump_streak(uuid) to authenticated;

-- ─── 3) Legacy weekly streak JSON — same caller binding ──────────────────────

create or replace function public.update_user_streak(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_row public.user_streaks%rowtype;
  v_new_streak int;
  v_best int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

  select * into v_row from public.user_streaks where user_id = p_user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak, best_streak, last_active_date, streak_started_at)
    values (p_user_id, 1, 1, v_today, v_today);
    return json_build_object('current_streak', 1, 'best_streak', 1);
  end if;

  if v_row.last_active_date = v_today then
    return json_build_object(
      'current_streak', coalesce(v_row.current_streak, v_row.current_streak_days, 0),
      'best_streak', coalesce(v_row.best_streak, v_row.longest_streak_days, 0)
    );
  end if;

  if v_row.last_active_date = v_today - 1 then
    v_new_streak := coalesce(v_row.current_streak, v_row.current_streak_days, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  v_best := greatest(coalesce(v_row.best_streak, v_row.longest_streak_days, 0), v_new_streak);

  update public.user_streaks
  set current_streak = v_new_streak,
      best_streak = v_best,
      last_active_date = v_today,
      streak_started_at = case when v_new_streak = 1 then v_today else v_row.streak_started_at end,
      updated_at = now()
  where user_id = p_user_id;

  return json_build_object('current_streak', v_new_streak, 'best_streak', v_best);
end;
$$;

grant execute on function public.update_user_streak(uuid) to authenticated;

-- Trigger auto_update_streak_on_post: poster session — auth.uid() = creator_id.

-- ─── 4) Live poll vote tally — authorizes via stream_poll_votes row ──────────

alter table public.stream_poll_votes
  add column if not exists counts_applied boolean not null default false;

comment on column public.stream_poll_votes.counts_applied is
  'True after increment_poll_vote applied this vote to stream_polls aggregates (idempotent RPC).';

create or replace function public.increment_poll_vote(p_poll_id uuid, p_option_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mark uuid;
  n int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.stream_polls p
    where p.id = p_poll_id
      and p.is_active
      and p.ends_at > now()
  ) then
    raise exception 'poll_not_active';
  end if;

  if not exists (
    select 1
    from public.stream_poll_votes v
    where v.poll_id = p_poll_id
      and v.option_id = p_option_id
      and v.user_id = auth.uid()
  ) then
    raise exception 'vote_row_required';
  end if;

  update public.stream_poll_votes v
  set counts_applied = true
  where v.poll_id = p_poll_id
    and v.user_id = auth.uid()
    and v.option_id = p_option_id
    and not v.counts_applied
  returning v.id into v_mark;

  if v_mark is null then
    return;
  end if;

  update public.stream_polls
    set total_votes = total_votes + 1,
        options = (
          select jsonb_agg(
            case when opt->>'id' = p_option_id
              then jsonb_set(opt, '{votes}', to_jsonb((opt->>'votes')::int + 1))
              else opt
            end
          )
          from jsonb_array_elements(options) opt
        )
    where id = p_poll_id;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'poll_not_found';
  end if;
end;
$$;

grant execute on function public.increment_poll_vote(uuid, text) to authenticated;

-- ─── 5) Sponsored posts — active window + budget headroom; auth-only RPC ────

create or replace function public.increment_ad_impression(campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.ad_campaigns c
  set impressions = c.impressions + 1,
      budget_spent = least(c.budget_spent + (c.cpm_rate / 1000.0), c.budget_total),
      updated_at = now()
  where c.id = campaign_id
    and c.status = 'active'
    and c.start_date <= now()
    and c.end_date >= now()
    and c.budget_spent < c.budget_total;
end;
$$;

create or replace function public.increment_ad_click(campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.ad_campaigns c
  set clicks = c.clicks + 1,
      updated_at = now()
  where c.id = campaign_id
    and c.status = 'active'
    and c.start_date <= now()
    and c.end_date >= now()
    and c.budget_spent < c.budget_total;
end;
$$;

revoke execute on function public.increment_ad_impression(uuid) from anon;
revoke execute on function public.increment_ad_click(uuid) from anon;

grant execute on function public.increment_ad_impression(uuid) to authenticated;
grant execute on function public.increment_ad_click(uuid) to authenticated;

alter function public.increment_ad_impression(uuid) set search_path = public;
alter function public.increment_ad_click(uuid) set search_path = public;

-- ─── 6) Mutual follows — authenticated self-service only ─────────────────────

create or replace function public.get_mutual_follow_ids(viewer uuid)
returns table (creator_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if viewer is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

  return query
  select f1.following_id
  from public.follows f1
  inner join public.follows f2
    on f2.follower_id = f1.following_id and f2.following_id = viewer
  where f1.follower_id = viewer;
end;
$$;

revoke execute on function public.get_mutual_follow_ids(uuid) from anon;
grant execute on function public.get_mutual_follow_ids(uuid) to authenticated;
