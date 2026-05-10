-- ============================================================================
-- 129: Admin — per-border ownership + ledger acquisition counts (Pulse Shop)
-- Called from web admin (service_role or role_admin JWT).
-- Staff ledger includes direct grants and pending team gifts (before accept).
-- ============================================================================

create or replace function public.admin_shop_border_stats()
returns table (
  shop_item_id uuid,
  owners bigint,
  acq_paid bigint,
  acq_free bigint,
  acq_staff bigint
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
  with border_items as (
    select si.id as sid
    from public.shop_items si
    where si.type = 'border'
  ),
  inv as (
    select ui.shop_item_id as sid, count(*)::bigint as n
    from public.user_inventory ui
    where ui.item_kind = 'border'
    group by ui.shop_item_id
  ),
  led as (
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
  )
  select
    bi.sid as shop_item_id,
    coalesce(inv.n, 0) as owners,
    coalesce(led.n_paid, 0) as acq_paid,
    coalesce(led.n_free, 0) as acq_free,
    coalesce(led.n_staff, 0) as acq_staff
  from border_items bi
  left join inv on inv.sid = bi.sid
  left join led on led.sid = bi.sid;
end;
$$;

comment on function public.admin_shop_border_stats() is
  'Admin dashboard: border owners (user_inventory) and ledger credits by shop_item_id. '
  'acq_staff includes admin grants and pending team border gifts.';

revoke all on function public.admin_shop_border_stats() from public;
grant execute on function public.admin_shop_border_stats() to authenticated;
grant execute on function public.admin_shop_border_stats() to service_role;
