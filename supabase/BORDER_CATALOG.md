# PulseVerse border catalog (migration 123)

## Four independent axes

| Axis | Column | Meaning |
|------|--------|--------|
| **Rarity** | `rarity_tier` | Prestige tier: common → mythic. **Not** price. |
| **Source** | `source_type` | How it enters the ecosystem (shop, beta_reward, leaderboard_reward, …). |
| **Visual** | `visual_tier` | Presentation: static, enhanced, reactive, animated. |
| **Availability** | `availability_status` | Obtainability: active, limited, retired, exclusive, legacy. |

Use **together** for merchandising: e.g. epic + animated + limited → premium band; mythic + leaderboard → never broad retail.

## Collections

Table `border_collections` groups borders (beta set, monthly champions, seasonal drops).  
`shop_items.collection_id` links a border to one collection.

## Shop vs earned borders

- **`is_shop_item = true`** — IAP border; requires `store_product_id_ios` / `store_product_id_android` (and `spark_price` null for borders per existing rules).
- **`is_shop_item = false`** — catalog / reward border; SKUs optional (kept for legacy receipts when migrating).
- **`is_earned_only = true`** — not sold; granted via `unlock_method` (e.g. `leaderboard_rank`, `beta_tester_grant`).

## Monthly leaderboard playbook

1. Call as admin (SQL or RPC):

   `select public.admin_border_catalog_create_monthly_champions('2026-06', 'June 2026');`

2. That creates `collection_champions_2026_06` and five `shop_items` ranks 1–5 with defaults from `border_catalog_leaderboard_rank_defaults(rank)`.

3. When the month closes, set collection `is_retired`, flip border `availability_status` to `legacy` or `retired`, and keep **`is_shop_item = false`** so winners are not resold as generic shop SKUs.

Default rank mapping (also in `border_catalog_leaderboard_rank_defaults`):

| Rank | rarity_tier | visual_tier | prestige (seed) |
|------|------------|-------------|-----------------|
| 1 | mythic | animated | 100 |
| 2 | legendary | animated | 85 |
| 3 | legendary | enhanced | 75 |
| 4 | epic | enhanced | 60 |
| 5 | epic | static | 50 |

## Pricing guidance

Rows in **`border_pricing_rules`** are admin-tunable recommendations (`default_price_band`, `recommended_display_label`), keyed by `(rarity_tier, visual_tier)`.

## RLS

- `border_collections` / `border_pricing_rules`: world read; admin CRUD via `_economy_is_admin()`.
- `shop_items` select: active rows **or** rows the user **owns** in `user_inventory` (so retired/legacy borders still resolve for display and equip).

## App surfaces

- Types: `lib/shop/borderCatalogTaxonomy.ts`, extended `ShopItemRow` in `lib/shop/types.ts`.
- Chips: `components/shop/BorderCatalogMetaChips.tsx`; featured border in `PulseShopScreen`.
- Admin overview: **Admin → sparkles icon → Border catalog** (`/admin/border-catalog`).
