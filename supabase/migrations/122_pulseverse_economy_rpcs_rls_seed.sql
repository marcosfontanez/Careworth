-- ============================================================================
-- 122: PulseVerse economy — RPCs, RLS, grants, seed catalog
-- Depends on 121_pulseverse_economy_and_shop.sql
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Notifications helper (SECURITY DEFINER; bypasses RLS)
-- -----------------------------------------------------------------------------
create or replace function public._economy_user_notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (user_id, type, title, body, data)
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  );
end;
$$;

create or replace function public._economy_normalize_handle(p text)
returns text
language sql
immutable
as $$
  select lower(trim(both '@' from trim(coalesce(p, ''))));
$$;

-- -----------------------------------------------------------------------------
-- 1) create_or_get_wallets
-- -----------------------------------------------------------------------------
create or replace function public.economy_create_or_get_wallets(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator boolean;
begin
  if auth.uid() is distinct from p_user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  insert into public.spark_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select coalesce(is_creator, false) into v_creator
  from public.profiles
  where id = p_user_id;

  if coalesce(v_creator, false) then
    insert into public.diamond_wallets (creator_id)
    values (p_user_id)
    on conflict (creator_id) do nothing;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2) grant_sparks_from_valid_receipt
-- -----------------------------------------------------------------------------
create or replace function public.economy_grant_sparks_from_valid_receipt(p_purchase_receipt_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.purchase_receipts%rowtype;
  it public.shop_items%rowtype;
  v_expected text;
  v_tx uuid;
  v_key text := 'spark_receipt:' || p_purchase_receipt_id::text;
  v_amt int;
begin
  select * into r
  from public.purchase_receipts pr
  where pr.id = p_purchase_receipt_id
  for update;

  if not found then
    raise exception 'invalid_receipt';
  end if;

  if auth.uid() is distinct from r.user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  if r.validation_status is distinct from 'valid' then
    raise exception 'invalid_receipt';
  end if;

  if r.processed_at is not null then
    select wt.id into v_tx
    from public.wallet_transactions wt
    where wt.idempotency_key = v_key;
    if v_tx is null then
      raise exception 'invalid_receipt';
    end if;
    return v_tx;
  end if;

  if r.shop_item_id is null then
    raise exception 'invalid_receipt';
  end if;

  select * into it
  from public.shop_items si
  where si.id = r.shop_item_id;

  if it.type is distinct from 'spark_pack' then
    raise exception 'invalid_receipt';
  end if;

  v_expected := case r.platform
    when 'ios' then it.store_product_id_ios
    else it.store_product_id_android
  end;
  if r.store_product_id is distinct from v_expected then
    raise exception 'invalid_receipt';
  end if;

  v_amt := it.spark_amount;
  if v_amt is null or v_amt <= 0 then
    raise exception 'invalid_receipt';
  end if;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    r.user_id,
    'sparks',
    'spark_purchase',
    'credit',
    v_amt::bigint,
    'posted',
    'purchase_receipt',
    r.id,
    v_key,
    jsonb_build_object('shop_item_id', it.id, 'receipt_id', r.id)
  )
  returning id into v_tx;

  update public.purchase_receipts
  set processed_at = now()
  where id = r.id;

  perform public._economy_user_notify(
    r.user_id,
    'sparks_purchase_success',
    'Sparks added',
    format('You received %s Sparks.', v_amt),
    jsonb_build_object('wallet_tx_id', v_tx, 'shop_item_id', it.id)
  );

  return v_tx;
exception
  when unique_violation then
    select id into v_tx from public.wallet_transactions where idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    update public.purchase_receipts
    set processed_at = coalesce(processed_at, now())
    where id = p_purchase_receipt_id;
    return v_tx;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) grant_border_from_valid_receipt
-- -----------------------------------------------------------------------------
create or replace function public.economy_grant_border_from_valid_receipt(
  p_purchase_receipt_id uuid,
  p_shop_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.purchase_receipts%rowtype;
  it public.shop_items%rowtype;
  v_expected text;
  v_tx uuid;
  v_key text := 'border_self:' || p_purchase_receipt_id::text || ':' || p_shop_item_id::text;
begin
  select * into r
  from public.purchase_receipts pr
  where pr.id = p_purchase_receipt_id
  for update;

  if not found then
    raise exception 'invalid_receipt';
  end if;

  if auth.uid() is distinct from r.user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  if r.validation_status is distinct from 'valid' then
    raise exception 'invalid_receipt';
  end if;

  select * into it from public.shop_items si where si.id = p_shop_item_id;
  if not found or it.type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  if not it.is_active and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  v_expected := case r.platform
    when 'ios' then it.store_product_id_ios
    else it.store_product_id_android
  end;
  if r.store_product_id is distinct from v_expected then
    raise exception 'invalid_receipt';
  end if;

  if coalesce(r.shop_item_id, p_shop_item_id) is distinct from p_shop_item_id then
    raise exception 'invalid_receipt';
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = r.user_id and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'duplicate_border';
  end if;

  if r.processed_at is not null then
    select wt.id into v_tx from public.wallet_transactions wt where wt.idempotency_key = v_key;
    if v_tx is null then
      raise exception 'invalid_receipt';
    end if;
    return v_tx;
  end if;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    r.user_id,
    'border',
    'border_purchase_self',
    'credit',
    1,
    'posted',
    'purchase_receipt',
    r.id,
    v_key,
    jsonb_build_object('shop_item_id', p_shop_item_id)
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    r.user_id, p_shop_item_id, 'border', 'purchased', v_tx,
    null, null, true
  );

  update public.purchase_receipts
  set processed_at = now(), shop_item_id = p_shop_item_id
  where id = r.id;

  perform public._economy_user_notify(
    r.user_id,
    'border_purchase_success',
    'Border unlocked',
    it.name,
    jsonb_build_object('wallet_tx_id', v_tx, 'shop_item_id', p_shop_item_id)
  );

  return v_tx;
exception
  when unique_violation then
    select id into v_tx from public.wallet_transactions where idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    update public.purchase_receipts
    set processed_at = coalesce(processed_at, now()), shop_item_id = p_shop_item_id
    where id = p_purchase_receipt_id;
    return v_tx;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) gift_border_from_valid_receipt
-- -----------------------------------------------------------------------------
create or replace function public.economy_gift_border_from_valid_receipt(
  p_sender_user_id uuid,
  p_recipient_handle text,
  p_purchase_receipt_id uuid,
  p_shop_item_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.purchase_receipts%rowtype;
  it public.shop_items%rowtype;
  v_expected text;
  v_tx uuid;
  v_recipient uuid;
  v_key text := 'border_gift:' || p_purchase_receipt_id::text || ':' || p_shop_item_id::text;
  v_gift uuid;
begin
  if auth.uid() is distinct from p_sender_user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  if p_sender_user_id is null then
    raise exception 'not_allowed';
  end if;

  select * into r
  from public.purchase_receipts pr
  where pr.id = p_purchase_receipt_id
  for update;

  if not found then
    raise exception 'invalid_receipt';
  end if;

  if r.user_id is distinct from p_sender_user_id then
    raise exception 'invalid_receipt';
  end if;

  if r.validation_status is distinct from 'valid' then
    raise exception 'invalid_receipt';
  end if;

  select p.id into v_recipient
  from public.profiles p
  where public._economy_normalize_handle(p.username)
    = public._economy_normalize_handle(p_recipient_handle)
  limit 1;

  if v_recipient is null then
    raise exception 'invalid_recipient';
  end if;

  if v_recipient = p_sender_user_id then
    raise exception 'self_gift_not_allowed';
  end if;

  select * into it from public.shop_items si where si.id = p_shop_item_id;
  if not found or it.type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  if not coalesce(it.is_giftable, false) then
    raise exception 'item_not_active';
  end if;

  if not it.is_active and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  v_expected := case r.platform
    when 'ios' then it.store_product_id_ios
    else it.store_product_id_android
  end;
  if r.store_product_id is distinct from v_expected then
    raise exception 'invalid_receipt';
  end if;

  if coalesce(r.shop_item_id, p_shop_item_id) is distinct from p_shop_item_id then
    raise exception 'invalid_receipt';
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = v_recipient and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'duplicate_border';
  end if;

  if r.processed_at is not null then
    select wt.id into v_tx from public.wallet_transactions wt where wt.idempotency_key = v_key;
    if v_tx is null then
      raise exception 'invalid_receipt';
    end if;
    return v_tx;
  end if;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    v_recipient,
    'border',
    'border_purchase_gift',
    'credit',
    1,
    'posted',
    'purchase_receipt',
    r.id,
    v_key,
    jsonb_build_object(
      'shop_item_id', p_shop_item_id,
      'sender_user_id', p_sender_user_id
    )
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    v_recipient, p_shop_item_id, 'border', 'gifted', v_tx,
    p_sender_user_id, v_recipient, false
  );

  insert into public.border_gifts (
    shop_item_id, sender_user_id, recipient_user_id, wallet_transaction_id,
    status, note, delivered_at
  )
  values (
    p_shop_item_id, p_sender_user_id, v_recipient, v_tx,
    'delivered', p_note, now()
  )
  returning id into v_gift;

  update public.purchase_receipts
  set processed_at = now(), shop_item_id = p_shop_item_id
  where id = r.id;

  perform public._economy_user_notify(
    v_recipient,
    'border_gift_received',
    'You received a border',
    it.name,
    jsonb_build_object('border_gift_id', v_gift, 'shop_item_id', p_shop_item_id, 'from', p_sender_user_id)
  );

  perform public._economy_user_notify(
    p_sender_user_id,
    'border_gift_sent',
    'Gift sent',
    format('You sent %s to a friend.', it.name),
    jsonb_build_object('border_gift_id', v_gift, 'shop_item_id', p_shop_item_id, 'to', v_recipient)
  );

  return v_tx;
exception
  when unique_violation then
    select id into v_tx from public.wallet_transactions where idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    update public.purchase_receipts
    set processed_at = coalesce(processed_at, now()), shop_item_id = p_shop_item_id
    where id = p_purchase_receipt_id;
    return v_tx;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) send_creator_gift (idempotent via idempotency_key on creator_gifts)
-- -----------------------------------------------------------------------------
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
    raise exception 'item_not_active';
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

  perform public._economy_user_notify(
    v_sender,
    'gift_sent',
    'Gift sent',
    format('You sent %s (%s Sparks).', it.name, v_price),
    jsonb_build_object('creator_gift_id', v_row_id, 'creator_id', p_creator_user_id)
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

-- -----------------------------------------------------------------------------
-- 6) release_pending_diamonds — invoke via pg_cron / Edge with service_role
-- -----------------------------------------------------------------------------
create or replace function public.economy_release_pending_diamonds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
  v_new uuid;
begin
  perform pg_advisory_xact_lock(902110421);

  for r in
    select wt.id, wt.creator_id, wt.amount
    from public.wallet_transactions wt
    where wt.wallet_type = 'diamonds'
      and wt.transaction_type in (
        'diamond_earn_live', 'diamond_earn_post', 'diamond_earn_profile'
      )
      and wt.direction = 'credit'
      and wt.status = 'posted'
      and wt.reserve_release_at is not null
      and wt.reserve_release_at <= now()
      and not exists (
        select 1
        from public.wallet_transactions w2
        where w2.wallet_type = 'diamonds'
          and w2.transaction_type = 'reserve_release'
          and coalesce(w2.metadata->>'hold_release_of', '') = wt.id::text
      )
    order by wt.reserve_release_at
    limit 500
  loop
    v_new := null;
    insert into public.wallet_transactions (
      creator_id, wallet_type, transaction_type, direction, amount, status,
      source_type, source_id, idempotency_key, metadata
    )
    values (
      r.creator_id,
      'diamonds',
      'reserve_release',
      'credit',
      r.amount,
      'posted',
      'system',
      r.id,
      'diamond_release:' || r.id::text,
      jsonb_build_object('hold_release_of', r.id)
    )
    on conflict (idempotency_key) where idempotency_key is not null do nothing
    returning id into v_new;

    if v_new is not null then
      n := n + 1;
    end if;
  end loop;

  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7) equip_border
-- -----------------------------------------------------------------------------
create or replace function public.economy_equip_border(p_inventory_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_item uuid;
  si_type text;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select ui.user_id, ui.shop_item_id
  into v_user, v_item
  from public.user_inventory ui
  where ui.id = p_inventory_item_id
  for update;

  if not found or v_user is distinct from v_uid then
    raise exception 'not_allowed';
  end if;

  select type into si_type from public.shop_items where id = v_item;
  if si_type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  update public.user_inventory
  set is_equipped = false
  where user_id = v_uid and item_kind = 'border';

  update public.user_inventory
  set is_equipped = true
  where id = p_inventory_item_id and user_id = v_uid;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.economy_settings enable row level security;
alter table public.shop_items enable row level security;
alter table public.spark_wallets enable row level security;
alter table public.diamond_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.user_inventory enable row level security;
alter table public.border_gifts enable row level security;
alter table public.creator_gifts enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists economy_settings_admin on public.economy_settings;
create policy economy_settings_admin
  on public.economy_settings for all
  to authenticated
  using (public._economy_is_admin())
  with check (public._economy_is_admin());

drop policy if exists shop_items_read_active on public.shop_items;
create policy shop_items_read_active
  on public.shop_items for select
  to anon, authenticated
  using (is_active = true or public._economy_is_admin());

drop policy if exists shop_items_admin on public.shop_items;
create policy shop_items_admin
  on public.shop_items for all
  to authenticated
  using (public._economy_is_admin())
  with check (public._economy_is_admin());

drop policy if exists spark_wallets_own on public.spark_wallets;
create policy spark_wallets_own
  on public.spark_wallets for select
  to authenticated
  using (auth.uid() = user_id or public._economy_is_admin());

drop policy if exists diamond_wallets_own on public.diamond_wallets;
create policy diamond_wallets_own
  on public.diamond_wallets for select
  to authenticated
  using (auth.uid() = creator_id or public._economy_is_admin());

drop policy if exists wallet_tx_read on public.wallet_transactions;
create policy wallet_tx_read
  on public.wallet_transactions for select
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = creator_id
    or public._economy_is_admin()
  );

drop policy if exists user_inventory_own on public.user_inventory;
create policy user_inventory_own
  on public.user_inventory for select
  to authenticated
  using (auth.uid() = user_id or public._economy_is_admin());

drop policy if exists border_gifts_parties on public.border_gifts;
create policy border_gifts_parties
  on public.border_gifts for select
  to authenticated
  using (
    auth.uid() in (sender_user_id, recipient_user_id)
    or public._economy_is_admin()
  );

drop policy if exists creator_gifts_parties on public.creator_gifts;
create policy creator_gifts_parties
  on public.creator_gifts for select
  to authenticated
  using (
    auth.uid() in (sender_user_id, creator_user_id)
    or public._economy_is_admin()
  );

drop policy if exists purchase_receipts_own on public.purchase_receipts;
create policy purchase_receipts_own
  on public.purchase_receipts for select
  to authenticated
  using (auth.uid() = user_id or public._economy_is_admin());

drop policy if exists user_notifications_own on public.user_notifications;
create policy user_notifications_own
  on public.user_notifications for select
  to authenticated
  using (auth.uid() = user_id or public._economy_is_admin());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
  on public.user_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Grants: clients read; mutations via RPC / service_role
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.shop_items to anon, authenticated;
grant select on public.spark_wallets to authenticated;
grant select on public.diamond_wallets to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.user_inventory to authenticated;
grant select on public.border_gifts to authenticated;
grant select on public.creator_gifts to authenticated;
grant select on public.purchase_receipts to authenticated;
grant select, update on public.user_notifications to authenticated;

grant execute on function public.economy_create_or_get_wallets(uuid) to authenticated;
grant execute on function public.economy_grant_sparks_from_valid_receipt(uuid) to authenticated;
grant execute on function public.economy_grant_border_from_valid_receipt(uuid, uuid) to authenticated;
grant execute on function public.economy_gift_border_from_valid_receipt(uuid, text, uuid, uuid, text) to authenticated;
grant execute on function public.economy_send_creator_gift(uuid, uuid, text, uuid, text) to authenticated;
grant execute on function public.economy_equip_border(uuid) to authenticated;

grant execute on function public.economy_release_pending_diamonds() to service_role;
revoke all on function public.economy_release_pending_diamonds() from public;
revoke all on function public.economy_release_pending_diamonds() from anon;
revoke all on function public.economy_release_pending_diamonds() from authenticated;

grant all on table public.economy_settings to service_role;
grant all on table public.shop_items to service_role;
grant all on table public.spark_wallets to service_role;
grant all on table public.diamond_wallets to service_role;
grant all on table public.wallet_transactions to service_role;
grant all on table public.user_inventory to service_role;
grant all on table public.border_gifts to service_role;
grant all on table public.creator_gifts to service_role;
grant all on table public.purchase_receipts to service_role;
grant all on table public.user_notifications to service_role;

grant execute on function public.economy_create_or_get_wallets(uuid) to service_role;
grant execute on function public.economy_grant_sparks_from_valid_receipt(uuid) to service_role;
grant execute on function public.economy_grant_border_from_valid_receipt(uuid, uuid) to service_role;
grant execute on function public.economy_gift_border_from_valid_receipt(uuid, text, uuid, uuid, text) to service_role;
grant execute on function public.economy_send_creator_gift(uuid, uuid, text, uuid, text) to service_role;
grant execute on function public.economy_equip_border(uuid) to service_role;
grant execute on function public._economy_user_notify(uuid, text, text, text, jsonb) to service_role;

-- ============================================================================
-- Seed catalog (example store SKUs — replace with real App Store / Play IDs)
-- ============================================================================
insert into public.shop_items (
  slug, type, category, name, description, rarity,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata
)
values
  (
    'solar-crown', 'border', 'borders', 'Solar Crown', 'Radiant sovereign border.',
    'legendary', null, null, '$4.99',
    'com.pulseverse.border.solar_crown.ios',
    'com.pulseverse.border.solar_crown.android',
    true, true, false, 10, null,
    '{"theme":"gold"}'::jsonb
  ),
  (
    'silver-solstice', 'border', 'borders', 'Silver Solstice', 'Cool lunar rim.',
    'epic', null, null, '$3.99',
    'com.pulseverse.border.silver_solstice.ios',
    'com.pulseverse.border.silver_solstice.android',
    true, true, false, 20, null,
    '{}'::jsonb
  ),
  (
    'bronze-horizon', 'border', 'borders', 'Bronze Horizon', 'Warm metallic frame.',
    'rare', null, null, '$2.99',
    'com.pulseverse.border.bronze_horizon.ios',
    'com.pulseverse.border.bronze_horizon.android',
    true, true, false, 30, null,
    '{}'::jsonb
  ),
  (
    'beta-pioneer', 'border', 'borders', 'Beta Pioneer', 'Early supporter border.',
    'exclusive', null, null, '$0.99',
    'com.pulseverse.border.beta_pioneer.ios',
    'com.pulseverse.border.beta_pioneer.android',
    true, false, true, 5, null,
    '{}'::jsonb
  ),
  (
    'sparks-500', 'spark_pack', 'sparks', '500 Sparks', 'Starter pack.',
    'common', null, 500, '$4.99',
    'com.pulseverse.sparks.500.ios',
    'com.pulseverse.sparks.500.android',
    true, false, false, 100, null,
    '{}'::jsonb
  ),
  (
    'sparks-1200', 'spark_pack', 'sparks', '1,200 Sparks', 'Value pack.',
    'common', null, 1200, '$9.99',
    'com.pulseverse.sparks.1200.ios',
    'com.pulseverse.sparks.1200.android',
    true, false, false, 110, null,
    '{}'::jsonb
  ),
  (
    'sparks-2500', 'spark_pack', 'sparks', '2,500 Sparks', 'Popular pack.',
    'uncommon', null, 2500, '$19.99',
    'com.pulseverse.sparks.2500.ios',
    'com.pulseverse.sparks.2500.android',
    true, false, false, 120, null,
    '{}'::jsonb
  ),
  (
    'sparks-6500', 'spark_pack', 'sparks', '6,500 Sparks', 'Best value.',
    'rare', null, 6500, '$49.99',
    'com.pulseverse.sparks.6500.ios',
    'com.pulseverse.sparks.6500.android',
    true, false, false, 130, null,
    '{}'::jsonb
  ),
  (
    'pulse', 'gift', 'gifts', 'Pulse', 'Send love to a creator.',
    'common', 50, null, null, null, null,
    true, false, false, 200, array['live', 'post', 'profile']::text[],
    '{}'::jsonb
  ),
  (
    'coffee-drop', 'gift', 'gifts', 'Coffee Drop', 'Fuel their stream.',
    'common', 100, null, null, null, null,
    true, false, false, 210, array['live', 'post', 'profile']::text[],
    '{}'::jsonb
  ),
  (
    'halo', 'gift', 'gifts', 'Halo', 'A glowing moment.',
    'rare', 250, null, null, null, null,
    true, false, false, 220, array['live', 'post', 'profile']::text[],
    '{}'::jsonb
  ),
  (
    'crown', 'gift', 'gifts', 'Crown', 'Royal appreciation.',
    'epic', 500, null, null, null, null,
    true, false, false, 230, array['live', 'post', 'profile']::text[],
    '{}'::jsonb
  )
on conflict (slug) do nothing;
