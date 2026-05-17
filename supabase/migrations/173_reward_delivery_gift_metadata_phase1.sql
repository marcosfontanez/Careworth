-- ============================================================================
-- 173: Reward Delivery metadata — Phase 1 (gift context + slug + live emoji)
-- Enriches celebration rows for creator Sparks gifts and live sticker gifts.
-- Client: RewardRevealModal, RewardItemReveal, RewardDeliveryProvider.
-- ============================================================================

create or replace function public.reward_delivery_enqueue_on_creator_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gift_name text;
  v_gift_slug text;
  v_sender_label text;
  v_sender_username text;
begin
  if NEW.diamonds_earned is null or NEW.diamonds_earned <= 0 then
    return NEW;
  end if;

  select si.name, si.slug
  into v_gift_name, v_gift_slug
  from public.shop_items si
  where si.id = NEW.gift_item_id;

  select
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Someone'),
    nullif(trim(p.username), '')
  into v_sender_label, v_sender_username
  from public.profiles p
  where p.id = NEW.sender_user_id;

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
    NEW.creator_user_id,
    'gift',
    'diamonds',
    NEW.gift_item_id,
    NEW.diamonds_earned,
    NEW.sender_user_id,
    v_sender_label,
    jsonb_build_object(
      'kind', 'diamonds',
      'reason', 'gift_conversion',
      'gift_name', coalesce(v_gift_name, 'Gift'),
      'gift_slug', nullif(trim(lower(coalesce(v_gift_slug, ''))), ''),
      'creator_gift_id', NEW.id::text,
      'context_type', NEW.context_type,
      'context_id', case when NEW.context_id is not null then NEW.context_id::text end,
      'sender_username', v_sender_username,
      'sparks_spent', NEW.sparks_spent
    ),
    'pending',
    'creator_gift_diamonds:' || NEW.id::text
  )
  on conflict (user_id, idempotency_key) do nothing;

  return NEW;
end;
$$;

comment on function public.reward_delivery_enqueue_on_creator_gift() is
  'After creator_gifts insert, enqueue reward_deliveries for the earning creator (celebration only). Metadata includes context_id, gift_slug, sender_username for Phase 1 reveal UX.';

create or replace function public.reward_delivery_enqueue_on_stream_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
  v_sparks int;
  v_diamonds int;
  v_sender_label text;
begin
  v_sparks := coalesce(NEW.coin_cost, 0) * greatest(coalesce(NEW.quantity, 0), 0);
  if v_sparks <= 0 then
    return NEW;
  end if;

  begin
    select ls.host_id
    into v_host
    from public.live_streams ls
    where ls.id = NEW.stream_id::uuid;
  exception
    when invalid_text_representation then
      v_host := null;
  end;

  if v_host is null then
    return NEW;
  end if;

  if NEW.sender_id = v_host then
    return NEW;
  end if;

  v_diamonds := greatest(public._economy_sparks_to_diamonds(v_sparks), 0);
  if v_diamonds <= 0 then
    return NEW;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Someone')
  into v_sender_label
  from public.profiles p
  where p.id = NEW.sender_id;

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
    v_host,
    'gift',
    'diamonds',
    null,
    v_diamonds,
    NEW.sender_id,
    v_sender_label,
    jsonb_build_object(
      'kind', 'diamonds',
      'reason', 'live_stream',
      'gift_name', coalesce(nullif(trim(NEW.gift_name), ''), 'Live gift'),
      'gift_id', nullif(trim(lower(coalesce(NEW.gift_id, ''))), ''),
      'gift_emoji', coalesce(nullif(trim(NEW.gift_emoji), ''), ''),
      'stream_gift_id', NEW.id::text,
      'stream_id', NEW.stream_id,
      'sparks_spent', v_sparks
    ),
    'pending',
    'live_stream_diamonds:' || NEW.id::text
  )
  on conflict (user_id, idempotency_key) do nothing;

  return NEW;
end;
$$;

comment on function public.reward_delivery_enqueue_on_stream_gift() is
  'After stream_gifts insert with paid Sparks, enqueue reward_deliveries for the stream host. Metadata includes gift_emoji and gift_id for Phase 1 reveal UX.';
