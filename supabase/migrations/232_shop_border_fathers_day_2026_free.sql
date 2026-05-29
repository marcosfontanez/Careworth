-- 232: Father's Day 2026 — free limited-time border in Pulse Shop (June 1–30, 2026).
-- Asset: assets/images/pulse-rings/fathers-day-2026-border.png (transparent hole, bundled raster).
-- Free claim via economy_claim_free_shop_border — no App Store / Play IAP SKUs.

insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values (
  'collection_fathers_day_2026',
  'Father''s Day 2026',
  'Limited-time free shop border celebrating Father''s Day.',
  'seasonal',
  '2026-fathers-day',
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
  'border-fathers-day-2026',
  'border',
  'borders',
  'Father''s Day 2026',
  'Celebrate Father''s Day with this free avatar border — regal gold, navy, and a heartbeat line for dads everywhere. Claim it free in the Pulse Shop through June 30, 2026 at 11:59 PM Eastern. If you unlock it during the window, you keep it forever. After that, it retires permanently—you can browse it under Retired, but it will no longer be available to claim.',
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
  2,
  null,
  jsonb_build_object(
    'pulse_frame_slug', 'fathers-day-2026-border',
    'free_in_shop', true,
    'featured', true,
    'event_note', 'Free through June 30, 2026 11:59 PM Eastern — then retires to archive',
    'catalog_retires_at_utc', '2026-07-01T03:59:59Z',
    'ring_color', '#D4AF37',
    'preview_ring_color', '#F5D77A',
    'internal_item_number', 'PV-SHOP-BORDER-2026-FATHERS-DAY-001',
    'internal_sku_code', 'PULSE-FREE-BORDER-FATHERS-DAY-2026'
  ),
  (select id from public.border_collections c where c.slug = 'collection_fathers_day_2026' limit 1),
  'event_reward',
  'enhanced',
  'limited',
  'direct_purchase',
  false,
  true,
  false,
  false,
  'direct_purchase',
  false,
  30,
  '2026-fathers-day',
  timestamptz '2026-06-01T04:00:00Z',
  timestamptz '2026-07-01T03:59:59Z'
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
  'fathers-day-2026-border',
  'Father''s Day 2026',
  'Limited-time gift — regal gold frame for Father''s Day. Matches the free Pulse Shop drop.',
  'campaign',
  'rare',
  'Limited event · through June 30, ''26',
  '2026-06-01',
  '#D4AF37',
  'rgba(212, 175, 55, 0.45)',
  'Father''s Day 2026',
  52
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

-- Slug map for equip + inventory sync (metadata.pulse_frame_slug is primary).
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
    v_slug := case lower(trim(coalesce(v_shop_slug, '')))
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      when 'border-fathers-day-2026' then 'fathers-day-2026-border'
      when 'border_fathers_day_2026' then 'fathers-day-2026-border'
      when 'border-emerald-renewal-may-2026' then 'emerald-renewal-may-2026-border'
      when 'border_emerald_renewal_may_2026' then 'emerald-renewal-may-2026-border'
      when 'border-juneteenth-2026-charity' then 'juneteenth-2026-border'
      when 'border_juneteenth_2026_charity' then 'juneteenth-2026-border'
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
    v_slug := case lower(trim(coalesce(v_shop_slug, '')))
      when 'border-pride-month-2026' then 'pride-month-2026-border'
      when 'border_pride_month_2026' then 'pride-month-2026-border'
      when 'border_beta_pioneer' then 'beta-tester-border'
      when 'beta-pioneer' then 'beta-tester-border'
      when 'border-mothers-day-2026' then 'mothers-day-2026-border'
      when 'border_mothers_day_2026' then 'mothers-day-2026-border'
      when 'border-fathers-day-2026' then 'fathers-day-2026-border'
      when 'border_fathers_day_2026' then 'fathers-day-2026-border'
      when 'border-emerald-renewal-may-2026' then 'emerald-renewal-may-2026-border'
      when 'border_emerald_renewal_may_2026' then 'emerald-renewal-may-2026-border'
      when 'border-juneteenth-2026-charity' then 'juneteenth-2026-border'
      when 'border_juneteenth_2026_charity' then 'juneteenth-2026-border'
      else null
    end;
  end if;

  if v_slug is not null then
    select paf.id
    into v_frame_id
    from public.pulse_avatar_frames paf
    where paf.slug = v_slug
    limit 1;

    if v_frame_id is not null then
      update public.profiles
      set selected_pulse_avatar_frame_id = v_frame_id
      where id = v_uid;
    end if;
  end if;
end;
$$;
