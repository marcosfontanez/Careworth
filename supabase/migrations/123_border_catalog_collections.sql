-- ============================================================================
-- 123: Border catalog — collections, classification, pricing guidance, seeds
--
-- Rarity, source, visual tier, and availability are independent axes:
--   • rarity_tier     — prestige / scarcity tier (not price)
--   • source_type     — how the border enters the ecosystem
--   • visual_tier     — presentation complexity / motion
--   • availability_status — whether and how it can be obtained now
-- Shop IAP rules apply only when is_shop_item = true (store SKUs required).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1) border_collections
-- -----------------------------------------------------------------------------
create table public.border_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  collection_type text not null
    check (collection_type in (
      'beta', 'monthly_leaderboard', 'seasonal', 'sponsored', 'shop', 'event', 'founder'
    )),
  season_code text,
  release_at timestamptz,
  expires_at timestamptz,
  is_retired boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_border_collections_type on public.border_collections (collection_type);
create index idx_border_collections_season on public.border_collections (season_code);

create trigger trg_border_collections_updated_at
  before update on public.border_collections
  for each row execute function public._economy_touch_updated_at();

comment on table public.border_collections is
  'Logical grouping for borders (beta, monthly champions, seasonal sets).';

-- -----------------------------------------------------------------------------
-- 2) border_pricing_rules — admin guidance (not final prices)
-- -----------------------------------------------------------------------------
create table public.border_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  rarity_tier text not null
    check (rarity_tier in ('common', 'rare', 'epic', 'legendary', 'mythic')),
  visual_tier text not null
    check (visual_tier in ('static', 'enhanced', 'reactive', 'animated')),
  default_price_band text not null,
  recommended_display_label text not null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (rarity_tier, visual_tier)
);

comment on table public.border_pricing_rules is
  'Recommended pricing bands / display labels by rarity + visual tier. Tune via admin.';

-- -----------------------------------------------------------------------------
-- 3) shop_items — catalog columns
-- -----------------------------------------------------------------------------
alter table public.shop_items drop constraint if exists shop_items_rarity_check;

alter table public.shop_items add column if not exists collection_id uuid
  references public.border_collections (id) on delete set null;

alter table public.shop_items add column if not exists rarity_tier text
  check (
    rarity_tier is null
    or rarity_tier in ('common', 'rare', 'epic', 'legendary', 'mythic')
  );

alter table public.shop_items add column if not exists source_type text
  check (
    source_type is null
    or source_type in (
      'shop', 'beta_reward', 'leaderboard_reward', 'seasonal_drop',
      'event_reward', 'sponsored', 'promotional', 'admin_grant'
    )
  );

alter table public.shop_items add column if not exists visual_tier text
  check (
    visual_tier is null
    or visual_tier in ('static', 'enhanced', 'reactive', 'animated')
  );

alter table public.shop_items add column if not exists availability_status text
  check (
    availability_status is null
    or availability_status in ('active', 'limited', 'retired', 'exclusive', 'legacy')
  );

alter table public.shop_items add column if not exists unlock_method text
  check (
    unlock_method is null
    or unlock_method in (
      'direct_purchase', 'leaderboard_rank', 'beta_tester_grant', 'seasonal_reward',
      'sponsored_reward', 'event_unlock', 'admin_grant'
    )
  );

alter table public.shop_items add column if not exists is_animated boolean not null default false;

alter table public.shop_items add column if not exists is_tradable boolean not null default false;

alter table public.shop_items add column if not exists is_shop_item boolean not null default false;

alter table public.shop_items add column if not exists is_earned_only boolean not null default false;

alter table public.shop_items add column if not exists price_type text
  check (
    price_type is null
 or price_type in ('direct_purchase', 'sparks', 'reward_only', 'gifted_only')
  );

alter table public.shop_items add column if not exists season_code text;

alter table public.shop_items add column if not exists rank_place integer
  check (rank_place is null or (rank_place >= 1 and rank_place <= 50));

alter table public.shop_items add column if not exists is_retired boolean not null default false;

alter table public.shop_items add column if not exists prestige_score integer not null default 0;

alter table public.shop_items add constraint shop_items_rarity_check_legacy
  check (
    rarity is null
    or rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'exclusive', 'mythic')
  );

alter table public.shop_items drop constraint if exists shop_items_border_rules;

alter table public.shop_items add constraint shop_items_border_rules
  check (
    type <> 'border'
    or (
      coalesce(is_shop_item, false) = true
      and spark_price is null
      and store_product_id_ios is not null
      and length(trim(store_product_id_ios)) > 0
      and store_product_id_android is not null
      and length(trim(store_product_id_android)) > 0
    )
    or (
      coalesce(is_shop_item, false) = false
    )
  );

alter table public.shop_items add constraint shop_items_collection_border_only
  check (collection_id is null or type = 'border');

create index if not exists idx_shop_items_collection on public.shop_items (collection_id);
create index if not exists idx_shop_items_rarity_tier on public.shop_items (rarity_tier);
create index if not exists idx_shop_items_availability on public.shop_items (availability_status);

comment on column public.shop_items.rarity_tier is 'Catalog rarity (common–mythic); independent of price.';
comment on column public.shop_items.source_type is 'Provenance: shop, leaderboard, beta, etc.';
comment on column public.shop_items.visual_tier is 'Presentation: static → animated.';
comment on column public.shop_items.availability_status is 'Obtainability: active, limited, retired, exclusive, legacy.';
comment on column public.shop_items.is_shop_item is 'If true, border must have IAP SKUs (store checkout).';
comment on column public.shop_items.is_earned_only is 'Cannot be bought; granted via unlock_method.';
comment on column public.shop_items.price_type is 'Monetization shape: direct_purchase vs sparks vs reward_only.';
comment on column public.shop_items.prestige_score is 'Display/sort weight for profile and museum views.';

-- -----------------------------------------------------------------------------
-- 4) Backfill existing rows
-- -----------------------------------------------------------------------------
update public.shop_items
set
  rarity_tier = coalesce(
    rarity_tier,
    case
      when rarity = 'mythic' then 'mythic'
      when rarity = 'legendary' then 'legendary'
      when rarity = 'epic' then 'epic'
      when rarity = 'rare' then 'rare'
      when rarity = 'uncommon' then 'rare'
      when rarity = 'exclusive' then 'legendary'
      else 'common'
    end
  ),
  source_type = coalesce(source_type, 'shop'),
  visual_tier = coalesce(visual_tier, 'static'),
  availability_status = coalesce(availability_status, case when is_active then 'active' else 'limited' end),
  unlock_method = coalesce(unlock_method, 'direct_purchase'),
  is_animated = coalesce(is_animated, animation_url is not null and length(trim(animation_url)) > 0),
  is_shop_item = case
    when type = 'border'
      and store_product_id_ios is not null and length(trim(store_product_id_ios)) > 0
      then true
    when type in ('spark_pack', 'gift') then true
    else coalesce(is_shop_item, false)
  end,
  is_earned_only = coalesce(is_earned_only, false),
  price_type = coalesce(
    price_type,
    case
      when type = 'gift' then 'sparks'
      when type = 'border' then 'direct_purchase'
      when type = 'spark_pack' then 'direct_purchase'
      else 'direct_purchase'
    end
  ),
  prestige_score = case
    when coalesce(prestige_score, 0) = 0 then case
      when rarity = 'legendary' then 70
      when rarity = 'epic' then 55
      when rarity = 'rare' then 40
      when rarity = 'uncommon' then 30
      when rarity = 'exclusive' then 65
      else 15
    end
    else prestige_score
  end
where type in ('border', 'spark_pack', 'gift', 'bundle', 'seasonal_drop', 'sponsored_drop');

-- Non-border rows: clear border-only fields
update public.shop_items
set
  collection_id = null,
  rank_place = null,
  is_tradable = false,
  is_earned_only = false
where type <> 'border';

-- -----------------------------------------------------------------------------
-- 5) RLS — collections & pricing rules
-- -----------------------------------------------------------------------------
alter table public.border_collections enable row level security;
alter table public.border_pricing_rules enable row level security;

drop policy if exists border_collections_read on public.border_collections;
create policy border_collections_read
  on public.border_collections for select
  to anon, authenticated
  using (true);

drop policy if exists border_collections_admin on public.border_collections;
create policy border_collections_admin
  on public.border_collections for all
  to authenticated
  using (public._economy_is_admin())
  with check (public._economy_is_admin());

drop policy if exists border_pricing_rules_read on public.border_pricing_rules;
create policy border_pricing_rules_read
  on public.border_pricing_rules for select
  to anon, authenticated
  using (true);

drop policy if exists border_pricing_rules_admin on public.border_pricing_rules;
create policy border_pricing_rules_admin
  on public.border_pricing_rules for all
  to authenticated
  using (public._economy_is_admin())
  with check (public._economy_is_admin());

-- -----------------------------------------------------------------------------
-- 6) shop_items select — owned inactive borders visible to owner (equip/history)
-- -----------------------------------------------------------------------------
drop policy if exists shop_items_read_active on public.shop_items;
create policy shop_items_read_active
  on public.shop_items for select
  to anon, authenticated
  using (
    is_active = true
    or public._economy_is_admin()
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.user_inventory ui
        where ui.shop_item_id = shop_items.id
          and ui.user_id = auth.uid()
      )
    )
  );

grant select on public.border_collections to anon, authenticated;
grant select on public.border_pricing_rules to anon, authenticated;
grant all on public.border_collections to service_role;
grant all on public.border_pricing_rules to service_role;

-- -----------------------------------------------------------------------------
-- 7) Seed — pricing guidance matrix
-- -----------------------------------------------------------------------------
insert into public.border_pricing_rules
  (rarity_tier, visual_tier, default_price_band, recommended_display_label, notes, sort_order)
values
  ('common', 'static', 'tier_1', 'Entry', 'Lowest IAP band; standard store frame.', 10),
  ('common', 'enhanced', 'tier_2', 'Entry+', 'Slightly richer art; small uplift.', 20),
  ('rare', 'static', 'tier_2', 'Select', 'Mid-low; exclusive of common.', 30),
  ('rare', 'enhanced', 'tier_3', 'Select+', 'Mid-low with glow / layers.', 40),
  ('epic', 'enhanced', 'tier_4', 'Premium', 'Mid-high; detailed frame.', 50),
  ('epic', 'animated', 'tier_5', 'Premium motion', 'Mid-high with motion.', 60),
  ('legendary', 'animated', 'tier_6', 'Flagship', 'Top store tier; avoid oversaturating.', 70),
  ('legendary', 'reactive', 'tier_6', 'Flagship (reactive)', 'Reserved for special reactive builds.', 75),
  ('mythic', 'animated', 'not_for_general_sale', 'Trophy class', 'Generally not sold; rewards / leaders.', 90),
  ('mythic', 'reactive', 'not_for_general_sale', 'Trophy (reactive)', 'Elite reactive; not broad retail.', 95)
on conflict (rarity_tier, visual_tier) do update set
  default_price_band = excluded.default_price_band,
  recommended_display_label = excluded.recommended_display_label,
  notes = excluded.notes,
  sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 8) Seed — collections
-- -----------------------------------------------------------------------------
insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
values
  (
    'collection_beta_rewards_2026',
    'Beta Rewards',
    'Early supporter and beta tester recognition borders.',
    'beta',
    null,
    false
  ),
  (
    'collection_champions_2026_04',
    'April 2026 Champions',
    'Monthly leaderboard top finishers — April 2026.',
    'monthly_leaderboard',
    '2026-04',
    true
  ),
  (
    'collection_champions_2026_05',
    'May 2026 Champions',
    'Monthly leaderboard top finishers — May 2026.',
    'monthly_leaderboard',
    '2026-05',
    true
  )
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 9) Seed — Beta Pioneer (align with catalog spec; keep IAP SKUs for legacy receipts)
-- -----------------------------------------------------------------------------
update public.shop_items si
set
  slug = 'border_beta_pioneer',
  name = 'Beta Pioneer',
  description = 'Early PulseVerse beta recognition — earned by testers, not a standard retail frame.',
  rarity = 'rare',
  rarity_tier = 'rare',
  source_type = 'beta_reward',
  visual_tier = 'enhanced',
  availability_status = 'legacy',
  unlock_method = 'beta_tester_grant',
  is_animated = false,
  is_giftable = false,
  is_tradable = false,
  is_shop_item = false,
  is_earned_only = true,
  price_type = 'reward_only',
  is_retired = true,
  is_active = false,
  is_limited = false,
  prestige_score = 40,
  collection_id = (select id from public.border_collections c where c.slug = 'collection_beta_rewards_2026' limit 1)
where si.slug = 'beta-pioneer';

-- If beta-pioneer was already renamed or missing, also match by old pattern
update public.shop_items si
set
  slug = 'border_beta_pioneer',
  name = 'Beta Pioneer',
  description = 'Early PulseVerse beta recognition — earned by testers, not a standard retail frame.',
  rarity = 'rare',
  rarity_tier = 'rare',
  source_type = 'beta_reward',
  visual_tier = 'enhanced',
  availability_status = 'legacy',
  unlock_method = 'beta_tester_grant',
  is_animated = false,
  is_giftable = false,
  is_tradable = false,
  is_shop_item = false,
  is_earned_only = true,
  price_type = 'reward_only',
  is_retired = true,
  is_active = false,
  is_limited = false,
  prestige_score = 40,
  collection_id = (select id from public.border_collections c where c.slug = 'collection_beta_rewards_2026' limit 1)
where si.slug = 'border_beta_pioneer'
  and si.collection_id is null;

-- -----------------------------------------------------------------------------
-- 10) Seed — Monthly champion borders (April & May 2026)
-- -----------------------------------------------------------------------------
insert into public.shop_items (
  slug, type, category, name, description, rarity, rarity_tier,
  image_url, animation_url,
  spark_price, spark_amount, real_money_display_price,
  store_product_id_ios, store_product_id_android,
  is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata,
  collection_id, source_type, visual_tier, availability_status, unlock_method,
  is_animated, is_tradable, is_shop_item, is_earned_only, price_type,
  season_code, rank_place, is_retired, prestige_score
)
select
  v.slug,
  'border',
  'borders',
  v.title,
  format('%s finisher border (rank %s).', coll.name, v.rank_place),
  case v.rarity_tier
    when 'mythic' then 'mythic'
    when 'legendary' then 'legendary'
    else 'epic'
  end,
  v.rarity_tier::text,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  false,
  false,
  200 + v.rank_place + case when v.coll_slug like '%_05%' then 10 else 0 end,
  null,
  '{}'::jsonb,
  coll.id,
  'leaderboard_reward',
  v.visual_tier::text,
  'legacy',
  'leaderboard_rank',
  v.visual_tier = 'animated',
  false,
  false,
  true,
  'reward_only',
  coll.season_code,
  v.rank_place,
  true,
  v.prestige
from (values
  ('border_champions_2026_04_rank_1', 'April 2026 — 1st Place', 'mythic', 'animated', 1, 100, 'collection_champions_2026_04'),
  ('border_champions_2026_04_rank_2', 'April 2026 — 2nd Place', 'legendary', 'animated', 2, 85, 'collection_champions_2026_04'),
  ('border_champions_2026_04_rank_3', 'April 2026 — 3rd Place', 'legendary', 'enhanced', 3, 75, 'collection_champions_2026_04'),
  ('border_champions_2026_04_rank_4', 'April 2026 — 4th Place', 'epic', 'enhanced', 4, 60, 'collection_champions_2026_04'),
  ('border_champions_2026_04_rank_5', 'April 2026 — 5th Place', 'epic', 'static', 5, 50, 'collection_champions_2026_04'),
  ('border_champions_2026_05_rank_1', 'May 2026 — 1st Place', 'mythic', 'animated', 1, 100, 'collection_champions_2026_05'),
  ('border_champions_2026_05_rank_2', 'May 2026 — 2nd Place', 'legendary', 'animated', 2, 85, 'collection_champions_2026_05'),
  ('border_champions_2026_05_rank_3', 'May 2026 — 3rd Place', 'legendary', 'enhanced', 3, 75, 'collection_champions_2026_05'),
  ('border_champions_2026_05_rank_4', 'May 2026 — 4th Place', 'epic', 'enhanced', 4, 60, 'collection_champions_2026_05'),
  ('border_champions_2026_05_rank_5', 'May 2026 — 5th Place', 'epic', 'static', 5, 50, 'collection_champions_2026_05')
) as v(slug, title, rarity_tier, visual_tier, rank_place, prestige, coll_slug)
inner join public.border_collections coll on coll.slug = v.coll_slug
where not exists (select 1 from public.shop_items s where s.slug = v.slug);

-- -----------------------------------------------------------------------------
-- 11) Admin helpers — leaderboard defaults + monthly template
-- -----------------------------------------------------------------------------
create or replace function public.border_catalog_leaderboard_rank_defaults(p_rank integer)
returns table (
  rarity_tier text,
  visual_tier text,
  prestige_score integer
)
language sql
stable
as $$
  select rarity_tier, visual_tier, prestige_score
  from (values
    (1, 'mythic'::text, 'animated'::text, 100),
    (2, 'legendary', 'animated', 85),
    (3, 'legendary', 'enhanced', 75),
    (4, 'epic', 'enhanced', 60),
    (5, 'epic', 'static', 50)
  ) as t(rk, rarity_tier, visual_tier, prestige_score)
  where t.rk = p_rank;
$$;

comment on function public.border_catalog_leaderboard_rank_defaults(integer) is
  'Default rarity, visual tier, and prestige for monthly ranks 1–5. Extend ranks via admin before altering this function.';

-- Create empty monthly champion set: collection + five placeholder borders (inactive, exclusive).
create or replace function public.admin_border_catalog_create_monthly_champions(
  p_season_code text,
  p_month_label text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_coll_id uuid;
  v_coll_name text;
  r int;
  d record;
  v_border_slug text;
begin
  if auth.uid() is null or not public._economy_is_admin() then
    raise exception 'not_allowed';
  end if;

  v_slug := 'collection_champions_' || replace(trim(p_season_code), '-', '_');
  v_coll_name := trim(p_month_label) || ' Champions';

  insert into public.border_collections (slug, name, description, collection_type, season_code, is_retired)
  values (
    v_slug,
    v_coll_name,
    'Monthly leaderboard top finishers — ' || trim(p_season_code) || '.',
    'monthly_leaderboard',
    trim(p_season_code),
    false
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    season_code = excluded.season_code,
    updated_at = now()
  returning id into v_coll_id;

  if v_coll_id is null then
    select id into v_coll_id from public.border_collections where slug = v_slug limit 1;
  end if;

  for r in 1..5 loop
    select * into d from public.border_catalog_leaderboard_rank_defaults(r);
    v_border_slug := 'border_champions_' || replace(trim(p_season_code), '-', '_') || '_rank_' || r;
    insert into public.shop_items (
      slug, type, category, name, description, rarity, rarity_tier,
      spark_price, spark_amount, real_money_display_price,
      store_product_id_ios, store_product_id_android,
      is_active, is_giftable, is_limited, sort_order, gift_contexts, metadata,
      collection_id, source_type, visual_tier, availability_status, unlock_method,
      is_animated, is_tradable, is_shop_item, is_earned_only, price_type,
      season_code, rank_place, is_retired, prestige_score
    )
    values (
      v_border_slug,
      'border',
      'borders',
      v_coll_name || ' — ' || case r
        when 1 then '1st'
        when 2 then '2nd'
        when 3 then '3rd'
        when 4 then '4th'
        else '5th'
      end || ' Place',
      'Reserved champion border — grant to rank ' || r || ' when results are final.',
      case d.rarity_tier when 'mythic' then 'mythic' when 'legendary' then 'legendary' else 'epic' end,
      d.rarity_tier,
      null, null, null, null, null,
      false, false, false,
      300 + r,
      null,
      '{}'::jsonb,
      v_coll_id,
      'leaderboard_reward',
      d.visual_tier,
      'exclusive',
      'leaderboard_rank',
      d.visual_tier = 'animated',
      false,
      false,
      true,
      'reward_only',
      trim(p_season_code),
      r,
      false,
      d.prestige_score
    )
    on conflict (slug) do update set
      collection_id = excluded.collection_id,
      rarity_tier = excluded.rarity_tier,
      visual_tier = excluded.visual_tier,
      rank_place = excluded.rank_place,
      prestige_score = excluded.prestige_score,
      updated_at = now();
  end loop;

  return jsonb_build_object('collection_id', v_coll_id, 'collection_slug', v_slug);
end;
$$;

revoke all on function public.admin_border_catalog_create_monthly_champions(text, text) from public;
grant execute on function public.admin_border_catalog_create_monthly_champions(text, text) to authenticated;

revoke all on function public.border_catalog_leaderboard_rank_defaults(integer) from public;
grant execute on function public.border_catalog_leaderboard_rank_defaults(integer) to anon, authenticated;
