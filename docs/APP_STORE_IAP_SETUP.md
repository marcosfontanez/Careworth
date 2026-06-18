# App Store Connect — Sparks & border IAP

Pulse Shop reads product IDs from **`shop_items.store_product_id_ios`**. They must match **App Store Connect → your app → Monetization → In-App Purchases** exactly (case-sensitive).

Bundle ID: **`com.pulseverse.app`**

## Spark packs (Consumable)

Create each as **Consumable** in App Store Connect:

| Catalog slug | Sparks | Product ID (iOS) |
|--------------|--------|------------------|
| `sparks-100` | 100 | `com.pulseverse.sparks.100.ios` |
| `sparks-500` | 500 | `com.pulseverse.sparks.500.ios` |
| `sparks-1200` | 1,200 | `com.pulseverse.sparks.1200.ios` |
| `sparks-2500` | 2,500 | `com.pulseverse.sparks.2500.ios` |
| `sparks-6500` | 6,500 | `com.pulseverse.sparks.6500.ios` |

Until a product exists and is **Ready to Submit** / available in sandbox, the app shows “not available from the App Store” for that pack.

## Backend (required for credits after payment)

1. **Supabase → Edge Functions → Secrets**
   - `APPLE_IAP_SHARED_SECRET` — App Store Connect → app → App Information → App-Specific Shared Secret
2. Deploy: `npx supabase functions deploy pulse-shop-fulfillment`
3. Verify sandbox purchase inserts `purchase_receipts` with `validation_status = valid`.

## Sandbox testing

1. **App Store Connect → Users and Access → Sandbox → Testers** — create a sandbox Apple ID.
2. On device: **Settings → App Store → Sandbox Account** — sign in with that tester (not your real Apple ID).
3. Install a **development or TestFlight** build (not Expo Go).
4. Buy a pack in Pulse Shop → Sparks.

### iOS password loop troubleshooting (TestFlight)

- TestFlight IAP uses the **Sandbox** environment.
- Sign into **Settings → App Store → Sandbox Account** (Developer sandbox tester).
- If Apple keeps asking for your password when opening Pulse Shop, sign out of **Media & Purchases** for your production Apple ID on the device, then retry with the sandbox tester only.
- Use a **fresh sandbox tester** if the loop persists (stuck unfinished transactions).
- Confirm **Paid Apps Agreement** is Active in App Store Connect → Business.
- Opening Pulse Shop should **not** prompt for a password — only tapping **Purchase** should open Apple’s sheet.
- Stuck Sparks after payment: **Settings → Restore purchases** or Pulse Shop pack dialog → **Recover Sparks** (do not buy again).
- Staff: copy StoreKit diagnostics from Pulse Shop → Sparks staff banner (dev/admin builds).

## Common errors

| What you see | Cause | Fix |
|--------------|-------|-----|
| “isn’t available from the App Store…” | Product ID missing in ASC or not linked to this app version | Create consumable with exact ID; wait up to a few hours for propagation |
| “Duplicate purchase update skipped…” | Earlier payment succeeded but Sparks were not granted (server secret missing, network, etc.) | Set `APPLE_IAP_SHARED_SECRET`, reopen Pulse Shop (auto-recovery), or **Settings → Restore Purchases** |
| Payment OK, balance unchanged | `pulse-shop-fulfillment` rejected receipt | Check function logs; confirm secret and migrations applied |

Staff: in Pulse Shop → Sparks tab, **Staff: view store product IDs** copies the live catalog IDs from Supabase.
