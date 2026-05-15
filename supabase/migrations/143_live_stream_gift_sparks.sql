-- ============================================================================
-- 143: Live stream sticker gifts — debit Sparks + credit host Diamonds (atomic)
-- Replaces client-side `transfer_gift_coins` + `stream_gifts` insert for live UI.
-- Free gifts (0 sparks): insert stream_gifts only.
-- ============================================================================

alter table public.stream_gifts
  add column if not exists idempotency_key text;

create unique index if not exists stream_gifts_idempotency_key_uq
  on public.stream_gifts (idempotency_key)
  where idempotency_key is not null;

comment on column public.stream_gifts.idempotency_key is 'Stable client key; duplicate sends return the same gift row without double charge.';
comment on column public.stream_gifts.coin_cost is 'Per-unit Sparks charged (legacy column name; live gifts use Sparks, not legacy user_coins).';

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

  if p_quantity is null or p_quantity < 1 then
    raise exception 'not_allowed';
  end if;

  if p_unit_spark_cost is null or p_unit_spark_cost < 0 then
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

  begin
    select host_id into v_host
    from public.live_streams
    where id = p_stream_id::uuid;
  exception when invalid_text_representation then
    v_host := null;
  end;

  if v_host is null then
    raise exception 'stream_not_found';
  end if;

  if v_sender = v_host then
    raise exception 'self_gift_not_allowed';
  end if;

  v_total := p_unit_spark_cost * p_quantity;

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
        'host_user_id', v_host
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
        'gift_id', p_gift_id
      )
    )
    returning id into v_cid;
  end if;

  insert into public.stream_gifts (
    stream_id, sender_id, gift_id, gift_name, gift_emoji,
    coin_cost, quantity, idempotency_key
  )
  values (
    p_stream_id, v_sender, p_gift_id, p_gift_name, p_gift_emoji,
    p_unit_spark_cost, p_quantity, p_idempotency_key
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
  'Atomic live sticker gift: debit sender Sparks, credit host Diamonds (ratio + hold), insert stream_gifts.';

grant execute on function public.economy_send_live_stream_gift(text, text, text, text, integer, integer, text)
  to authenticated;
grant execute on function public.economy_send_live_stream_gift(text, text, text, text, integer, integer, text)
  to service_role;
