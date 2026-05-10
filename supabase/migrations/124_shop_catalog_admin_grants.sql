-- ============================================================================
-- 124: Shop catalog audit + admin grants (Sparks packs + shop borders)
-- Source of truth for "all SKUs ever" remains public.shop_items (no hard deletes).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Audit: each staff grant of a shop_items row to a user
-- -----------------------------------------------------------------------------
create table if not exists public.shop_admin_item_grants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid not null references public.profiles (id) on delete restrict,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  shop_item_id uuid not null references public.shop_items (id) on delete restrict,
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_shop_admin_grants_recipient
  on public.shop_admin_item_grants (recipient_user_id, created_at desc);
create index if not exists idx_shop_admin_grants_admin
  on public.shop_admin_item_grants (admin_user_id, created_at desc);
create index if not exists idx_shop_admin_grants_shop_item
  on public.shop_admin_item_grants (shop_item_id, created_at desc);

comment on table public.shop_admin_item_grants is
  'Staff grants of shop catalog rows (Sparks IAP packs as promo credits, border inventory). Immutable log.';

alter table public.shop_admin_item_grants enable row level security;

drop policy if exists shop_admin_item_grants_admin_read on public.shop_admin_item_grants;
create policy shop_admin_item_grants_admin_read
  on public.shop_admin_item_grants for select
  to authenticated
  using (public._economy_is_admin());

grant select on public.shop_admin_item_grants to authenticated;
grant all on public.shop_admin_item_grants to service_role;

-- -----------------------------------------------------------------------------
-- economy_admin_grant_shop_item — borders + spark_pack only (MVP)
-- -----------------------------------------------------------------------------
create or replace function public.economy_admin_grant_shop_item(
  p_recipient_user_id uuid,
  p_shop_item_id uuid,
  p_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_it public.shop_items%rowtype;
  v_tx uuid;
  v_key text;
  v_admin uuid;
  v_amt int;
  v_idem text;
begin
  if auth.uid() is null or not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;
  v_admin := auth.uid();

  if p_recipient_user_id is null or p_shop_item_id is null then
    raise exception 'invalid_args';
  end if;

  if not exists (select 1 from public.profiles p where p.id = p_recipient_user_id) then
    raise exception 'user_not_found';
  end if;

  select * into v_it from public.shop_items si where si.id = p_shop_item_id;
  if not found then
    raise exception 'item_not_found';
  end if;

  v_idem := nullif(trim(coalesce(p_idempotency_key, '')), '');

  if v_it.type = 'spark_pack' then
    v_amt := v_it.spark_amount;
    if v_amt is null or v_amt <= 0 then
      raise exception 'invalid_spark_pack';
    end if;

    v_key := coalesce(v_idem, 'admin_spark:' || gen_random_uuid()::text);

    perform public.economy_create_or_get_wallets(p_recipient_user_id);

    begin
      insert into public.wallet_transactions (
        user_id, wallet_type, transaction_type, direction, amount, status,
        source_type, source_id, idempotency_key, metadata
      )
      values (
        p_recipient_user_id,
        'sparks',
        'promo_spark_credit',
        'credit',
        v_amt::bigint,
        'posted',
        'admin',
        v_admin,
        v_key,
        jsonb_build_object(
          'shop_item_id', v_it.id,
          'shop_slug', v_it.slug,
          'granted_by_admin', v_admin,
          'note', p_note
        )
      )
      returning id into v_tx;
    exception
      when unique_violation then
        select wt.id into v_tx
        from public.wallet_transactions wt
        where wt.idempotency_key = v_key;
        if v_tx is null then
          raise;
        end if;
        return jsonb_build_object(
          'ok', true,
          'idempotent', true,
          'wallet_transaction_id', v_tx,
          'kind', 'spark_pack',
          'spark_amount', v_amt
        );
    end;

    insert into public.shop_admin_item_grants (
      admin_user_id, recipient_user_id, shop_item_id, wallet_transaction_id, note, metadata
    )
    values (
      v_admin,
      p_recipient_user_id,
      p_shop_item_id,
      v_tx,
      p_note,
      jsonb_build_object('kind', 'spark_pack', 'spark_amount', v_amt, 'idempotency_key', v_key)
    );

    perform public._economy_user_notify(
      p_recipient_user_id,
      'sparks_purchase_success',
      'Sparks gift',
      format('You received %s Sparks from the team.', v_amt),
      jsonb_build_object(
        'wallet_tx_id', v_tx,
        'shop_item_id', v_it.id,
        'admin_grant', true
      )
    );

    return jsonb_build_object(
      'ok', true,
      'wallet_transaction_id', v_tx,
      'kind', 'spark_pack',
      'spark_amount', v_amt
    );

  elsif v_it.type = 'border' then
    if exists (
      select 1 from public.user_inventory ui
      where ui.user_id = p_recipient_user_id and ui.shop_item_id = p_shop_item_id
    ) then
      raise exception 'duplicate_border';
    end if;

    v_key := coalesce(
      v_idem,
      'admin_border:' || p_recipient_user_id::text || ':' || p_shop_item_id::text
    );

    begin
      insert into public.wallet_transactions (
        user_id, wallet_type, transaction_type, direction, amount, status,
        source_type, source_id, idempotency_key, metadata
      )
      values (
        p_recipient_user_id,
        'border',
        'admin_adjustment',
        'credit',
        1,
        'posted',
        'admin',
        v_admin,
        v_key,
        jsonb_build_object(
          'shop_item_id', v_it.id,
          'shop_slug', v_it.slug,
          'granted_by_admin', v_admin,
          'note', p_note
        )
      )
      returning id into v_tx;
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
          where ui.user_id = p_recipient_user_id and ui.shop_item_id = p_shop_item_id
        ) then
          return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'wallet_transaction_id', v_tx,
            'kind', 'border'
          );
        end if;
        raise exception 'idempotency_conflict';
    end;

    insert into public.user_inventory (
      user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
      gifted_by_user_id, gifted_to_user_id, is_transferable
    )
    values (
      p_recipient_user_id,
      p_shop_item_id,
      'border',
      'admin_grant',
      v_tx,
      null,
      null,
      true
    );

    insert into public.shop_admin_item_grants (
      admin_user_id, recipient_user_id, shop_item_id, wallet_transaction_id, note, metadata
    )
    values (
      v_admin,
      p_recipient_user_id,
      p_shop_item_id,
      v_tx,
      p_note,
      jsonb_build_object('kind', 'border', 'idempotency_key', v_key)
    );

    perform public._economy_user_notify(
      p_recipient_user_id,
      'border_purchase_success',
      'Border unlocked',
      v_it.name,
      jsonb_build_object(
        'wallet_tx_id', v_tx,
        'shop_item_id', v_it.id,
        'admin_grant', true
      )
    );

    return jsonb_build_object(
      'ok', true,
      'wallet_transaction_id', v_tx,
      'kind', 'border'
    );
  end if;

  raise exception 'unsupported_shop_item_type';
end;
$$;

comment on function public.economy_admin_grant_shop_item(uuid, uuid, text, text) is
  'Staff-only: credit promo Sparks from a spark_pack row or add a border to user_inventory. '
  'Inactive/retired catalog rows may be granted for support.';

grant execute on function public.economy_admin_grant_shop_item(uuid, uuid, text, text) to authenticated;
grant execute on function public.economy_admin_grant_shop_item(uuid, uuid, text, text) to service_role;
