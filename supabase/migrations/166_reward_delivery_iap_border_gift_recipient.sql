-- When a border is gifted via IAP (`economy_gift_border_from_valid_receipt`), inventory is minted
-- immediately for the recipient — enqueue reward_deliveries server-side (team/admin pending gifts
-- stay client-enqueued from PulseVerseTeamBorderGiftGate).

create or replace function public.trigger_reward_delivery_border_iap_gift_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wt public.wallet_transactions%rowtype;
  v_si public.shop_items%rowtype;
  v_ring text;
  v_preview text;
  v_meta jsonb;
  v_disp text;
  v_sender_username text;
  v_sender_display text;
  v_sender_avatar text;
begin
  begin
    if new.item_kind is distinct from 'border' then
      return new;
    end if;
    if new.acquisition_source is distinct from 'gifted' then
      return new;
    end if;
    if new.acquisition_txn_id is null then
      return new;
    end if;

    select * into v_wt from public.wallet_transactions wt where wt.id = new.acquisition_txn_id;
    if not found then
      return new;
    end if;
    if v_wt.transaction_type is distinct from 'border_purchase_gift' then
      return new;
    end if;

    select * into v_si from public.shop_items si where si.id = new.shop_item_id;
    if not found then
      return new;
    end if;

    v_preview := coalesce(nullif(trim(v_si.image_url), ''), nullif(trim(v_si.animation_url), ''));

    v_ring := coalesce(
      nullif(trim(v_si.metadata ->> 'ring_color'), ''),
      nullif(trim(v_si.metadata ->> 'preview_ring_color'), ''),
      case lower(coalesce(v_si.rarity, ''))
        when 'common' then '#94A3B8'
        when 'uncommon' then '#22C55E'
        when 'rare' then '#38BDF8'
        when 'epic' then '#A855F7'
        when 'legendary' then '#D4A63A'
        when 'exclusive' then '#F472B6'
        when 'mythic' then '#F43F5E'
        else null::text
      end,
      '#38BDF8'
    );

    v_sender_username := null;
    v_sender_display := null;
    v_sender_avatar := null;
    if new.gifted_by_user_id is not null then
      select p.username, p.display_name, p.avatar_url
      into v_sender_username, v_sender_display, v_sender_avatar
      from public.profiles p
      where p.id = new.gifted_by_user_id;
    end if;

    v_disp := coalesce(nullif(trim(v_sender_display), ''), nullif(trim(v_sender_username), ''));

    v_meta := jsonb_build_object(
      'kind', 'border',
      'shop_item_id', new.shop_item_id::text,
      'inventory_item_id', new.id::text,
      'border_name', v_si.name,
      'border_source', 'gifted',
      'rarity_slug', v_si.rarity,
      'rarity_label', v_si.rarity,
      'preview_image_url', v_preview,
      'ring_preview_hex', v_ring,
      'gifted_by_username', nullif(trim(v_sender_username), ''),
      'gifted_by_avatar_url', nullif(trim(v_sender_avatar), '')
    );

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
      'gift',
      'border',
      new.shop_item_id,
      null,
      new.gifted_by_user_id,
      v_disp,
      v_meta,
      'pending',
      'border_iap_gift_inv:' || new.id::text
    )
    on conflict (user_id, idempotency_key) do nothing;

  exception
    when others then
      perform public.log_trigger_error(
        'trigger_reward_delivery_border_iap_gift_recipient',
        tg_op,
        tg_table_name,
        sqlstate,
        sqlerrm,
        jsonb_build_object(
          'user_inventory_id', new.id,
          'shop_item_id', new.shop_item_id,
          'user_id', new.user_id
        )
      );
  end;

  return new;
end;
$$;

comment on function public.trigger_reward_delivery_border_iap_gift_recipient() is
  'Best-effort: queues Reward Delivery celebration when IAP border gift credits recipient inventory.';

drop trigger if exists trg_reward_delivery_border_iap_gift_recipient on public.user_inventory;

create trigger trg_reward_delivery_border_iap_gift_recipient
  after insert on public.user_inventory
  for each row
  execute function public.trigger_reward_delivery_border_iap_gift_recipient();
