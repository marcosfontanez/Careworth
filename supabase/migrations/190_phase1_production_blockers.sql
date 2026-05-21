-- Phase 1 production blockers (2026-05):
-- 1) Lock legacy user_coins self-UPDATE
-- 2) Harden reward_delivery_enqueue_client against spoof celebrations
-- 3) new_follower notifications on follows INSERT

-- ---------------------------------------------------------------------------
-- 1. Legacy user_coins — remove client UPDATE (modern economy uses wallet_transactions)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can update own coins" on public.user_coins;

revoke update on public.user_coins from authenticated;
revoke update on public.user_coins from anon;

comment on table public.user_coins is
  'Legacy live-gift coin cache (pre–PulseVerse economy). Read-only to clients; do not use for new features.';

-- ---------------------------------------------------------------------------
-- 2. reward_delivery_enqueue_client — require proof of a real grant
-- ---------------------------------------------------------------------------
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

    select exists (
      select 1
      from public.user_pulse_avatar_frames upaf
      join public.pulse_avatar_frames paf on paf.id = upaf.frame_id
      where upaf.user_id = v_uid
        and upaf.grant_source = 'leaderboard'
        and paf.month_start = v_month
    ) into v_allowed;
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

-- ---------------------------------------------------------------------------
-- 3. new_follower notification
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already boolean;
begin
  begin
    if new.follower_id = new.following_id then
      return new;
    end if;

    select exists (
      select 1
      from public.notifications n
      where n.user_id = new.following_id
        and n.actor_id = new.follower_id
        and n.type = 'new_follower'
        and n.created_at >= now() - interval '24 hours'
    ) into v_already;

    if not v_already then
      insert into public.notifications (user_id, actor_id, type, message, target_id, read)
      values (
        new.following_id,
        new.follower_id,
        'new_follower',
        'started following you',
        new.follower_id::text,
        false
      );
    end if;
  exception when others then
    perform public.log_trigger_error(
      'notify_on_follow', tg_op, tg_table_name, sqlstate, sqlerrm,
      jsonb_build_object('follower_id', new.follower_id, 'following_id', new.following_id)
    );
  end;
  return new;
end;
$$;

drop trigger if exists tr_notify_on_follow on public.follows;
create trigger tr_notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

comment on function public.notify_on_follow() is
  'Notifies the followed user when someone follows them (24h de-dupe per follower).';
