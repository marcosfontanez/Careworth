# Shop Live — commerce next steps (not implemented in LiveKit sprint)

## What stays mocked / demo-only

- Product tray SKUs, pinned products, and seller “dock” controls are **curated demo data** (`liveDiscoveryDemos`, `mockLiveHubData`) unless separately productized.
- `liveShopService.requestCheckout` (and similar) returns **null / TODO** — there is **no in-stream checkout** path.

## What already benefits from real LiveKit

- Any `live_streams` row created through the real wizard uses **`video_provider = livekit`** and shares one **LiveKit room** (`livekit_room_name`) per stream.
- **Shop-tagged** streams are still “normal” streams from the video layer’s perspective; only merchandising is unfinished.

## Founder decisions before building commerce

1. **Merchant of record** — PulseVerse vs external Shopify / Stripe Checkout vs affiliate-only deep links.
2. **Catalog binding** — whether SKUs live in `shop_items`, a new `live_shop_listings` table, or external IDs only.
3. **Pinned product UX** — single pin vs carousel; host-only vs moderator.
4. **Inventory and pricing** — real-time stock, deal timers, spark discounts vs fiat checkout.
5. **Compliance** — disclosures, refund policy, healthcare marketing claims.

## Suggested schema / services (incremental)

| Piece | Purpose |
|-------|---------|
| `live_shop_sessions` or columns on `live_streams` | Links stream to catalog snapshot / deal mode |
| `live_shop_pins` | Ordered pinned SKUs with `pinned_at`, `unpinned_at` |
| `live_shop_events` | Telemetry: impression, add-to-tray, checkout_click |
| RPC `live_shop_checkout_intent` | Server-validated handoff URL or PaymentIntent (never trust client price) |
| Edge Function (example) `stripe-checkout-live` | Creates short-lived checkout sessions |

## Wiring order (when approved)

1. Persist pins + tray from host UI to Supabase (RLS: host-only writes).
2. Replace demo **HubShopLiveCard** hydration with DB joins.
3. Implement **checkout handoff** (external URL or native IAP / Stripe). Keep Sparks gifts on the existing economy RPCs.
