-- ============================================================================
-- 182: Streak internals (trigger-safe) + atomic tip/poll RPCs
--
-- Split Pulse / legacy streak mutations into INTERNAL helpers without JWT
-- reliance so SECURITY DEFINER triggers keep working when auth.uid() is null
-- or not the semantic actor.
--
-- Adds single-transaction RPCs:
--   create_creator_tip_and_apply_earnings(...)
--   cast_stream_poll_vote(p_poll_id, p_option_id)
--
-- increment_creator_earnings(uuid) remains for reconciling legacy orphan tip rows.
-- increment_poll_vote(uuid, text) remains for operators using elevated sessions;
--     REVOKE EXECUTE from authenticated — clients must use cast_stream_poll_vote.
--
-- Operational recovery (legacy two-step failures):
-- - Tips: call increment_creator_earnings(tip_id) while authenticated as tipper.
-- - Polls: call cast_stream_poll_vote again as the voter (replay path applies tally).
-- ============================================================================

-- ─── Internal: apply one vote increment to stream_polls JSON aggregates ───────

create or replace function public._apply_stream_poll_option_tally(p_poll_id uuid, p_option_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.stream_polls p
  set total_votes = p.total_votes + 1,
      options = (
        select jsonb_agg(
          case
            when opt->>'id' = p_option_id then
              jsonb_set(
                opt,
                '{votes}',
                to_jsonb(coalesce((opt->>'votes')::int, 0) + 1)
              )
            else opt
          end
        )
        from jsonb_array_elements(p.options) opt
      )
  where p.id = p_poll_id;

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'poll_not_found';
  end if;
end;
$$;

revoke all on function public._apply_stream_poll_option_tally(uuid, text) from public;

comment on function public._apply_stream_poll_option_tally(uuid, text) is
  'Internal: bump stream_polls aggregate for one option (no EXECUTE for API roles).';

-- ─── Pulse streak bump — internal (trigger-safe, no JWT) ──────────────────────

create or replace function public._bump_streak_internal(p_user_id uuid)
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

revoke all on function public._bump_streak_internal(uuid) from public;

-- ─── Legacy weekly streak JSON — internal (trigger-safe) ─────────────────────

create or replace function public._update_user_streak_internal(p_user_id uuid)
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

revoke all on function public._update_user_streak_internal(uuid) from public;

-- ─── Rewire triggers to internals (before dropping old signatures) ───────────

create or replace function public.pulse_streak_trg_bump()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_col text := tg_argv[0];
begin
  execute format('select ($1).%I', v_col) into v_uid using new;
  if v_uid is not null then
    perform public._bump_streak_internal(v_uid);
  end if;
  return new;
exception when others then
  return new;
end;
$$;

create or replace function public.auto_update_streak_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.streak_activity (user_id, activity_date, activity_type)
  values (new.creator_id, current_date, 'post')
  on conflict (user_id, activity_date, activity_type) do nothing;

  perform public._update_user_streak_internal(new.creator_id);
  return new;
end;
$$;

-- ─── Drop UUID-arg RPC signatures; replace with self-scoped zero-arg wrappers ─

drop function if exists public.bump_streak(uuid);
drop function if exists public.update_user_streak(uuid);

create or replace function public.bump_streak()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform public._bump_streak_internal(auth.uid());
end;
$$;

create or replace function public.update_user_streak()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  return public._update_user_streak_internal(auth.uid());
end;
$$;

comment on function public.bump_streak() is
  'Authenticated self bump; triggers call _bump_streak_internal(uuid) directly.';

comment on function public.update_user_streak() is
  'Authenticated self streak JSON update; triggers call _update_user_streak_internal(uuid).';

revoke all on function public.bump_streak() from public;
revoke all on function public.update_user_streak() from public;

grant execute on function public.bump_streak() to authenticated;
grant execute on function public.update_user_streak() to authenticated;

alter function public.bump_streak() set search_path = public;
alter function public.update_user_streak() set search_path = public;

-- ─── Atomic creator tip + ledger apply ────────────────────────────────────────

create or replace function public.create_creator_tip_and_apply_earnings(
  p_to_creator_id uuid,
  p_amount numeric,
  p_message text default null,
  p_post_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tip_id uuid;
  v_amt int;
  v_amt_num numeric;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_to_creator_id is null or p_amount is null then
    raise exception 'invalid_tip';
  end if;

  if trunc(p_amount) <> p_amount or p_amount <= 0 then
    raise exception 'invalid_tip_amount';
  end if;

  v_amt := p_amount::int;
  if v_amt not in (1, 5, 10, 25, 50, 100) then
    raise exception 'invalid_tip_amount';
  end if;

  v_amt_num := v_amt::numeric;

  insert into public.creator_tips (
    from_user_id,
    to_creator_id,
    amount,
    message,
    post_id,
    ledger_applied
  )
  values (
    v_uid,
    p_to_creator_id,
    v_amt,
    nullif(trim(coalesce(p_message, '')), ''),
    p_post_id,
    false
  )
  returning id into v_tip_id;

  insert into public.creator_earnings (creator_id, total_tips, monthly_earnings, lifetime_earnings, pending_payout)
  values (p_to_creator_id, v_amt_num, v_amt_num * 0.95, v_amt_num * 0.95, v_amt_num * 0.95)
  on conflict (creator_id) do update set
    total_tips = creator_earnings.total_tips + excluded.total_tips,
    monthly_earnings = creator_earnings.monthly_earnings + (v_amt_num * 0.95),
    lifetime_earnings = creator_earnings.lifetime_earnings + (v_amt_num * 0.95),
    pending_payout = creator_earnings.pending_payout + (v_amt_num * 0.95),
    updated_at = now();

  update public.creator_tips
  set ledger_applied = true
  where id = v_tip_id;

  return v_tip_id;
end;
$$;

comment on function public.create_creator_tip_and_apply_earnings(uuid, numeric, text, uuid) is
  'Single transaction: insert creator_tips + apply creator_earnings (from_user_id = auth.uid()).';

grant execute on function public.create_creator_tip_and_apply_earnings(uuid, numeric, text, uuid) to authenticated;

alter function public.create_creator_tip_and_apply_earnings(uuid, numeric, text, uuid) set search_path = public;

-- ─── Atomic poll vote (insert + tally + counts_applied) ───────────────────────

create or replace function public.cast_stream_poll_vote(p_poll_id uuid, p_option_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row record;
  v_replayed boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_poll_id::text || '|' || v_uid::text, 0));

  select v.id, v.option_id, v.counts_applied
    into v_row
  from public.stream_poll_votes v
  where v.poll_id = p_poll_id
    and v.user_id = v_uid
  for update;

  if not found then
    if not exists (
      select 1
      from public.stream_polls p
      where p.id = p_poll_id
        and p.is_active
        and p.ends_at > now()
    ) then
      return json_build_object('ok', false, 'reason', 'poll_not_active');
    end if;

    insert into public.stream_poll_votes (poll_id, option_id, user_id)
    values (p_poll_id, p_option_id, v_uid)
    returning id, option_id, counts_applied into v_row;

    v_replayed := false;
  else
    v_replayed := true;

    if v_row.counts_applied then
      return json_build_object('ok', false, 'reason', 'already_voted');
    end if;

    if v_row.option_id is distinct from p_option_id then
      return json_build_object('ok', false, 'reason', 'option_mismatch');
    end if;
  end if;

  perform public._apply_stream_poll_option_tally(p_poll_id, p_option_id);

  update public.stream_poll_votes
  set counts_applied = true
  where id = v_row.id;

  return json_build_object('ok', true, 'replayed', v_replayed);
end;
$$;
comment on function public.cast_stream_poll_vote(uuid, text) is
  'Single transaction: insert vote (if needed), tally poll, set counts_applied. Idempotent replay for orphans.';

grant execute on function public.cast_stream_poll_vote(uuid, text) to authenticated;

alter function public.cast_stream_poll_vote(uuid, text) set search_path = public;

-- ─── Legacy increment_poll_vote — not callable by authenticated clients ─────

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

  perform public._apply_stream_poll_option_tally(p_poll_id, p_option_id);
end;
$$;

revoke execute on function public.increment_poll_vote(uuid, text) from authenticated;
revoke execute on function public.increment_poll_vote(uuid, text) from anon;
revoke execute on function public.increment_poll_vote(uuid, text) from public;

comment on function public.increment_poll_vote(uuid, text) is
  'Legacy tally helper (JWT session only). Prefer cast_stream_poll_vote; no EXECUTE for authenticated role.';
