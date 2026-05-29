# Google Play in-app products — PulseVerse Android

Audit reference for Sparks (consumable) and profile borders (non-consumable) on **com.pulseverse.app**.

## App / native stack

| Item | Status |
|------|--------|
| NPM package | `react-native-iap` (^14.x, OpenIAP / Play Billing via Nitro) |
| Expo config plugin | `react-native-iap` in `app.json` → adds **BILLING** permission + OpenIAP Gradle dep at prebuild |
| Client IAP module | `lib/shop/iap.native.ts` |
| Purchase orchestration | `services/shop/purchaseService.ts` |
| Launch SKU constants | `lib/shop/googlePlayProducts.ts` |
| Catalog DB | `shop_items.store_product_id_android` (migration **227**) |

### Billing permission

`com.android.vending.BILLING` is injected by the **react-native-iap** Expo config plugin during `expo prebuild` / EAS Build. It is also listed explicitly in `app.json` → `expo.android.permissions` for audit visibility.

The `/android` folder is gitignored; verify on a fresh prebuild:

```powershell
npx expo prebuild --platform android --no-install
Select-String -Path android\app\src\main\AndroidManifest.xml -Pattern "com.android.vending.BILLING"
```

## Play Console products (create before testing)

### Sparks (consumable)

| Product ID | Play type | PulseVerse catalog slug |
|------------|-----------|-------------------------|
| `sparks_100` | **Consumable** | `sparks-100` |
| `sparks_500` | **Consumable** | `sparks-500` |
| `sparks_1200` | **Consumable** | `sparks-1200` |
| `com.pulseverse.sparks.2500.android` | **Consumable** | `sparks-2500` |
| `com.pulseverse.sparks.6500.android` | **Consumable** | `sparks-6500` |

### Borders (one-time / non-consumable)

| Product ID | Play type | PulseVerse catalog slug |
|------------|-----------|-------------------------|
| `com.pulseverse.border.emerald_renewal_may_2026.android` | **One-time** | `border-emerald-renewal-may-2026` (through **May 31, 2026** 11:59 PM Eastern) |
| `com.pulseverse.border.pride_month_2026.android` | **One-time** | `border-pride-month-2026` (through **June 30, 2026** 11:59 PM Eastern) |
| `com.pulseverse.border.juneteenth_2026.android` | **One-time** | `border-juneteenth-2026-charity` (through **June 30, 2026** 11:59 PM Eastern) |

**Retired (do not create or sell):** `border_neon_blue`, `border_gold_pulse` — removed in migration **228**.

Product IDs are **case-sensitive** and must match exactly.

### Play Console steps

1. **Google Play Console** → **PulseVerse** → **Monetize** → **Products** → **In-app products**.
2. For each row above, click **Create product**.
3. Set **Product ID** to the exact string (e.g. `sparks_500`).
4. Set **Product type**: **Consumable** for Sparks, **One-time product** for borders.
5. Add title, description, and price tier.
6. **Activate** each product.
7. Upload a build to **Internal testing** (license testers must be on the tester list).
8. Set developer contact to **`googleplayreview@pulseverse.app`** (see `docs/OPERATIONAL_EMAIL_ADDRESSES.md`).

## Purchase flow (no fake purchases)

1. User taps buy in Pulse Shop → `purchaseService` reads `store_product_id_android` from `shop_items`.
2. `react-native-iap` runs real Play Billing (`fetchProducts` → `requestPurchase`).
3. App sends **purchase token** to Supabase Edge Function **`pulse-shop-fulfillment`** (never trusts client balances).
4. Edge function calls Google **Android Publisher API** (`purchases.products.get`) via `validate-google.ts`.
5. On success, RPC grants Sparks or border inventory; receipt stored in `purchase_receipts` (idempotent on `external_transaction_id`).
6. Client calls `finishTransaction` — consumables with `isConsumable: true`, borders with `false`.

## Backend verification (Supabase)

Deploy and configure before production purchases:

```powershell
npx supabase functions deploy pulse-shop-fulfillment
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.pulseverse.app
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Apply catalog migration:

```powershell
npm run db:push
```

### Service account requirements

- **Google Cloud**: enable **Google Play Android Developer API**.
- **Play Console** → **Users and permissions** → invite service account with release / financial access for `com.pulseverse.app`.
- Same JSON can power EAS Submit (`google-services.json`) and Supabase verification.

### Security checklist

- [ ] `pulse-shop-fulfillment` deployed with JWT verification (default).
- [ ] `GOOGLE_PLAY_*` secrets set in Supabase (not in the mobile app).
- [ ] `shop_items` Android IDs match Play Console (migrations **227** + **228** applied).
- [ ] Test purchase on **Internal testing** track with license tester account.
- [ ] Confirm `purchase_receipts` row + wallet/inventory update after test buy.
- [ ] Confirm duplicate token / order id does not double-grant (idempotency).

### Optional hardening (future)

- Server-side **consume** for consumables via Android Publisher API after successful grant (belt-and-suspenders if client `finishTransaction` fails).
- Play **Real-time developer notifications** (RTDN) for refund/chargeback handling.

## Testing notes

- IAP does **not** work in Expo Go — use EAS **development** or **production** Android build.
- Products can take **up to a few hours** to propagate after creation in Play Console.
- If `SKU_NOT_FOUND`, verify product is **Active**, app package matches, and tester is on internal track.
