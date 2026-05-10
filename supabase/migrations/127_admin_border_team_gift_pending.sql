-- ============================================================================
-- 127: Admin shop border grants = pending gift (open in app) + accept RPC
-- Recipients see a team message and must tap Open before user_inventory is minted.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- economy_accept_pending_border_gift — recipient opens a pending admin border gift
-- -----------------------------------------------------------------------------
create or replace function public.economy_accept_pending_border_gift(p_border_gift_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  bg public.border_gifts%rowtype;
  v_inv uuid;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select * into bg from public.border_gifts where id = p_border_gift_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  if bg.recipient_user_id is distinct from v_uid then
    raise exception 'not_allowed';
  end if;

  if bg.status is distinct from 'pending' then
    if bg.status in ('accepted', 'delivered') then
      return jsonb_build_object('ok', true, 'already', true);
    end if;
    raise exception 'invalid_state';
  end if;

  if not exists (
    select 1
    from public.wallet_transactions wt
    where wt.id = bg.wallet_transaction_id
      and wt.transaction_type = 'admin_adjustment'
      and wt.wallet_type = 'border'
  ) then
    raise exception 'not_allowed';
  end if;

  if exists (
    select 1
    from public.user_inventory ui
    where ui.user_id = v_uid and ui.shop_item_id = bg.shop_item_id
  ) then
    update public.border_gifts
    set
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      delivered_at = coalesce(delivered_at, now())
    where id = bg.id;
    return jsonb_build_object('ok', true, 'already_owned', true);
  end if;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    v_uid,
    bg.shop_item_id,
    'border',
    'gifted',
    bg.wallet_transaction_id,
    bg.sender_user_id,
    v_uid,
    true
  )
  returning id into v_inv;

  update public.border_gifts
  set
    status = 'accepted',
    accepted_at = now(),
    delivered_at = coalesce(delivered_at, now())
  where id = bg.id;

  return jsonb_build_object(
    'ok', true,
    'user_inventory_id', v_inv,
    'shop_item_id', bg.shop_item_id
  );
end;
$$;

comment on function public.economy_accept_pending_border_gift(uuid) is
  'Recipient accepts a pending border_gift created by economy_admin_grant_shop_item (admin team grant).';

grant execute on function public.economy_accept_pending_border_gift(uuid) to authenticated;
grant execute on function public.economy_accept_pending_border_gift(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- economy_admin_grant_shop_item — border branch: pending border_gift + notify
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
  v_gift uuid := null;
  v_team_message text := 'From the PulseVerse team. Enjoy!';
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
    if v_admin = p_recipient_user_id then
      raise exception 'not_allowed';
    end if;

    if exists (
      select 1 from public.user_inventory ui
      where ui.user_id = p_recipient_user_id and ui.shop_item_id = p_shop_item_id
    ) then
      raise exception 'duplicate_border';
    end if;

    if exists (
      select 1
      from public.border_gifts bg
      where bg.recipient_user_id = p_recipient_user_id
        and bg.shop_item_id = p_shop_item_id
        and bg.status = 'pending'
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
        select bg.id into v_gift
        from public.border_gifts bg
        where bg.wallet_transaction_id = v_tx
          and bg.status = 'pending'
        limit 1;
        if v_gift is not null then
          return jsonb_build_object(
            'ok', true,
            'idempotent', true,
            'wallet_transaction_id', v_tx,
            'kind', 'border',
            'border_gift_id', v_gift
          );
        end if;
        raise exception 'idempotency_conflict';
    end;

    insert into public.border_gifts (
      shop_item_id, sender_user_id, recipient_user_id, wallet_transaction_id,
      status, note, delivered_at
    )
    values (
      p_shop_item_id, v_admin, p_recipient_user_id, v_tx,
      'pending', v_team_message, null
    )
    returning id into v_gift;

    insert into public.shop_admin_item_grants (
      admin_user_id, recipient_user_id, shop_item_id, wallet_transaction_id, note, metadata
    )
    values (
      v_admin,
      p_recipient_user_id,
      p_shop_item_id,
      v_tx,
      p_note,
      jsonb_build_object(
        'kind', 'border',
        'idempotency_key', v_key,
        'border_gift_id', v_gift,
        'pulseverse_team_message', true
      )
    );

    perform public._economy_user_notify(
      p_recipient_user_id,
      'border_gift_received',
      'You received a border',
      v_team_message,
      jsonb_build_object(
        'border_gift_id', v_gift,
        'shop_item_id', v_it.id,
        'wallet_tx_id', v_tx,
        'pulseverse_team', true
      )
    );

    return jsonb_build_object(
      'ok', true,
      'wallet_transaction_id', v_tx,
      'kind', 'border',
      'border_gift_id', v_gift
    );
  end if;

  raise exception 'unsupported_shop_item_type';
end;
$$;

comment on function public.economy_admin_grant_shop_item(uuid, uuid, text, text) is
  'Staff-only: promo Sparks from a spark_pack row, or queue a border as a pending border_gift '
  '(recipient accepts via economy_accept_pending_border_gift).';
