-- Queue Reward Delivery celebration when staff grants promo Sparks (shop catalog admin spark_pack).

create or replace function public.trigger_reward_delivery_admin_promo_sparks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty int;
  v_note text;
  v_slug text;
  v_meta jsonb;
begin
  begin
    if new.wallet_type is distinct from 'sparks' then
      return new;
    end if;
    if new.direction is distinct from 'credit' then
      return new;
    end if;
    if new.status is distinct from 'posted' then
      return new;
    end if;
    if new.transaction_type is distinct from 'promo_spark_credit' then
      return new;
    end if;
    if new.source_type is distinct from 'admin' then
      return new;
    end if;
    if new.user_id is null then
      return new;
    end if;

    v_qty := least(2147483647, greatest(0, new.amount::bigint))::int;
    if v_qty <= 0 then
      return new;
    end if;

    v_note := nullif(trim(coalesce(new.metadata ->> 'note', '')), '');
    v_slug := nullif(trim(coalesce(new.metadata ->> 'shop_slug', '')), '');

    v_meta := jsonb_build_object(
      'kind', 'sparks',
      'reason', 'promotion',
      'quantity', v_qty,
      'admin_grant', true,
      'wallet_transaction_id', new.id::text
    );
    if v_slug is not null then
      v_meta := v_meta || jsonb_build_object('shop_slug', v_slug);
    end if;
    if v_note is not null then
      v_meta := v_meta || jsonb_build_object('note', v_note);
    end if;

    insert into public.reward_deliveries (
      user_id,
      delivery_type,
      item_type,
      item_id,
      quantity,
      source_user_id,
      source_display_name,
      metadata,
      status,
      idempotency_key
    )
    values (
      new.user_id,
      'system_award',
      'sparks',
      null,
      v_qty,
      null,
      'PulseVerse Team',
      v_meta,
      'pending',
      'admin_promo_spark_tx:' || new.id::text
    )
    on conflict (user_id, idempotency_key) do nothing;

  exception
    when others then
      perform public.log_trigger_error(
        'trigger_reward_delivery_admin_promo_sparks',
        tg_op,
        tg_table_name,
        sqlstate,
        sqlerrm,
        jsonb_build_object('wallet_transaction_id', new.id, 'user_id', new.user_id)
      );
  end;

  return new;
end;
$$;

comment on function public.trigger_reward_delivery_admin_promo_sparks() is
  'After admin promo Sparks credit (wallet_transactions), enqueue reward_deliveries celebration.';

drop trigger if exists trg_reward_delivery_admin_promo_sparks on public.wallet_transactions;

create trigger trg_reward_delivery_admin_promo_sparks
  after insert on public.wallet_transactions
  for each row
  execute function public.trigger_reward_delivery_admin_promo_sparks();
