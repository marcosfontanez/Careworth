# Gift system — Phase 0 baseline (documentation & QA)

Phase 0 establishes a **written baseline** before changing gifting UX, Reward Delivery payloads, or feed surfaces. Use this doc when comparing behavior on **staging** vs **production**.

**Automated schema checks (SQL):** run `supabase/diagnostics/gift_system_phase0_baseline.sql` in the Supabase SQL Editor — read-only blocks that verify RPCs, triggers, and catalog rows.

## Canonical references in repo

| Concern | Primary locations |
|--------|---------------------|
| Shop creator gifts (Sparks) | `supabase/migrations/122_pulseverse_economy_rpcs_rls_seed.sql` (`shop_items` type `gift`, `economy_send_creator_gift`) |
| High-tier gift SKUs | `supabase/migrations/141_creator_gift_high_tiers.sql` |
| Diamond conversion | `supabase/migrations/121_pulseverse_economy_and_shop.sql` (`_economy_sparks_to_diamonds`, `economy_settings`) |
| `creator_gifts` table | `121_pulseverse_economy_and_shop.sql` |
| Reward enqueue (post/profile/live shop gifts) | `supabase/migrations/164_reward_delivery_creator_gift_diamonds.sql` (`reward_delivery_enqueue_on_creator_gift`, trigger on `creator_gifts`) |
| Reward enqueue metadata (Phase 1) | `supabase/migrations/173_reward_delivery_gift_metadata_phase1.sql` — replaces enqueue functions to enrich `metadata` (`gift_slug`, `context_id`, `sender_username`, `gift_emoji`, `stream_id`, …) |
| Reward enqueue (live sticker gifts) | `supabase/migrations/165_reward_delivery_live_stream_diamonds.sql` (`reward_delivery_enqueue_on_stream_gift`, trigger on `stream_gifts`) |
| `reward_deliveries` table & RPC | `supabase/migrations/163_reward_deliveries.sql` (`reward_deliveries_list_pending`) |
| Client send (shop path) | `components/shop/SendCreatorGiftTray.tsx`, `services/shop/purchaseService.ts`, `services/shop/economyRpc.ts` |
| Live sticker send | `services/supabase/streamGifts.ts` → `economy_send_live_stream_gift` (`143_*`, `158_*`) |
| Recipient UX | `components/rewards/RewardDeliveryProvider.tsx`, `RewardRevealModal.tsx`, `RewardItemReveal.tsx`; feed rail: `components/feed/FeedActionRail.tsx`, `VideoFeedPost.tsx` (`feedCreatorGifting`) |
| Bundled gift art | `lib/shop/creatorGiftAssets.ts`, `assets/images/shop-gifts/` |

## RPCs to verify exist on the Supabase project

Prefer **`supabase/diagnostics/gift_system_phase0_baseline.sql`** block **1** for a single query. Manual list:

- `public.economy_send_creator_gift(p_creator_user_id uuid, p_gift_item_id uuid, p_context_type text, p_context_id uuid, p_idempotency_key text)` → returns `uuid` (`122_pulseverse_economy_rpcs_rls_seed.sql`)
- `public.economy_send_live_stream_gift(p_stream_id text, p_gift_id text, p_gift_name text, p_gift_emoji text, p_unit_spark_cost integer, p_quantity integer, p_idempotency_key text)` → returns `uuid` (**authoritative signature:** `158_live_stream_gift_catalog_server_pricing.sql`; `p_unit_spark_cost` ignored server-side)
- `public.reward_deliveries_list_pending()` → setof `reward_deliveries` (`163_reward_deliveries.sql`)
- `public._economy_sparks_to_diamonds(integer)` → `integer` (`121_pulseverse_economy_and_shop.sql`)

If an RPC is missing, apply pending migrations (`npm run db:push` / CI pipeline).

## Triggers to verify

Prefer **`supabase/diagnostics/gift_system_phase0_baseline.sql`** block **2**.

| Trigger | Table | Function |
|---------|-------|----------|
| `trg_creator_gifts_reward_delivery` | `creator_gifts` | `reward_delivery_enqueue_on_creator_gift` |
| `trg_stream_gifts_reward_delivery` | `stream_gifts` | `reward_delivery_enqueue_on_stream_gift` |

## Manual baseline QA (staging)

Use **two test accounts**: **Sender** (Sparks balance) and **Creator** (recipient). Record IDs (user UUIDs, post UUID, stream UUID) in a scratch note.

### Per-surface checklist

For each row: after send, confirm **(a)** sender Sparks decreased, **(b)** creator Diamonds increased per `_economy_sparks_to_diamonds` (and hold rules if enabled), **(c)** appropriate ledger row, **(d)** recipient sees toast → can open reveal.

| # | Surface | How to open gift UI | Expected backend path |
|---|---------|---------------------|------------------------|
| 1 | Post detail | `app/post/[id].tsx` header gift (non-owner, non-anon) | `economy_send_creator_gift`, `context_type = post` |
| 2 | My Pulse update | `app/my-pulse/[id].tsx` (viewer, not owner) | `post` if linked post else `profile` |
| 3 | Creator profile | `app/profile/[id].tsx` | `context_type = profile`, `context_id = creator profile id` |
| 4 | Live — shop tray | `app/live/[id].tsx` outline gift → `SendCreatorGiftTray` | `economy_send_creator_gift`, `context_type = live` |
| 5 | Live — stickers | Second chat-bar gift → `GiftPicker` | `economy_send_live_stream_gift`, `stream_gifts`, trigger `165_*` |
| 6 | Feed (home tab) | Gift icon on action rail when **`feedCreatorGifting`** is enabled (signed-in, not owner, not anonymous) | `economy_send_creator_gift`, `context_type = post`, `context_id = post.id` |

### SQL spot-checks (replace placeholders)

**Latest creator gift from sender:**

```sql
select id, gift_item_id, sender_user_id, creator_user_id, context_type, context_id,
       sparks_spent, diamonds_earned, idempotency_key, created_at
from public.creator_gifts
where sender_user_id = '<SENDER_UUID>'
order by created_at desc
limit 5;
```

**Matching reward delivery for creator:**

```sql
select id, user_id, delivery_type, item_type, item_id, quantity,
       source_user_id, source_display_name, metadata, status, idempotency_key, created_at
from public.reward_deliveries
where user_id = '<CREATOR_UUID>'
order by created_at desc
limit 10;
```

**Wallet transactions for same send** (idempotency keys share prefix before `:spark` / `:diamond`):

```sql
select wallet_type, transaction_type, direction, amount, idempotency_key, metadata
from public.wallet_transactions
where user_id = '<SENDER_UUID>' or creator_id = '<CREATOR_UUID>'
order by created_at desc
limit 20;
```

**Live sticker row:**

```sql
select id, stream_id, sender_id, gift_id, gift_name, quantity, coin_cost, created_at
from public.stream_gifts
where stream_id = '<STREAM_ID>'
order by created_at desc
limit 10;
```

### Recipient UX checklist (creator device)

- [ ] Toast appears for pending delivery (`RewardDeliveryProvider`).
- [ ] Tap toast opens modal; gift box sequence plays (`GiftBoxRevealStage`).
- [ ] **Shop gift → Diamonds:** gift name, diamond amount, sender label visible (`RewardItemReveal` + `CreatorGiftOrb` when `reason = gift_conversion`).
- [ ] **Live sticker → Diamonds:** delivery exists; reveal shows **`gift_emoji`** in the orb when `173_*` metadata is applied (`RewardItemReveal`).

### Idempotency sanity

- Repeat send with **same** `idempotency_key` is hard from UI (new UUID each tap); optional API test: expect **no double debit** when key reused.

## Feature flag (Phase 2 — feed rail gift)

- **`feedCreatorGifting`** — default **off** in `lib/featureFlags.ts`. When **on**, the home feed (`VideoFeedPost` → `FeedActionRail`) shows a **Gift** action for signed-in viewers on non-anonymous posts they do not own; it opens `SendCreatorGiftTray` with **`context_type = post`** (same RPC path as post detail gifting). Toggle from **Admin → Feature flags** on device.

## After Phase 0

- Archive findings (screenshots or table exports) next to this doc or in team wiki.
- Phase 1 (metadata + reveal): migration **`173_*`** + client files under `components/rewards/` and `lib/rewardDelivery/types.ts`.
- Phase 2 (feed rail): **`feedCreatorGifting`** + `FeedActionRail` / `VideoFeedPost`.
