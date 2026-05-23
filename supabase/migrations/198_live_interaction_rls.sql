-- Live chat, poll votes, and host poll management — active-stream guards + RLS alignment.
-- Tables: stream_messages, stream_polls, stream_poll_votes, live_streams (not live_messages / live_poll_options).

-- ─── A) Chat: only active (non-ended) live streams ───────────────────────────
drop policy if exists "Authenticated users post to live streams" on public.stream_messages;

create policy "Authenticated users post to live streams"
  on public.stream_messages for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.live_streams ls
      where ls.id = stream_id
        and ls.status = 'live'
        and ls.ended_at is null
    )
    and not exists (
      select 1
      from public.live_streams ls
      inner join public.blocked_users bu on (
        (bu.blocker_id = ls.host_id and bu.blocked_id = (select auth.uid()))
        or (bu.blocker_id = (select auth.uid()) and bu.blocked_id = ls.host_id)
      )
      where ls.id = stream_id
    )
  );

-- ─── B) Poll votes: defense-in-depth (RPC is primary path) ─────────────────
drop policy if exists "Users can cast their own vote" on public.stream_poll_votes;

create policy "Users can cast their own vote"
  on public.stream_poll_votes for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.stream_polls p
      inner join public.live_streams ls on ls.id::text = p.stream_id
      where p.id = poll_id
        and p.is_active = true
        and p.ends_at > now()
        and ls.status = 'live'
        and ls.ended_at is null
    )
  );

-- ─── C) Host poll create/update: stream must be live ───────────────────────
drop policy if exists "Hosts can create polls" on public.stream_polls;

create policy "Hosts can create polls"
  on public.stream_polls for insert
  with check (
    exists (
      select 1
      from public.live_streams ls
      where ls.id::text = stream_id
        and ls.host_id = (select auth.uid())
        and ls.status = 'live'
        and ls.ended_at is null
    )
  );

drop policy if exists "Hosts can update polls" on public.stream_polls;

create policy "Hosts can update polls"
  on public.stream_polls for update
  using (
    exists (
      select 1
      from public.live_streams ls
      where ls.id::text = stream_id
        and ls.host_id = (select auth.uid())
        and ls.status = 'live'
        and ls.ended_at is null
    )
  );

-- ─── D) Atomic poll vote RPC — require active poll + live stream ───────────
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
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if p_poll_id is null or p_option_id is null or length(trim(p_option_id)) = 0 then
    return json_build_object('ok', false, 'reason', 'missing_fields');
  end if;

  if not exists (
    select 1
    from public.stream_polls p
    inner join public.live_streams ls on ls.id::text = p.stream_id
    where p.id = p_poll_id
      and p.is_active = true
      and p.ends_at > now()
      and ls.status = 'live'
      and ls.ended_at is null
  ) then
    return json_build_object('ok', false, 'reason', 'poll_not_active');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_poll_id::text || '|' || v_uid::text, 0));

  select v.id, v.option_id, v.counts_applied
    into v_row
  from public.stream_poll_votes v
  where v.poll_id = p_poll_id
    and v.user_id = v_uid
  for update;

  if not found then
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
  'Single transaction: insert vote (if needed), tally poll, set counts_applied. Requires live non-ended stream.';

revoke all on function public.cast_stream_poll_vote(uuid, text) from public;
grant execute on function public.cast_stream_poll_vote(uuid, text) to authenticated;
