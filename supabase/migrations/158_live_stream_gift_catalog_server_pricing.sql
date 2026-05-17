-- ============================================================================
-- 158: Live stream gifts — server-authoritative Spark pricing + catalog table
--
-- Clients must NOT choose unit Spark cost (was exploitable). Pricing resolves
-- from live_stream_gift_catalog by gift_id (matches app LIVE_GIFTS ids).
-- p_unit_spark_cost RPC arg retained for backward compatibility but IGNORED.
--
-- Removes public INSERT on stream_gifts — only SECURITY DEFINER RPC inserts.
-- ============================================================================

create table if not exists public.live_stream_gift_catalog (
  gift_id text primary key,
  spark_unit_cost integer not null check (spark_unit_cost >= 0),
  display_name text not null,
  emoji text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.live_stream_gift_catalog is
  'Authoritative live sticker gift ids and Spark unit costs; economy_send_live_stream_gift resolves pricing here.';

create index if not exists idx_live_stream_gift_catalog_active_sort
  on public.live_stream_gift_catalog (is_active, sort_order, gift_id);

alter table public.live_stream_gift_catalog enable row level security;

drop policy if exists live_stream_gift_catalog_read on public.live_stream_gift_catalog;
create policy live_stream_gift_catalog_read
  on public.live_stream_gift_catalog for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists live_stream_gift_catalog_admin on public.live_stream_gift_catalog;
create policy live_stream_gift_catalog_admin
  on public.live_stream_gift_catalog for all
  to authenticated
  using (public._economy_is_admin())
  with check (public._economy_is_admin());

grant select on public.live_stream_gift_catalog to anon;
grant select on public.live_stream_gift_catalog to authenticated;
grant all on table public.live_stream_gift_catalog to service_role;

-- Seed catalog (must stay aligned with app services/live/gifts.ts LIVE_GIFTS)
insert into public.live_stream_gift_catalog (
  gift_id, spark_unit_cost, display_name, emoji, sort_order, is_active
)
values
  ('heart', 0, 'Heart', '❤️', 10, true),
  ('clap', 0, 'Clap', '👏', 20, true),
  ('fire', 0, 'Fire', '🔥', 30, true),
  ('coffee', 10, 'Night Shift Coffee', '☕', 40, true),
  ('bandaid', 25, 'Band-Aid', '🩹', 50, true),
  ('syringe', 50, 'Syringe', '💉', 60, true),
  ('pill', 50, 'Pill', '💊', 70, true),
  ('mask', 75, 'Surgical Mask', '😷', 80, true),
  ('stethoscope', 100, 'Stethoscope', '🩺', 90, true),
  ('ambulance', 200, 'Ambulance', '🚑', 100, true),
  ('dna', 300, 'DNA Helix', '🧬', 110, true),
  ('microscope', 500, 'Microscope', '🔬', 120, true),
  ('hospital', 1000, 'Hospital', '🏥', 130, true),
  ('angel', 2500, 'Guardian Angel', '👼', 140, true),
  ('crown', 5000, 'Chief of Staff', '👑', 150, true)
on conflict (gift_id) do update set
  spark_unit_cost = excluded.spark_unit_cost,
  display_name = excluded.display_name,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- Legacy policy allowed any authenticated user to insert stream_gifts while bypassing Sparks/Diamonds ledger.
drop policy if exists "Anyone can send gifts" on public.stream_gifts;

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
  -- p_unit_spark_cost intentionally ignored — pricing is server-side only.

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
  'Live sticker gift: Spark unit cost from live_stream_gift_catalog only (ignores p_unit_spark_cost). Inserts stream_gifts with catalog labels.';
