-- ============================================================================
-- 171: Admin shop stats — staff grant audit count + spark_pack purchase counts
-- Extends admin_shop_border_stats: adds staff_grant_count from shop_admin_item_grants
-- and returns one row per border or spark_pack SKU.
-- ============================================================================

-- Postgres cannot change the row type of RETURNS TABLE via CREATE OR REPLACE; drop first.
drop function if exists public.admin_shop_border_stats();

create or replace function public.admin_shop_border_stats()
returns table (
  shop_item_id uuid,
  owners bigint,
  acq_paid bigint,
  acq_free bigint,
  acq_staff bigint,
  staff_grant_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    coalesce((auth.jwt()->>'role'), '') = 'service_role'
    or public._economy_is_admin()
  ) then
    raise exception 'not_allowed';
  end if;

  return query
  with catalog_items as (
    select si.id as sid, si.type::text as typ
    from public.shop_items si
    where si.type in ('border', 'spark_pack')
  ),
  inv as (
    select ui.shop_item_id as sid, count(*)::bigint as n
    from public.user_inventory ui
    where ui.item_kind = 'border'
    group by ui.shop_item_id
  ),
  border_led as (
    select
      (wt.metadata->>'shop_item_id')::uuid as sid,
      count(*) filter (
        where wt.transaction_type in ('border_purchase_self', 'border_purchase_gift')
      )::bigint as n_paid,
      count(*) filter (
        where wt.transaction_type = 'border_free_claim'
      )::bigint as n_free,
      count(*) filter (
        where wt.transaction_type = 'admin_adjustment'
      )::bigint as n_staff
    from public.wallet_transactions wt
    where wt.wallet_type = 'border'
      and wt.direction = 'credit'
      and wt.status = 'posted'
      and wt.transaction_type in (
        'border_purchase_self',
        'border_purchase_gift',
        'border_free_claim',
        'admin_adjustment'
      )
      and wt.metadata ? 'shop_item_id'
      and (wt.metadata->>'shop_item_id') is not null
    group by (wt.metadata->>'shop_item_id')::uuid
  ),
  spark_paid as (
    select
      (wt.metadata->>'shop_item_id')::uuid as sid,
      count(*)::bigint as n
    from public.wallet_transactions wt
    where wt.wallet_type = 'sparks'
      and wt.transaction_type = 'spark_purchase'
      and wt.direction = 'credit'
      and wt.status = 'posted'
      and wt.metadata ? 'shop_item_id'
      and (wt.metadata->>'shop_item_id') is not null
    group by (wt.metadata->>'shop_item_id')::uuid
  ),
  spark_promo as (
    select
      (wt.metadata->>'shop_item_id')::uuid as sid,
      count(*)::bigint as n
    from public.wallet_transactions wt
    where wt.wallet_type = 'sparks'
      and wt.transaction_type = 'promo_spark_credit'
      and wt.direction = 'credit'
      and wt.status = 'posted'
      and wt.metadata ? 'shop_item_id'
      and (wt.metadata->>'shop_item_id') is not null
    group by (wt.metadata->>'shop_item_id')::uuid
  ),
  grant_counts as (
    select g.shop_item_id as sid, count(*)::bigint as n
    from public.shop_admin_item_grants g
    group by g.shop_item_id
  )
  select
    ci.sid as shop_item_id,
    case when ci.typ = 'border' then coalesce(inv.n, 0) else null::bigint end as owners,
    case
      when ci.typ = 'border' then coalesce(border_led.n_paid, 0)
      else coalesce(spark_paid.n, 0)
    end as acq_paid,
    case when ci.typ = 'border' then coalesce(border_led.n_free, 0) else 0::bigint end as acq_free,
    case
      when ci.typ = 'border' then coalesce(border_led.n_staff, 0)
      else coalesce(spark_promo.n, 0)
    end as acq_staff,
    coalesce(grant_counts.n, 0) as staff_grant_count
  from catalog_items ci
  left join inv on inv.sid = ci.sid
  left join border_led border_led on border_led.sid = ci.sid
  left join spark_paid spark_paid on spark_paid.sid = ci.sid
  left join spark_promo spark_promo on spark_promo.sid = ci.sid
  left join grant_counts grant_counts on grant_counts.sid = ci.sid;
end;
$$;

revoke all on function public.admin_shop_border_stats() from public;
grant execute on function public.admin_shop_border_stats() to authenticated;
grant execute on function public.admin_shop_border_stats() to service_role;

comment on function public.admin_shop_border_stats() is
  'Admin dashboard: per border or spark_pack SKU — owners (borders only), ledger acquisition counts, '
  'and staff_grant_count from shop_admin_item_grants (catalog grant actions).';
