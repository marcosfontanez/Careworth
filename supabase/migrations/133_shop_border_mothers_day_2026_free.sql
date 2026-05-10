-- ============================================================================
-- 133: Mother's Day 2026 — free limited-time border in Pulse Shop
-- Asset: assets/images/pulse-rings/mothers-day-2026-border.png (bundled app raster)
-- Shop listing ends 2026-05-24 00:00 UTC (last full calendar day in-app: May 23, 2026 PT
-- tapers into May 24 UTC — adjust copy as needed). Catalog hides rows when expires_at <= now().
-- Also: shop unlocks now sync public.user_pulse_avatar_frames so profile equip trigger succeeds.
-- ============================================================================

-- Allow pulse frame unlocks originating from shop inventory (IAP / free claim / gift).
alter table public.user_pulse_avatar_frames
  drop constraint if exists user_pulse_avatar_frames_grant_source_chk;

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_source_chk
  check (grant_source in ('leaderboard', 'admin', 'beta', 'shop'));

alter table public.user_pulse_avatar_frames
  drop constraint if exists user_pulse_avatar_frames_grant_rank_chk;

alter table public.user_pulse_avatar_frames
  add constraint user_pulse_avatar_frames_grant_rank_chk
  check (
    (grant_source = 'leaderboard' and leaderboard_rank between 1 and 5)
    or (grant_source = 'admin' and leaderboard_rank = 0)
    or (grant_source = 'beta' and leaderboard_rank = 0)
    or (grant_source = 'shop' and leaderboard_rank = 0)
  );

create or replace function public._economy_sync_user_pulse_frame_from_shop_item(
  p_user_id uuid,
  p_shop_item_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_shop_slug text;
  v_slug text;
  v_frame_id uuid;
begin
  if p_user_id is null or p_shop_item_id is null then
    return;
  end if;

  select si.metadata, si.slug
  into v_meta, v_shop_slug
  from public.shop_items si
  where si.id = p_shop_item_id
  limit 1;

  if not found then
    return;
  end if;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');

  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(v_shop_slug)
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      else null
    end;
  end if;

  if v_slug is null then
    return;
  end if;

  select paf.id
  into v_frame_id
  from public.pulse_avatar_frames paf
  where paf.slug = v_slug
  limit 1;

  if v_frame_id is null then
    return;
  end if;

  insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
  values (p_user_id, v_frame_id, 0, 'shop')
  on conflict (user_id, frame_id) do nothing;
end;
$$;

comment on function public._economy_sync_user_pulse_frame_from_shop_item(uuid, uuid) is
  'Ensures user_pulse_avatar_frames has a row for shop borders with metadata.pulse_frame_slug (or known shop slug map).';

create or replace function public.trg_user_inventory_sync_shop_pulse_frame()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.item_kind = 'border' and new.shop_item_id is not null then
    perform public._economy_sync_user_pulse_frame_from_shop_item(new.user_id, new.shop_item_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_inventory_sync_shop_pulse on public.user_inventory;
create trigger trg_user_inventory_sync_shop_pulse
  after insert on public.user_inventory
  for each row
  execute function public.trg_user_inventory_sync_shop_pulse_frame();

-- Free claim: availability window + pulse frame unlock
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
  v_now timestamptz := now();
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

  if v_it.release_at is not null and v_it.release_at > v_now then
    raise exception 'item_not_active';
  end if;

  if v_it.expires_at is not null and v_it.expires_at <= v_now then
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

-- IAP self-fulfill: enforce release/expires + pulse frame unlock
create or replace function public.economy_grant_border_from_valid_receipt(
  p_purchase_receipt_id uuid,
  p_shop_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.purchase_receipts%rowtype;
  it public.shop_items%rowtype;
  v_expected text;
  v_tx uuid;
  v_key text := 'border_self:' || p_purchase_receipt_id::text || ':' || p_shop_item_id::text;
  v_now timestamptz := now();
begin
  select * into r
  from public.purchase_receipts pr
  where pr.id = p_purchase_receipt_id
  for update;

  if not found then
    raise exception 'invalid_receipt';
  end if;

  if auth.uid() is distinct from r.user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  if r.validation_status is distinct from 'valid' then
    raise exception 'invalid_receipt';
  end if;

  select * into it from public.shop_items si where si.id = p_shop_item_id;
  if not found or it.type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  if not it.is_active and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  if it.release_at is not null and it.release_at > v_now and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  if it.expires_at is not null and it.expires_at <= v_now and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  v_expected := case r.platform
    when 'ios' then it.store_product_id_ios
    else it.store_product_id_android
  end;
  if r.store_product_id is distinct from v_expected then
    raise exception 'invalid_receipt';
  end if;

  if coalesce(r.shop_item_id, p_shop_item_id) is distinct from p_shop_item_id then
    raise exception 'invalid_receipt';
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = r.user_id and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'duplicate_border';
  end if;

  if r.processed_at is not null then
    select wt.id into v_tx from public.wallet_transactions wt where wt.idempotency_key = v_key;
    if v_tx is null then
      raise exception 'invalid_receipt';
    end if;
    return v_tx;
  end if;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    r.user_id,
    'border',
    'border_purchase_self',
    'credit',
    1,
    'posted',
    'purchase_receipt',
    r.id,
    v_key,
    jsonb_build_object('shop_item_id', p_shop_item_id)
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    r.user_id, p_shop_item_id, 'border', 'purchased', v_tx,
    null, null, true
  );

  update public.purchase_receipts
  set processed_at = now(), shop_item_id = p_shop_item_id
  where id = r.id;

  perform public._economy_user_notify(
    r.user_id,
    'border_purchase_success',
    'Border unlocked',
    it.name,
    jsonb_build_object('wallet_tx_id', v_tx, 'shop_item_id', p_shop_item_id)
  );

  return v_tx;
exception
  when unique_violation then
    select id into v_tx from public.wallet_transactions where idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    update public.purchase_receipts
    set processed_at = coalesce(processed_at, now()), shop_item_id = p_shop_item_id
    where id = p_purchase_receipt_id;
    return v_tx;
end;
$$;

-- Gift fulfillment: pulse frame unlock for recipient
create or replace function public.economy_gift_border_from_valid_receipt(
  p_sender_user_id uuid,
  p_recipient_handle text,
  p_purchase_receipt_id uuid,
  p_shop_item_id uuid,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.purchase_receipts%rowtype;
  it public.shop_items%rowtype;
  v_expected text;
  v_tx uuid;
  v_recipient uuid;
  v_key text := 'border_gift:' || p_purchase_receipt_id::text || ':' || p_shop_item_id::text;
  v_gift uuid;
  v_now timestamptz := now();
begin
  if auth.uid() is distinct from p_sender_user_id and not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  if p_sender_user_id is null then
    raise exception 'not_allowed';
  end if;

  select * into r
  from public.purchase_receipts pr
  where pr.id = p_purchase_receipt_id
  for update;

  if not found then
    raise exception 'invalid_receipt';
  end if;

  if r.user_id is distinct from p_sender_user_id then
    raise exception 'invalid_receipt';
  end if;

  if r.validation_status is distinct from 'valid' then
    raise exception 'invalid_receipt';
  end if;

  select p.id into v_recipient
  from public.profiles p
  where public._economy_normalize_handle(p.username)
    = public._economy_normalize_handle(p_recipient_handle)
  limit 1;

  if v_recipient is null then
    raise exception 'invalid_recipient';
  end if;

  if v_recipient = p_sender_user_id then
    raise exception 'self_gift_not_allowed';
  end if;

  select * into it from public.shop_items si where si.id = p_shop_item_id;
  if not found or it.type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  if not coalesce(it.is_giftable, false) then
    raise exception 'item_not_active';
  end if;

  if not it.is_active and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  if it.release_at is not null and it.release_at > v_now and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  if it.expires_at is not null and it.expires_at <= v_now and not public._economy_is_admin() then
    raise exception 'item_not_active';
  end if;

  v_expected := case r.platform
    when 'ios' then it.store_product_id_ios
    else it.store_product_id_android
  end;
  if r.store_product_id is distinct from v_expected then
    raise exception 'invalid_receipt';
  end if;

  if coalesce(r.shop_item_id, p_shop_item_id) is distinct from p_shop_item_id then
    raise exception 'invalid_receipt';
  end if;

  if exists (
    select 1 from public.user_inventory ui
    where ui.user_id = v_recipient and ui.shop_item_id = p_shop_item_id
  ) then
    raise exception 'duplicate_border';
  end if;

  if r.processed_at is not null then
    select wt.id into v_tx from public.wallet_transactions wt where wt.idempotency_key = v_key;
    if v_tx is null then
      raise exception 'invalid_receipt';
    end if;
    return v_tx;
  end if;

  insert into public.wallet_transactions (
    user_id, wallet_type, transaction_type, direction, amount, status,
    source_type, source_id, idempotency_key, metadata
  )
  values (
    v_recipient,
    'border',
    'border_purchase_gift',
    'credit',
    1,
    'posted',
    'purchase_receipt',
    r.id,
    v_key,
    jsonb_build_object(
      'shop_item_id', p_shop_item_id,
      'sender_user_id', p_sender_user_id
    )
  )
  returning id into v_tx;

  insert into public.user_inventory (
    user_id, shop_item_id, item_kind, acquisition_source, acquisition_txn_id,
    gifted_by_user_id, gifted_to_user_id, is_transferable
  )
  values (
    v_recipient, p_shop_item_id, 'border', 'gifted', v_tx,
    p_sender_user_id, v_recipient, false
  );

  insert into public.border_gifts (
    shop_item_id, sender_user_id, recipient_user_id, wallet_transaction_id,
    status, note, delivered_at
  )
  values (
    p_shop_item_id, p_sender_user_id, v_recipient, v_tx,
    'delivered', p_note, now()
  )
  returning id into v_gift;

  update public.purchase_receipts
  set processed_at = now(), shop_item_id = p_shop_item_id
  where id = r.id;

  perform public._economy_user_notify(
    v_recipient,
    'border_gift_received',
    'You received a border',
    it.name,
    jsonb_build_object('border_gift_id', v_gift, 'shop_item_id', p_shop_item_id, 'from', p_sender_user_id)
  );

  perform public._economy_user_notify(
    p_sender_user_id,
    'border_gift_sent',
    'Gift sent',
    format('You sent %s to a friend.', it.name),
    jsonb_build_object('border_gift_id', v_gift, 'shop_item_id', p_shop_item_id, 'to', v_recipient)
  );

  return v_tx;
exception
  when unique_violation then
    select id into v_tx from public.wallet_transactions where idempotency_key = v_key;
    if v_tx is null then
      raise;
    end if;
    update public.purchase_receipts
    set processed_at = coalesce(processed_at, now()), shop_item_id = p_shop_item_id
    where id = p_purchase_receipt_id;
    return v_tx;
end;
$$;

-- Equip helper: map Mother's Day shop slug
create or replace function public.economy_equip_border(p_inventory_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user uuid;
  v_item uuid;
  si_type text;
  v_shop_slug text;
  v_meta jsonb;
  v_slug text;
  v_frame_id uuid;
begin
  if v_uid is null then
    raise exception 'not_allowed';
  end if;

  select ui.user_id, ui.shop_item_id
  into v_user, v_item
  from public.user_inventory ui
  where ui.id = p_inventory_item_id
  for update;

  if not found or v_user is distinct from v_uid then
    raise exception 'not_allowed';
  end if;

  select type into si_type from public.shop_items where id = v_item;
  if si_type is distinct from 'border' then
    raise exception 'item_not_active';
  end if;

  update public.user_inventory
  set is_equipped = false
  where user_id = v_uid and item_kind = 'border';

  update public.user_inventory
  set is_equipped = true
  where id = p_inventory_item_id and user_id = v_uid;

  select si.slug, si.metadata
  into v_shop_slug, v_meta
  from public.shop_items si
  where si.id = v_item;

  v_slug := nullif(trim(coalesce(v_meta->>'pulse_frame_slug', '')), '');

  if v_slug is null and v_shop_slug is not null then
    v_slug := case lower(v_shop_slug)
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    update public.profiles
    set selected_pulse_avatar_frame_id = v_frame_id
    where id = v_uid;
  end if;
end;
$$;

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_mothers_day_2026',
  'Mother''s Day 2026',
  'Limited-time free shop border celebrating Mother''s Day.',
  'seasonal',
  '2026-mothers-day',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  season_code = excluded.season_code,
  updated_at = now();

insert into public.shop_items (
  slug, type, category, name, description, rarity, rarity_tier,
  image_url, animation_url,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata,
  collection_id, source_type, visual_tier, availability_status, unlock_method,
  is_animated, is_tradable, is_shop_item, is_earned_only, price_type,
  is_retired, prestige_score, season_code,
  release_at, expires_at
)
values (
  'border-mothers-day-2026',
  'border',
  'borders',
  'Mother''s Day 2026',
  'PulseVerse loves moms — we''re celebrating with this free avatar border. Claim it in the Pulse Shop through May 23, 2026 (at the end of that day it leaves the shelf). If you already unlocked it, you keep it forever.',
  'rare',
  'rare',
  null,
  null,
  null,
  null,
  'Free',
  null,
  null,
  true,
  false,
  true,
  6,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'mothers-day-2026-border',
    'free_in_shop', true,
    'featured', true,
    'event_note', 'Limited through 2026-05-23'
  ),
  (select id from public.border_collections c where c.slug = 'collection_mothers_day_2026' limit 1),
  'event_reward',
  'enhanced',
  'limited',
  'direct_purchase',
  false,
  true,
  true,
  false,
  'direct_purchase',
  false,
  28,
  '2026-mothers-day',
  null,
  timestamptz '2026-05-24T00:00:00Z'
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  rarity_tier = excluded.rarity_tier,
  real_money_display_price = excluded.real_money_display_price,
  is_active = excluded.is_active,
  is_giftable = excluded.is_giftable,
  is_limited = excluded.is_limited,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  collection_id = excluded.collection_id,
  source_type = excluded.source_type,
  visual_tier = excluded.visual_tier,
  availability_status = excluded.availability_status,
  unlock_method = excluded.unlock_method,
  is_animated = excluded.is_animated,
  is_tradable = excluded.is_tradable,
  is_shop_item = excluded.is_shop_item,
  is_earned_only = excluded.is_earned_only,
  price_type = excluded.price_type,
  is_retired = excluded.is_retired,
  prestige_score = excluded.prestige_score,
  season_code = excluded.season_code,
  release_at = excluded.release_at,
  expires_at = excluded.expires_at,
  updated_at = now();

insert into public.pulse_avatar_frames (
  slug,
  label,
  subtitle,
  prize_tier,
  rarity_tier,
  acquisition_tag,
  month_start,
  ring_color,
  glow_color,
  ring_caption,
  sort_order
)
values (
  'mothers-day-2026-border',
  'Mother''s Day 2026',
  'Limited-time gift — floral frame for Mother''s Day. Matches the free Pulse Shop drop.',
  'campaign',
  'rare',
  'Limited event · through May 23, ''26',
  '2026-05-01',
  '#F9A8D4',
  'rgba(249, 168, 212, 0.45)',
  'Mother''s Day 2026',
  51
)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  prize_tier = excluded.prize_tier,
  rarity_tier = excluded.rarity_tier,
  acquisition_tag = excluded.acquisition_tag,
  ring_color = excluded.ring_color,
  glow_color = excluded.glow_color,
  ring_caption = excluded.ring_caption,
  sort_order = excluded.sort_order;

-- Backfill pulse frame unlocks for shop borders obtained before the inventory trigger existed.
insert into public.user_pulse_avatar_frames (user_id, frame_id, leaderboard_rank, grant_source)
select distinct x.user_id, x.frame_id, 0, 'shop'
from (
  select
    ui.user_id,
    (
      select paf.id
      from public.pulse_avatar_frames paf
      where paf.slug = coalesce(
        nullif(trim(coalesce(si.metadata->>'pulse_frame_slug', '')), ''),
        case lower(trim(coalesce(si.slug, '')))
          when 'border-pride-month-2026' then 'pride-month-2026-border'
          when 'border_pride_month_2026' then 'pride-month-2026-border'
          when 'border_beta_pioneer' then 'beta-tester-border'
          when 'beta-pioneer' then 'beta-tester-border'
          when 'border-mothers-day-2026' then 'mothers-day-2026-border'
          when 'border_mothers_day_2026' then 'mothers-day-2026-border'
          else null
        end
      )
      limit 1
    ) as frame_id
  from public.user_inventory ui
  join public.shop_items si on si.id = ui.shop_item_id and si.type = 'border'
  where ui.item_kind = 'border'
) x
where x.frame_id is not null
on conflict (user_id, frame_id) do nothing;
