-- ============================================================
-- PulseVerse: IAP refund / revocation pipeline
-- ------------------------------------------------------------
-- Store refund webhooks (Google RTDN voided purchases, Apple App Store Server
-- Notifications REFUND/REVOKE) call the `iap-refund-webhook` Edge Function,
-- which authenticates the notification and then calls
-- public.economy_revoke_purchase() with the SERVICE ROLE.
--
-- This RPC is the ONLY revocation path. It is SECURITY DEFINER, granted to
-- service_role only (revoked from public/authenticated) — there is no
-- client-trusted way to revoke an entitlement.
--
-- Idempotent: a receipt already marked 'refunded' is a no-op. The same refund
-- notification can be delivered many times by the stores and will revoke once.
-- ============================================================

-- 1. Audit columns on the receipts ledger.
alter table public.purchase_receipts
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text;

create index if not exists idx_purchase_receipts_refunded
  on public.purchase_receipts (validation_status)
  where validation_status = 'refunded';

-- 2. Revocation RPC.
create or replace function public.economy_revoke_purchase(
  p_platform text,
  p_external_transaction_id text,
  p_reason text default 'store_refund'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt   public.purchase_receipts%rowtype;
  v_item_type text;
  v_spark_amt bigint := 0;
  v_paid      bigint := 0;
  v_deducted  bigint := 0;
  v_borders   integer := 0;
begin
  if p_platform is null or p_external_transaction_id is null then
    return jsonb_build_object('status', 'invalid_input');
  end if;

  -- Lock the receipt row so concurrent webhook deliveries can't double-revoke.
  select *
    into v_receipt
  from public.purchase_receipts
  where platform = p_platform
    and external_transaction_id = p_external_transaction_id
  for update;

  if not found then
    return jsonb_build_object('status', 'receipt_not_found',
      'platform', p_platform, 'external_transaction_id', p_external_transaction_id);
  end if;

  -- Idempotency guard.
  if v_receipt.validation_status = 'refunded' then
    return jsonb_build_object('status', 'already_refunded', 'receipt_id', v_receipt.id);
  end if;

  select type into v_item_type
  from public.shop_items
  where id = v_receipt.shop_item_id;

  -- Mark the receipt refunded first (the idempotency key).
  update public.purchase_receipts
  set validation_status = 'refunded',
      refunded_at = now(),
      refund_reason = coalesce(p_reason, 'store_refund'),
      receipt_payload = coalesce(receipt_payload, '{}'::jsonb)
        || jsonb_build_object('refund_reason', coalesce(p_reason, 'store_refund'),
                              'refunded_at', now())
  where id = v_receipt.id;

  if v_item_type = 'border' then
    -- Precise path: remove exactly the inventory rows this receipt granted
    -- (covers both self-purchase and border-gift, via the wallet-tx linkage).
    delete from public.user_inventory ui
    using public.wallet_transactions wt
    where ui.acquisition_txn_id = wt.id
      and wt.wallet_type = 'border'
      and wt.source_type = 'purchase_receipt'
      and wt.source_id = v_receipt.id;
    get diagnostics v_borders = row_count;

    -- Fallback: if no tx linkage was recorded, revoke the buyer/recipient copy
    -- of this exact border that came from a purchase or a gift (never an
    -- earned / promotional / admin-granted copy).
    if v_borders = 0 and v_receipt.shop_item_id is not null then
      delete from public.user_inventory
      where shop_item_id = v_receipt.shop_item_id
        and acquisition_source in ('purchased', 'gifted')
        and (user_id = v_receipt.user_id or gifted_by_user_id = v_receipt.user_id);
      get diagnostics v_borders = row_count;
    end if;

    -- Audit-only ledger row (border rows never mutate balances; status
    -- 'reversed' also short-circuits the apply trigger).
    insert into public.wallet_transactions (
      user_id, wallet_type, transaction_type, direction, amount, status,
      source_type, source_id, idempotency_key, metadata
    ) values (
      v_receipt.user_id, 'border', 'reversal', 'debit', 0, 'reversed',
      'purchase_receipt', v_receipt.id, 'refund:' || v_receipt.id::text,
      jsonb_build_object('reason', coalesce(p_reason, 'store_refund'),
                         'borders_revoked', v_borders)
    )
    on conflict (idempotency_key) where idempotency_key is not null do nothing;

  elsif v_item_type = 'spark_pack' then
    select coalesce(spark_amount, 0) into v_spark_amt
    from public.shop_items where id = v_receipt.shop_item_id;

    -- Lock + read the buyer's wallet, then claw back what we safely can.
    select paid_sparks_balance into v_paid
    from public.spark_wallets where user_id = v_receipt.user_id for update;

    v_deducted := least(coalesce(v_spark_amt, 0), coalesce(v_paid, 0));

    if v_deducted > 0 or v_spark_amt > 0 then
      update public.spark_wallets
      set paid_sparks_balance = greatest(0, paid_sparks_balance - v_deducted),
          total_sparks_purchased = greatest(0, total_sparks_purchased - coalesce(v_spark_amt, 0)),
          updated_at = now()
      where user_id = v_receipt.user_id;
    end if;

    -- Auditable ledger row. status 'reversed' => apply trigger no-ops, so the
    -- balance math above is authoritative (no double-deduct).
    insert into public.wallet_transactions (
      user_id, wallet_type, transaction_type, direction, amount, status,
      source_type, source_id, idempotency_key, metadata
    ) values (
      v_receipt.user_id, 'sparks',
      case when v_deducted > 0 then 'refund' else 'reversal' end,
      'debit', v_deducted, 'reversed',
      'purchase_receipt', v_receipt.id, 'refund:' || v_receipt.id::text,
      jsonb_build_object('reason', coalesce(p_reason, 'store_refund'),
                         'granted', v_spark_amt,
                         'clawed_back', v_deducted,
                         'shortfall', greatest(0, coalesce(v_spark_amt, 0) - v_deducted))
    )
    on conflict (idempotency_key) where idempotency_key is not null do nothing;
  end if;

  return jsonb_build_object(
    'status', 'revoked',
    'receipt_id', v_receipt.id,
    'user_id', v_receipt.user_id,
    'item_type', v_item_type,
    'borders_revoked', v_borders,
    'sparks_clawed_back', v_deducted,
    'sparks_shortfall', greatest(0, coalesce(v_spark_amt, 0) - v_deducted)
  );
end;
$$;

revoke all on function public.economy_revoke_purchase(text, text, text) from public;
grant execute on function public.economy_revoke_purchase(text, text, text) to service_role;
