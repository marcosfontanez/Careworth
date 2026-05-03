-- Beta-only avatar border: catalog row + idempotent claim RPC for all testers (new + existing).

-- Allow 'beta' grants (rank 0), same shape as admin.
alter table public.user_pulse_avatar_frames
  drop constraint if exists user_pulse_avatar_frames_grant_source_chk;

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_source_chk
    check (grant_source in ('leaderboard', 'admin', 'beta'));

alter table public.user_pulse_avatar_frames
  drop constraint if exists user_pulse_avatar_frames_grant_rank_chk;

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_rank_chk
    check (
      (grant_source = 'leaderboard' and leaderboard_rank between 1 and 5)
      or (grant_source = 'admin' and leaderboard_rank = 0)
      or (grant_source = 'beta' and leaderboard_rank = 0)
    );

insert into public.pulse_avatar_frames (
  slug,
  label,
  subtitle,
  prize_tier,
  month_start,
  ring_color,
  glow_color,
  sort_order,
  ring_caption
)
values (
  'beta-tester-border',
  'Beta Tester',
  'PulseVerse beta — exclusive border for early supporters.',
  'campaign',
  date_trunc('month', timestamptz '2026-05-01')::date,
  '#22D3EE',
  'rgba(34, 211, 238, 0.45)',
  0,
  'Beta Tester'
)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption;

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

revoke all on function public.claim_pulse_beta_border() from public;
grant execute on function public.claim_pulse_beta_border() to authenticated;

comment on function public.claim_pulse_beta_border() is
  'Idempotent: grants beta-tester-border unlock once per user. Returns newly_granted when this call inserted the row.';
