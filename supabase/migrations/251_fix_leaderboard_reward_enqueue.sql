-- ============================================================
-- Fix monthly Pulse top-5 reward celebration enqueue (251)
-- ------------------------------------------------------------
-- reward_delivery_enqueue_client (190) only authorized leaderboard_reward
-- when user_pulse_avatar_frames.grant_source = 'leaderboard' for that month.
-- Celebration UI can show is_top5 before the frame row exists, or the user may
-- only have a mirrored row with a different grant_source — enqueue returned
-- P0001 "reward celebration not authorized" (HTTP 400) and blocked the toast
-- → gift box flow.
--
-- Fix: also authorize when the caller is verified top-5 for that month in
-- user_monthly_pulse_scores (same ordering as get_pulse_month_celebration).
-- Also accept any frame row tied to that month catalog (not only grant_source).
-- Idempotent repair: (re)grant top-5 frames for the prior UTC month.
-- ============================================================

create or replace function public.reward_delivery_enqueue_client(
  p_delivery_type text,
  p_item_type text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb,
  p_quantity integer default null,
  p_item_id uuid default null,
  p_source_user_id uuid default null,
  p_source_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_key text;
  v_gift_id uuid;
  v_month date;
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_delivery_type not in ('purchase', 'gift', 'system_award', 'monthly_claim', 'leaderboard_reward') then
    raise exception 'invalid delivery_type';
  end if;

  if p_item_type not in ('border', 'sparks', 'diamonds', 'future_item') then
    raise exception 'invalid item_type';
  end if;

  v_key := trim(coalesce(p_idempotency_key, ''));
  if length(v_key) < 6 or length(v_key) > 220 then
    raise exception 'invalid idempotency_key';
  end if;

  -- Beta tester border celebration (after claim_pulse_beta_border)
  if p_delivery_type = 'system_award'
     and p_item_type = 'future_item'
     and v_key like 'beta_tester_border:%'
     and coalesce(v_meta->>'kind', '') = 'beta_tester_frame' then
    select exists (
      select 1
      from public.user_pulse_avatar_frames upaf
      where upaf.user_id = v_uid
        and upaf.grant_source = 'beta'
    ) into v_allowed;
  end if;

  -- Monthly leaderboard top-5 frame celebration
  if not v_allowed
     and p_delivery_type = 'leaderboard_reward'
     and p_item_type = 'future_item'
     and v_key like 'pulse_month_top5:%'
     and coalesce(v_meta->>'kind', '') = 'pulse_leaderboard_frame' then
    begin
      v_month := (split_part(v_key, ':', 3))::date;
    exception when others then
      raise exception 'invalid leaderboard idempotency key';
    end;

    -- Path A: any frame unlock for that month catalog (leaderboard, shop mirror, etc.)
    select exists (
      select 1
      from public.user_pulse_avatar_frames upaf
      join public.pulse_avatar_frames paf on paf.id = upaf.frame_id
      where upaf.user_id = v_uid
        and paf.month_start = v_month
    ) into v_allowed;

    -- Path B: verified top-5 rank for finalized month (frame grant may lag celebration UI)
    if not v_allowed then
      select exists (
        with ranked as (
          select
            m.user_id,
            row_number() over (
              order by m.overall desc, p.username asc nulls last, m.user_id asc
            ) as rk
          from public.user_monthly_pulse_scores m
          join public.profiles p on p.id = m.user_id
          where m.month_start = v_month
            and m.finalized = true
        )
        select 1
        from ranked r
        where r.user_id = v_uid
          and r.rk <= 5
      ) into v_allowed;
    end if;
  end if;

  -- Team/admin border gift celebration (after economy_accept_pending_border_gift)
  if not v_allowed
     and p_delivery_type = 'gift'
     and p_item_type = 'border'
     and v_key like 'team_border_gift:%' then
    begin
      v_gift_id := (split_part(v_key, ':', 2))::uuid;
    exception when others then
      raise exception 'invalid border gift idempotency key';
    end;

    select exists (
      select 1
      from public.border_gifts bg
      where bg.id = v_gift_id
        and bg.recipient_user_id = v_uid
        and bg.status in ('accepted', 'delivered')
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'reward celebration not authorized';
  end if;

  insert into public.reward_deliveries (
    user_id,
    delivery_type,
    item_type,
    item_id,
    quantity,
    source_user_id,
    source_display_name,
    metadata,
    status,
    idempotency_key
  )
  values (
    v_uid,
    p_delivery_type,
    p_item_type,
    p_item_id,
    p_quantity,
    p_source_user_id,
    nullif(trim(coalesce(p_source_display_name, '')), ''),
    v_meta,
    'pending',
    v_key
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select r.id into v_id
    from public.reward_deliveries r
    where r.user_id = v_uid
      and r.idempotency_key = v_key
    limit 1;
  end if;

  return v_id;
end;
$$;

revoke all on function public.reward_delivery_enqueue_client(
  text, text, text, jsonb, integer, uuid, uuid, text
) from public;
grant execute on function public.reward_delivery_enqueue_client(
  text, text, text, jsonb, integer, uuid, uuid, text
) to authenticated;

-- Idempotent: ensure top-5 frame rows exist for the prior UTC month.
select public.grant_pulse_top5_frames_for_month(
  (public.pulse_current_month() - interval '1 month')::date
);
