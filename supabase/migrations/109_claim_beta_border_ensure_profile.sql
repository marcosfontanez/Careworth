-- New accounts can hit claim_pulse_beta_border before handle_new_user finishes (or if the
-- trigger failed). user_pulse_avatar_frames.user_id FK → profiles(id) then rejects the insert
-- and the client never shows the beta gift. Ensure a shell profile row exists inside the RPC.

create or replace function public.claim_pulse_beta_border()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_frame_id uuid;
  v_newly boolean := false;
  v_ins int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  insert into public.profiles (
    id,
    display_name,
    first_name
  )
  values (
    v_uid,
    'PulseVerse member',
    'Member'
  )
  on conflict (id) do nothing;

  select id into v_frame_id
    from public.pulse_avatar_frames
   where slug = 'beta-tester-border'
   limit 1;

  if v_frame_id is null then
    return jsonb_build_object('ok', false, 'reason', 'frame_missing');
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
  values (v_uid, v_frame_id, 0, 'beta')
  on conflict (user_id, frame_id) do nothing;

  get diagnostics v_ins = row_count;
  v_newly := v_ins > 0;

  return jsonb_build_object(
    'ok', true,
    'newly_granted', v_newly,
    'frame_id', v_frame_id,
    'frame', (
      select to_jsonb(f) from public.pulse_avatar_frames f where f.id = v_frame_id
    )
  );
end;
$$;
