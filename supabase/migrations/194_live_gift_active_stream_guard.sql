-- Closed beta: reject live gifts unless the stream is actively broadcasting.
create or replace function public.economy_send_live_stream_gift(
  p_stream_id text,
  p_gift_id text,
  p_gift_name text,
  p_gift_emoji text,
  p_unit_spark_cost integer,
  p_quantity integer,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_host uuid;
  v_stream_status text;
  v_broadcast_started timestamptz;
  v_unit int;
  v_display_name text;
  v_emoji text;
  v_total int;
  v_existing uuid;
  v_diamonds int;
  v_hold int;
  v_release timestamptz;
  v_spark_txn text;
  v_dia_txn text;
  v_sid uuid;
  v_cid uuid;
  v_row_id uuid;
begin
  if v_sender is null then
    raise exception 'not_allowed';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'not_allowed';
  end if;

  if p_gift_id is null or length(trim(p_gift_id)) = 0 then
    raise exception 'live_gift_unknown';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'not_allowed';
  end if;

  if p_stream_id is null or length(trim(p_stream_id)) = 0 then
    raise exception 'stream_not_found';
  end if;

  select id into v_existing
  from public.stream_gifts
  where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  select c.spark_unit_cost, c.display_name, c.emoji
  into v_unit, v_display_name, v_emoji
  from public.live_stream_gift_catalog c
  where lower(trim(c.gift_id)) = lower(trim(p_gift_id))
    and c.is_active = true;

  if not found then
    raise exception 'live_gift_unknown';
  end if;

  begin
    select host_id, status, broadcast_started_at
    into v_host, v_stream_status, v_broadcast_started
    from public.live_streams
    where id = p_stream_id::uuid;
  exception when invalid_text_representation then
    v_host := null;
  end;

  if v_host is null then
    raise exception 'stream_not_found';
  end if;

  if coalesce(v_stream_status, '') <> 'live' then
    raise exception 'stream_not_live';
  end if;

  if v_broadcast_started is null then
    raise exception 'stream_not_broadcasting';
  end if;

  if v_sender = v_host then
    raise exception 'self_gift_not_allowed';
  end if;

  v_total := v_unit * p_quantity;

  if v_total > 0 then
    v_diamonds := public._economy_sparks_to_diamonds(v_total);
    v_hold := public._economy_diamond_hold_days();
    v_release := case
      when v_hold > 0 then now() + make_interval(days => v_hold)
      else null
    end;

    v_spark_txn := p_idempotency_key || ':live_spark';
    v_dia_txn := p_idempotency_key || ':live_diamond';

    insert into public.wallet_transactions (
      user_id, wallet_type, transaction_type, direction, amount, status,
      source_type, source_id, idempotency_key,
      metadata
    )
    values (
      v_sender,
      'sparks',
      'spark_debit_gift_live',
      'debit',
      v_total::bigint,
      'posted',
      'live_session',
      null,
      v_spark_txn,
      jsonb_build_object(
        'stream_id', p_stream_id,
        'gift_id', p_gift_id,
        'host_user_id', v_host,
        'spark_unit_server', v_unit,
        'gift_display_name', v_display_name
      )
    )
    returning id into v_sid;

    insert into public.wallet_transactions (
      creator_id, wallet_type, transaction_type, direction, amount, status,
      source_type, source_id, reserve_release_at, idempotency_key,
      metadata
    )
    values (
      v_host,
      'diamonds',
      'diamond_earn_live',
      'credit',
      greatest(v_diamonds, 0)::bigint,
      'posted',
      'live_session',
      null,
      v_release,
      v_dia_txn,
      jsonb_build_object(
        'sender_user_id', v_sender,
        'sparks_spent', v_total,
        'stream_id', p_stream_id,
        'gift_id', p_gift_id,
        'spark_unit_server', v_unit
      )
    )
    returning id into v_cid;
  end if;

  insert into public.stream_gifts (
    stream_id, sender_id, gift_id, gift_name, gift_emoji,
    coin_cost, quantity, idempotency_key
  )
  values (
    p_stream_id,
    v_sender,
    lower(trim(p_gift_id)),
    v_display_name,
    v_emoji,
    v_unit,
    p_quantity,
    p_idempotency_key
  )
  returning id into v_row_id;

  return v_row_id;
exception
  when unique_violation then
    select id into v_row_id from public.stream_gifts where idempotency_key = p_idempotency_key;
    if v_row_id is null then
      raise;
    end if;
    return v_row_id;
end;
$$;

comment on function public.economy_send_live_stream_gift(text, text, text, text, integer, integer, text) is
  'Live sticker gift: Spark unit cost from live_stream_gift_catalog only. Rejects ended or not-yet-broadcast streams.';
