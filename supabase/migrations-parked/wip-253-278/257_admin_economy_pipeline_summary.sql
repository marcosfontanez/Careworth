-- ============================================================================
-- 257: Admin Sparks pipeline summary for web console (/admin/economy)
-- Aggregates IAP, gifts, wallets, and daily rollups (staff / service_role only).
-- ============================================================================

create or replace function public.admin_economy_pipeline_summary(p_days int default 90)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(least(coalesce(p_days, 90), 365), 7);
  v jsonb;
begin
  if not (
    coalesce((auth.jwt()->>'role'), '') = 'service_role'
    or public._economy_is_admin()
  ) then
    raise exception 'not_allowed';
  end if;

  select jsonb_build_object(
    'days_window', v_days,
    'settings', (
      select coalesce(jsonb_object_agg(es.key, es.value), '{}'::jsonb)
      from public.economy_settings es
      where es.key in (
        'sparks_to_diamonds_ratio',
        'min_cashout_threshold',
        'diamond_hold_days',
        'gift_spend_source_order'
      )
    ),
    'wallets', jsonb_build_object(
      'spark_paid_balance_total',
        coalesce((select sum(sw.paid_sparks_balance)::bigint from public.spark_wallets sw), 0),
      'spark_promo_balance_total',
        coalesce((select sum(sw.promo_sparks_balance)::bigint from public.spark_wallets sw), 0),
      'spark_total_purchased',
        coalesce((select sum(sw.total_sparks_purchased)::bigint from public.spark_wallets sw), 0),
      'spark_total_spent',
        coalesce((select sum(sw.total_sparks_spent)::bigint from public.spark_wallets sw), 0),
      'diamond_pending_total',
        coalesce((select sum(dw.diamonds_pending)::bigint from public.diamond_wallets dw), 0),
      'diamond_available_total',
        coalesce((select sum(dw.diamonds_available)::bigint from public.diamond_wallets dw), 0),
      'diamond_paid_out_total',
        coalesce((select sum(dw.diamonds_paid_out)::bigint from public.diamond_wallets dw), 0),
      'diamond_total_earned',
        coalesce((select sum(dw.total_diamonds_earned)::bigint from public.diamond_wallets dw), 0),
      'spark_wallet_users',
        coalesce((select count(*)::bigint from public.spark_wallets sw), 0),
      'diamond_wallet_creators',
        coalesce((select count(*)::bigint from public.diamond_wallets dw), 0)
    ),
    'ledger', jsonb_build_object(
      'spark_purchases',
        coalesce((
          select count(*)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type = 'spark_purchase'
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0),
      'spark_purchase_units',
        coalesce((
          select sum(wt.amount)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type = 'spark_purchase'
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0),
      'promo_spark_credits',
        coalesce((
          select count(*)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type = 'promo_spark_credit'
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0),
      'promo_spark_units',
        coalesce((
          select sum(wt.amount)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type = 'promo_spark_credit'
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0),
      'gift_debits',
        coalesce((
          select count(*)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type in (
              'spark_debit_gift_live',
              'spark_debit_gift_post',
              'spark_debit_gift_profile'
            )
            and wt.direction = 'debit'
            and wt.status = 'posted'
        ), 0),
      'gift_spark_units',
        coalesce((
          select sum(wt.amount)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'sparks'
            and wt.transaction_type in (
              'spark_debit_gift_live',
              'spark_debit_gift_post',
              'spark_debit_gift_profile'
            )
            and wt.direction = 'debit'
            and wt.status = 'posted'
        ), 0),
      'diamond_credits',
        coalesce((
          select count(*)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'diamonds'
            and wt.transaction_type in (
              'diamond_earn_live',
              'diamond_earn_post',
              'diamond_earn_profile'
            )
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0),
      'diamond_credit_units',
        coalesce((
          select sum(wt.amount)::bigint
          from public.wallet_transactions wt
          where wt.wallet_type = 'diamonds'
            and wt.transaction_type in (
              'diamond_earn_live',
              'diamond_earn_post',
              'diamond_earn_profile'
            )
            and wt.direction = 'credit'
            and wt.status = 'posted'
        ), 0)
    ),
    'iap', jsonb_build_object(
      'valid_receipts',
        coalesce((
          select count(*)::bigint
          from public.purchase_receipts pr
          where pr.validation_status = 'valid'
        ), 0),
      'refunded_receipts',
        coalesce((
          select count(*)::bigint
          from public.purchase_receipts pr
          where pr.validation_status = 'refunded'
        ), 0),
      'pending_receipts',
        coalesce((
          select count(*)::bigint
          from public.purchase_receipts pr
          where pr.validation_status = 'pending'
        ), 0)
    ),
    'gifts', jsonb_build_object(
      'total_sends',
        coalesce((select count(*)::bigint from public.creator_gifts cg where cg.status = 'posted'), 0),
      'sparks_spent',
        coalesce((
          select sum(cg.sparks_spent)::bigint
          from public.creator_gifts cg
          where cg.status = 'posted'
        ), 0),
      'diamonds_earned',
        coalesce((
          select sum(cg.diamonds_earned)::bigint
          from public.creator_gifts cg
          where cg.status = 'posted'
        ), 0),
      'live_sends',
        coalesce((
          select count(*)::bigint
          from public.creator_gifts cg
          where cg.status = 'posted' and cg.context_type = 'live'
        ), 0),
      'post_sends',
        coalesce((
          select count(*)::bigint
          from public.creator_gifts cg
          where cg.status = 'posted' and cg.context_type = 'post'
        ), 0),
      'profile_sends',
        coalesce((
          select count(*)::bigint
          from public.creator_gifts cg
          where cg.status = 'posted' and cg.context_type = 'profile'
        ), 0)
    ),
    'spark_pack_iap', coalesce((
      select jsonb_agg(to_jsonb(row) order by row.sort_order nulls last, row.slug)
      from (
        select
          si.id as shop_item_id,
          si.slug,
          si.name,
          si.spark_amount,
          si.real_money_display_price,
          si.sort_order,
          coalesce(rc.valid_count, 0)::bigint as valid_receipt_count,
          coalesce(rc.refunded_count, 0)::bigint as refunded_receipt_count
        from public.shop_items si
        left join lateral (
          select
            count(*) filter (where pr.validation_status = 'valid')::bigint as valid_count,
            count(*) filter (where pr.validation_status = 'refunded')::bigint as refunded_count
          from public.purchase_receipts pr
          where pr.shop_item_id = si.id
        ) rc on true
        where si.type = 'spark_pack'
        order by si.sort_order nulls last, si.slug
      ) row
    ), '[]'::jsonb),
    'top_gifts', coalesce((
      select jsonb_agg(to_jsonb(row) order by row.sends desc)
      from (
        select
          si.slug,
          si.name,
          count(*)::bigint as sends,
          sum(cg.sparks_spent)::bigint as sparks_spent,
          sum(cg.diamonds_earned)::bigint as diamonds_earned
        from public.creator_gifts cg
        join public.shop_items si on si.id = cg.gift_item_id
        where cg.status = 'posted'
        group by si.slug, si.name
        order by sends desc
        limit 8
      ) row
    ), '[]'::jsonb),
    'top_diamond_earners', coalesce((
      select jsonb_agg(to_jsonb(row) order by row.diamonds_earned desc)
      from (
        select
          dw.creator_id,
          p.username,
          p.display_name,
          dw.total_diamonds_earned::bigint as diamonds_earned,
          dw.diamonds_available::bigint as diamonds_available,
          dw.diamonds_pending::bigint as diamonds_pending,
          dw.diamonds_paid_out::bigint as diamonds_paid_out
        from public.diamond_wallets dw
        join public.profiles p on p.id = dw.creator_id
        where dw.total_diamonds_earned > 0
        order by dw.total_diamonds_earned desc
        limit 10
      ) row
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(to_jsonb(row) order by row.day)
      from (
        with days as (
          select generate_series(
            (current_date - (v_days - 1)),
            current_date,
            interval '1 day'
          )::date as day
        ),
        iap_day as (
          select
            (pr.created_at at time zone 'utc')::date as day,
            count(*) filter (where pr.validation_status = 'valid')::bigint as iap_valid_count
          from public.purchase_receipts pr
          join public.shop_items si on si.id = pr.shop_item_id and si.type = 'spark_pack'
          where pr.created_at >= (current_date - (v_days - 1))
          group by 1
        ),
        gift_day as (
          select
            (cg.created_at at time zone 'utc')::date as day,
            count(*)::bigint as gift_count,
            coalesce(sum(cg.sparks_spent), 0)::bigint as sparks_gifted,
            coalesce(sum(cg.diamonds_earned), 0)::bigint as diamonds_earned
          from public.creator_gifts cg
          where cg.status = 'posted'
            and cg.created_at >= (current_date - (v_days - 1))
          group by 1
        )
        select
          d.day::text as day,
          coalesce(i.iap_valid_count, 0)::bigint as iap_valid_count,
          coalesce(g.gift_count, 0)::bigint as gift_count,
          coalesce(g.sparks_gifted, 0)::bigint as sparks_gifted,
          coalesce(g.diamonds_earned, 0)::bigint as diamonds_earned
        from days d
        left join iap_day i on i.day = d.day
        left join gift_day g on g.day = d.day
        order by d.day
      ) row
    ), '[]'::jsonb)
  ) into v;

  return v;
end;
$$;

comment on function public.admin_economy_pipeline_summary(int) is
  'Staff dashboard: Sparks IAP, gifts, wallet totals, and daily rollups for /admin/economy.';

revoke all on function public.admin_economy_pipeline_summary(int) from public;
grant execute on function public.admin_economy_pipeline_summary(int) to authenticated;
grant execute on function public.admin_economy_pipeline_summary(int) to service_role;
