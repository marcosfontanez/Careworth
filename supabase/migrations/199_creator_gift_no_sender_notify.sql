-- Stop notifying the sender when they send a Sparks creator gift.
-- Senders get immediate in-app toast feedback; creators still receive diamonds_earned.

create or replace function public.economy_send_creator_gift(
  p_creator_user_id uuid,
  p_gift_item_id uuid,
  p_context_type text,
  p_context_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  it public.shop_items%rowtype;
  v_price int;
  v_diamonds int;
  v_spark_txn text;
  v_dia_txn text;
  v_sid uuid;
  v_cid uuid;
  v_hold int;
  v_release timestamptz;
  v_spark_type text;
  v_dia_type text;
  v_row_id uuid;
  v_owner uuid;
  v_live_status text;
begin
  if v_sender is null then
    raise exception 'not_allowed';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'not_allowed';
  end if;

  if v_sender = p_creator_user_id then
    raise exception 'self_gift_not_allowed';
  end if;

  if p_context_type is null
     or p_context_type not in ('live', 'post', 'profile') then
    raise exception 'invalid_gift_context'
      using message = 'Unsupported gift context type.';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_creator_user_id
  ) then
    raise exception 'invalid_recipient'
      using message = 'Creator profile not found.';
  end if;

  if p_context_type = 'profile' then
    if p_context_id is null or p_context_id <> p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Profile gifts must reference the creator profile.';
    end if;
  elsif p_context_type = 'post' then
    if p_context_id is null then
      raise exception 'invalid_gift_context'
        using message = 'Post gifts require a valid post id.';
    end if;
    select p.creator_id into v_owner
    from public.posts p
    where p.id = p_context_id;
    if not found then
      raise exception 'invalid_gift_context'
        using message = 'Gift post was not found.';
    end if;
    if v_owner is distinct from p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Gift post does not belong to this creator.';
    end if;
  elsif p_context_type = 'live' then
    if p_context_id is null then
      raise exception 'invalid_gift_context'
        using message = 'Live gifts require a valid stream id.';
    end if;
    select ls.host_id, ls.status into v_owner, v_live_status
    from public.live_streams ls
    where ls.id = p_context_id;
    if not found then
      raise exception 'invalid_gift_context'
        using message = 'Gift live stream was not found.';
    end if;
    if v_owner is distinct from p_creator_user_id then
      raise exception 'invalid_gift_context'
        using message = 'Gift live stream does not belong to this creator.';
    end if;
    if coalesce(v_live_status, '') = 'ended' then
      raise exception 'invalid_gift_context'
        using message = 'Cannot gift on an ended live stream.';
    end if;
  end if;

  select id into v_row_id
  from public.creator_gifts cg
  where cg.idempotency_key = p_idempotency_key;
  if v_row_id is not null then
    return v_row_id;
  end if;

  select * into it from public.shop_items si where si.id = p_gift_item_id;
  if not found or it.type is distinct from 'gift' then
    raise exception 'item_not_active';
  end if;

  if not it.is_active then
    raise exception 'item_not_active';
  end if;

  if not (p_context_type::text = any (coalesce(it.gift_contexts, array[]::text[]))) then
    raise exception 'item_not_active';
  end if;

  v_price := it.spark_price;
  if v_price is null or v_price <= 0 then
    raise exception 'item_not_active';
  end if;

  v_diamonds := public._economy_sparks_to_diamonds(v_price);
  v_hold := public._economy_diamond_hold_days();
  v_release := case
    when v_hold > 0 then now() + make_interval(days => v_hold)
    else null
  end;

  v_spark_type := case p_context_type
    when 'live' then 'spark_debit_gift_live'
    when 'post' then 'spark_debit_gift_post'
    else 'spark_debit_gift_profile'
  end;

  v_dia_type := case p_context_type
    when 'live' then 'diamond_earn_live'
    when 'post' then 'diamond_earn_post'
    else 'diamond_earn_profile'
  end;

  v_spark_txn := p_idempotency_key || ':spark';
  v_dia_txn := p_idempotency_key || ':diamond';

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key,
    metadata
  )
  values (
    v_sender,
    'sparks',
    v_spark_type,
    'debit',
    v_price::bigint,
    'posted',
    'shop_item',
    p_gift_item_id,
    v_spark_txn,
    jsonb_build_object(
      'creator_user_id', p_creator_user_id,
      'context_type', p_context_type,
      'context_id', p_context_id
    )
  )
  returning id into v_sid;

  insert into public.wallet_transactions (
    creator_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, reserve_release_at, idempotency_key,
    metadata
  )
  values (
    p_creator_user_id,
    'diamonds',
    v_dia_type,
    'credit',
    greatest(v_diamonds, 0)::bigint,
    'posted',
    'shop_item',
    p_gift_item_id,
    v_release,
    v_dia_txn,
    jsonb_build_object(
      'sender_user_id', v_sender,
      'sparks_spent', v_price,
      'context_type', p_context_type,
      'context_id', p_context_id
    )
  )
  returning id into v_cid;

  insert into public.creator_gifts (
    gift_item_id, sender_user_id, creator_user_id, context_type, context_id,
    sparks_spent, diamonds_earned, sender_wallet_txn_id, creator_wallet_txn_id,
    status, idempotency_key
  )
  values (
    p_gift_item_id, v_sender, p_creator_user_id, p_context_type, p_context_id,
    v_price, greatest(v_diamonds, 0), v_sid, v_cid,
    'posted', p_idempotency_key
  )
  returning id into v_row_id;

  perform public._economy_user_notify(
    p_creator_user_id,
    'diamonds_earned',
    'You earned Diamonds',
    format('+%s Diamonds from a gift', greatest(v_diamonds, 0)),
    jsonb_build_object('creator_gift_id', v_row_id, 'spark_tx', v_sid)
  );

  return v_row_id;
exception
  when unique_violation then
    select cg.id into v_row_id from public.creator_gifts cg where cg.idempotency_key = p_idempotency_key;
    if v_row_id is null then
      raise;
    end if;
    return v_row_id;
end;
$$;

comment on function public.economy_send_creator_gift(uuid, uuid, text, uuid, text) is
  'Atomic creator gift: validates context, debits Sparks, credits creator Diamonds. Notifies creator only (sender gets in-app toast).';
