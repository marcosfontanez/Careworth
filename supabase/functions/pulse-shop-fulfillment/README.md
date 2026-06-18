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
| `APPLE_BUNDLE_ID` | Optional. iOS app bundle id (defaults to `com.pulseverse.app`). Checked against the decoded StoreKit 2 transaction. |
| `APPLE_IAP_SHARED_SECRET` | Legacy only. App Store Connect → app → App-Specific Shared Secret. Used for old StoreKit 1 base64 receipts. |
| `GOOGLE_PLAY_PACKAGE_NAME` | Android `applicationId` (same as Play Console package) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full JSON for a service account with **Google Play Android Developer** access |

**iOS uses StoreKit 2** (react-native-iap v14). The app sends the transaction
**JWS** (`receipt.ios.jws`). It is verified with `jose` (Web Crypto, Deno-native)
against Apple's certificate chain with root pinning — no App Store shared secret
and no client receipt refresh (the refresh caused the repeated "Sign in to Apple
Account" purchase loop). Note: the Node-only `@apple/app-store-server-library`
returns `VERIFICATION_FAILURE` on the Deno Edge runtime, so it is intentionally
not used. The legacy `receipt.ios.receipt_data_base64` path still works for older
app builds.

`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, and `SUPABASE_SECRET_KEYS` are provided automatically (legacy anon/service_role still supported).

## Request body

All actions require `shop_item_id` (UUID from `shop_items.id`).

### `fulfill_spark_pack`

- `platform`: `"ios"` | `"android"`
- `receipt.ios.jws`: StoreKit 2 transaction JWS (`purchase.purchaseToken`) — preferred
- `receipt.ios.receipt_data_base64`: legacy StoreKit 1 App Store receipt (base64) — fallback
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
