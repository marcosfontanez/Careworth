-- ============================================================================
-- 125: Beta Pioneer — active in Pulse Shop as a free self-claim (no IAP)
-- Adds ledger type border_free_claim + RPC economy_claim_free_shop_border
-- ============================================================================

-- Allow dedicated audit rows for promotional free border unlocks
alter table public.wallet_transactions drop constraint if exists wallet_tx_type_check;

alter table public.wallet_transactions add constraint wallet_tx_type_check check (
  (wallet_type = 'sparks' and transaction_type in (
    'spark_purchase', 'promo_spark_credit',
    'spark_debit_gift_live', 'spark_debit_gift_post', 'spark_debit_gift_profile',
    'admin_adjustment', 'refund', 'reversal'
  ))
  or (wallet_type = 'diamonds' and transaction_type in (
    'diamond_earn_live', 'diamond_earn_post', 'diamond_earn_profile',
    'reserve_release', 'admin_adjustment', 'refund', 'reversal'
  ))
  or (wallet_type = 'border' and transaction_type in (
    'border_purchase_self', 'border_purchase_gift', 'border_free_claim',
    'admin_adjustment', 'refund', 'reversal'
  ))
);

-- -----------------------------------------------------------------------------
-- Public self-claim for shop_items flagged metadata.free_in_shop (borders only)
-- -----------------------------------------------------------------------------
create or replace function public.economy_claim_free_shop_border(p_shop_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_it public.shop_items%rowtype;
  v_tx uuid;
  v_key text;
  v_free boolean;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  if p_shop_item_id is null then
    raise exception 'invalid_args';
  end if;

  select * into v_it from public.shop_items si where si.id = p_shop_item_id;
  if not found then
    raise exception 'item_not_found';
  end if;

  if v_it.type is distinct from 'border' then
    raise exception 'unsupported_shop_item_type';
  end if;

  if not coalesce(v_it.is_active, false) then
    raise exception 'item_not_active';
  end if;

  v_free :=
    coalesce((v_it.metadata->>'free_in_shop')::boolean, false)
    or (v_it.metadata @> '{"free_in_shop": true}'::jsonb);

  if not v_free then
    raise exception 'free_claim_not_available';
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = v_uid and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'duplicate_border';
  end if;

  v_key := 'free_shop_border:' || v_uid::text || ':' || p_shop_item_id::text;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    v_uid,
    'border',
    'border_free_claim',
    'credit',
    1,
    'posted',
    'shop_item',
    p_shop_item_id,
    v_key,
    jsonb_build_object(
      'shop_item_id', v_it.id,
      'shop_slug', v_it.slug
    )
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    v_uid,
    p_shop_item_id,
    'border',
    'promotional',
    v_tx,
    null,
    null,
    true
  );

  perform public._economy_user_notify(
    v_uid,
    'border_purchase_success',
    'Border unlocked',
    v_it.name,
    jsonb_build_object(
      'wallet_tx_id', v_tx,
      'shop_item_id', v_it.id,
      'free_claim', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'wallet_transaction_id', v_tx,
    'kind', 'border_free_claim'
  );
exception
  when unique_violation then
    select wt.id into v_tx
    from public.wallet_transactions wt
    where wt.idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    if exists (
      select 1 from public.user_inventory ui
      where ui.user_id = v_uid and ui.shop_item_id = p_shop_item_id
    ) then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'wallet_transaction_id', v_tx,
        'kind', 'border_free_claim'
      );
    end if;
    raise exception 'idempotency_conflict';
end;
$$;

comment on function public.economy_claim_free_shop_border(uuid) is
  'Authenticated user claims a border marked metadata.free_in_shop without IAP.';

grant execute on function public.economy_claim_free_shop_border(uuid) to authenticated;
grant execute on function public.economy_claim_free_shop_border(uuid) to service_role;

-- Beta Pioneer: visible in shop, purchasable flow uses free RPC (not earned-only gate)
update public.shop_items si
set
  is_active = true,
  is_retired = false,
  is_earned_only = false,
  is_shop_item = true,
  availability_status = 'active',
  unlock_method = 'direct_purchase',
  price_type = 'direct_purchase',
  real_money_display_price = 'Free',
  description = 'Early PulseVerse beta recognition — free in the Pulse Shop for everyone during beta.',
  metadata = coalesce(si.metadata, '{}'::jsonb) || jsonb_build_object(
    'free_in_shop', true,
    'featured', true
  ),
  sort_order = least(coalesce(si.sort_order, 99), 3)
where si.slug in ('border_beta_pioneer', 'beta-pioneer');
