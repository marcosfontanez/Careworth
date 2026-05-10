# Pulse Shop & PulseVerse economy (Supabase)

This backend is defined in:

- `supabase/migrations/121_pulseverse_economy_and_shop.sql` — schema, ledger trigger, tables
- `supabase/migrations/122_pulseverse_economy_rpcs_rls_seed.sql` — RPCs, RLS, grants, seed catalog

Migration `120_pulse_shop_economy.sql` is **superseded**; `121` drops its objects when present.

## 1. Border purchase vs Sparks purchase

| | **Borders** | **Sparks (packs)** |
|---|-------------|---------------------|
| **Client** | Native IAP (App Store / Play) for a **border** SKU | Native IAP for a **spark_pack** SKU |
| **Edge / backend** | Validate receipt → insert `purchase_receipts` (`validation_status = valid`, `shop_item_id` = border) | Same pattern; `shop_item_id` must reference a `spark_pack` |
| **Fulfillment RPC** | `economy_grant_border_from_valid_receipt` or `economy_gift_border_from_valid_receipt` | `economy_grant_sparks_from_valid_receipt` |
| **Ledger** | `wallet_transactions` with `wallet_type = 'border'` (audit only; **no** Sparks balance change) | `wallet_type = 'sparks'`, `transaction_type = 'spark_purchase'`, increases **paid** bucket |
| **Balances** | Ownership in `user_inventory` | `spark_wallets.paid_sparks_balance` (+ `total_sparks_purchased`) |
| **Creators** | Borders **do not** credit Diamonds | N/A (Sparks are user currency) |

Borders never use `spark_price` on `shop_items`; gifts and future spark-priced items do.

## 2. Creator gift flow → Diamonds

1. Caller invokes `economy_send_creator_gift(creator, gift_item_id, context_type, context_id, idempotency_key)` as the buyer (`auth.uid()` = sender).
2. RPC checks the item is `type = 'gift'`, active, and `p_context_type` is listed on `shop_items.gift_contexts`.
3. One **Spark debit** ledger row (`spark_debit_gift_live` / `post` / `profile`) runs the balance trigger: debits **promo first, then paid** per `economy_settings.gift_spend_source_order`.
4. One **Diamond credit** ledger row (`diamond_earn_*`) runs the diamond trigger:
   - If `diamond_hold_days.days` is **0**: credits `diamonds_available` and `total_diamonds_earned`.
   - If **&gt; 0**: credits `diamonds_pending`, sets `reserve_release_at` on the ledger row; `economy_release_pending_diamonds()` (service role / cron) inserts matching `reserve_release` rows to move to `diamonds_available`.
5. Diamond amount = `floor(spark_price * ratio)` from `sparks_to_diamonds_ratio` (default 100 Sparks → 45 Diamonds).
6. `creator_gifts` stores the row with both wallet txn ids for auditing.

## 3. Future cash-out / payout

- **Balances to use:** `diamond_wallets.diamonds_available` (and optionally `min_cashout_threshold` in settings).
- **Do not pay out** from `diamonds_pending` until released (hold period).
- **Payout worker** would: create payout requests, move `diamonds_available` → `diamonds_paid_out` via new ledger types (e.g. `payout_debit`) and admin/service-only RPCs, and integrate Stripe Connect / PayPal / etc. outside this schema.

## 4. Edge Function orchestration

1. **Client** completes store purchase and posts receipt payload to Edge (with user JWT only — no shared secrets on device).
2. **Edge** validates with Apple **verifyReceipt** (production + sandbox) and **Google Play** `purchases.products.get`.
3. **Edge** inserts into `purchase_receipts` with `validation_status = 'valid'` and server-verified `store_product_id` / `external_transaction_id` (idempotent on transaction id).
4. **Edge** calls `economy_grant_*` RPCs **with the same user JWT** so `auth.uid()` matches the buyer.

**Shipped in repo:** `supabase/functions/pulse-shop-fulfillment` (+ `_shared/pulse-shop/*`), client wrapper `lib/pulseShopFulfillment.ts`, and `pulse-shop-fulfillment/README.md`.

Never call grant RPCs with a client-forged `validation_status`; only Edge creates valid receipt rows from store validation.

## 5. Scheduled job

- Call `economy_release_pending_diamonds()` on a schedule **using the service role** (Supabase `pg_cron` + `supabase_functions.invoke` or external worker).  
- **Not** granted to `authenticated`.

## 6. Profiles “handle”

Recipient resolution for border gifts uses **`profiles.username`** (normalized, case-insensitive, optional leading `@` stripped). There is no separate `handle` column; align the app’s @handle UX with `username`.

## 7. Structured errors (SQL exceptions)

Callers should map message text from Postgres errors, including:

- `insufficient_sparks`
- `duplicate_border`
- `invalid_receipt`
- `invalid_recipient`
- `self_gift_not_allowed`
- `item_not_active`
- `not_allowed`

Consider wrapping RPCs in the app and translating these to user-visible copy.
