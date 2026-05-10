# pulse-shop-fulfillment

Server-side validation for Pulse Shop IAP and Sparks-based creator gifts. **Do not** mark receipts valid from the client.

## Deploy

```bash
npx supabase functions deploy pulse-shop-fulfillment
```

Uses **JWT verification** (default): the caller must send `Authorization: Bearer <user access token>`.

## Secrets (Dashboard → Edge Functions → Secrets, or CLI)

| Secret | Purpose |
|--------|---------|
| `APPLE_IAP_SHARED_SECRET` | App Store Connect → app → App-Specific Shared Secret |
| `GOOGLE_PLAY_PACKAGE_NAME` | Android `applicationId` (same as Play Console package) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full JSON for a service account with **Google Play Android Developer** access |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.

## Request body

All actions require `shop_item_id` (UUID from `shop_items.id`).

### `fulfill_spark_pack`

- `platform`: `"ios"` | `"android"`
- `receipt.ios.receipt_data_base64`: legacy App Store receipt (base64)
- `receipt.android.purchase_token` + optional `product_id` (must match catalog)

### `fulfill_border_self`

Same receipt shape as spark pack; `shop_item` must be `type = border`.

### `fulfill_border_gift`

Same as border self plus:

- `border_gift.recipient_handle`: `@handle` or handle text (resolved to `profiles.username`)
- `border_gift.note`: optional

### `send_creator_gift`

No store receipt. Requires `shop_item` with `type = gift`.

- `creator_gift.creator_user_id`
- `creator_gift.context_type`: `live` | `post` | `profile`
- `creator_gift.context_id`: nullable UUID string
- `creator_gift.idempotency_key`: stable per user action (≥ 8 chars); prevents double spend

## Responses

Success:

```json
{ "ok": true, "data": { ... } }
```

Error:

```json
{ "ok": false, "error": { "code": "PRODUCT_MISMATCH", "message": "...", "details": {} } }
```

## App integration

Use `lib/pulseShopFulfillment.ts` (`invokePulseShopFulfillment`). Pass only purchase tokens / receipt payloads from the native IAP SDK — never trust self-reported balances.
