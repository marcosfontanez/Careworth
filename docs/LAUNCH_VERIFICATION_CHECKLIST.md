# PulseVerse — Final External Setup + Launch Verification Checklist

> Source of truth: the latest launch-blocker repair report (migrations 243–249, IAP refund
> pipeline, role_admin lockdown, gift block guard, Live/clipping readiness).
>
> **Manual checklist.** No code changes. Apply on **staging first**, then **production**.
> Never paste secret values into chat, commits, or this file.

---

## 0. USER-SUPPLIED VALUES (placeholders you must replace)

Every `UPPERCASE_PLACEHOLDER` / `<angle>` / `your-…` token below is a **USER-SUPPLIED VALUE**.
Replace it with your real value before running the command. Where to find each:

| Placeholder in this doc | What it is | Where you find it |
|---|---|---|
| `STAGING_REF` / `PROD_REF` / `<REF>` | Supabase project **Reference ID** (per environment) | Supabase Dashboard → your project → **Project Settings → General → Reference ID** |
| `https://STAGING.supabase.co` / `https://PROD.supabase.co` | Supabase **Project URL** | Supabase Dashboard → **Project Settings → Data API → Project URL** |
| `<service_role_key>` | Supabase **service_role** secret (server only — never in the app) | Supabase Dashboard → **Project Settings → API Keys → service_role** (reveal/copy) |
| `YOUR_SECRET` (Section 4) | The value you choose for `NOTIFY_PUSH_WEBHOOK_SECRET` | You generate it (e.g. `openssl rand -hex 24`); store once in the function secret + DB webhook header |
| `YOUR_IAP_REFUND_WEBHOOK_SECRET` (Section 9) | The value you choose for `IAP_REFUND_WEBHOOK_SECRET` | You generate it; store in the function secret + the Pub/Sub push URL |
| `wss://your-project.livekit.cloud` | LiveKit **WebSocket/Project URL** | LiveKit Cloud → your project → **Settings → Keys** (Project URL) |
| `play-rtdn` | A Pub/Sub **topic name you choose** | You name it when creating the topic (any lowercase name) |
| `pulseverse-creator-media` | The Fly.io worker **app name** (already real) | Defined in `fly.creator-media-worker.toml` (`app = '…'`). Only change if you renamed it |

**Fixed (already real — do NOT change):**
- App identifier (Android `package` + iOS `bundleIdentifier`): **`com.pulseverse.app`**
- EAS project: owner **`care-worth`**, projectId **`45474eb0-9910-4871-974d-9bd110a724e1`**
- Deep-link scheme: **`pulseverse`**
- Storage buckets: **`post-media`** (clips/feed media), **`live-recordings`** (egress)
- Edge function names: `notify-expo-push`, `livekit-token`, `enqueue-creator-media-job`, `pulse-shop-fulfillment`, `iap-refund-webhook`, `livekit-egress`

---

## 1. Pre-deployment safety check

Run from `C:\Users\marco\CareWorth`:

```powershell
git status
git branch --show-current
git log --oneline -5
```
- [ ] Working tree is what you expect (uncommitted launch work present, no surprise files).

```powershell
npx tsc --noEmit                       # expect: no output, exit 0
cd web; npx tsc --noEmit; cd ..        # expect: no output, exit 0
npm run test                           # expect: 113 passed
npx eslint contexts/AuthContext.tsx services/supabase/profiles.ts app/admin/index.tsx services/shop/purchaseService.ts lib/shop/shopErrors.ts   # expect: clean
```
- [ ] Root + web typecheck clean.
- [ ] 113 tests pass.
- [ ] Targeted lint clean.

Confirm migrations exist locally:
```powershell
dir supabase\migrations\24*.sql
```
- [ ] 243_secure_push_tokens_table.sql
- [ ] 244_restore_comments_disabled_insert_guard.sql
- [ ] 245_role_admin_rpc_and_anon_lockdown.sql
- [ ] 246_live_autoend_and_media_job_hardening.sql
- [ ] 247_role_admin_authenticated_lockdown.sql
- [ ] 248_iap_refund_revocation.sql
- [ ] 249_gift_block_guard.sql

**Files/functions affected this launch window**
- Profiles masking: `services/supabase/profiles.ts` (`PROFILE_COLUMNS`, `PROFILE_SELECT_WITH_AVATAR_FRAME`), `contexts/AuthContext.tsx`, `lib/database.types.ts`.
- Admin auth → RPC: web `middleware.ts`, `admin/moderation-auth.ts`, `staff-preferences-actions.ts`, `appeal-actions.ts`, `(console)/{avatar-borders,leads,platform,shop-catalog}/actions.ts`, `admin/queries.ts`; mobile `app/admin/index.tsx`, `app/admin/_layout.tsx`, `services/supabase/posts.ts`.
- Refund/gift: `supabase/functions/iap-refund-webhook/index.ts`, `supabase/functions/_shared/pulse-shop/responses.ts`, `services/shop/purchaseService.ts`, `lib/shop/shopErrors.ts`.
- RPCs/triggers: `current_user_role_admin`, `admin_list_profiles`, `economy_revoke_purchase`, `economy_assert_gift_not_blocked` + 2 gift triggers, `end_stale_live_streams`.

- [ ] **No feature newly hidden or faked.** Items still OFF are either not-implemented (no UI shown) or implemented-but-waiting-on-external-service (listed below).

---

## 2. Supabase migration deployment

### Order & commands (staging first)
```powershell
# 1) Point CLI at STAGING
npx supabase link --project-ref STAGING_REF

# 2) See what is pending vs applied
npx supabase migration list

# 3) Apply pending migrations (243–249 included) in order
npx supabase db push
```
Then repeat for production:
```powershell
npx supabase link --project-ref PROD_REF
npx supabase migration list
npx supabase db push
```
> Alternative (if you apply by hand): open **Supabase Dashboard → SQL Editor**, paste each
> `24X_*.sql` file **in numeric order 243→249**, run one at a time.

### How to verify each migration (run in **SQL Editor**)

**243 — user_push_tokens exists & profiles.push_token is gone**
```sql
select to_regclass('public.user_push_tokens') as user_push_tokens;          -- not null
select count(*) as leftover_cols
from information_schema.columns
where table_schema='public' and table_name='profiles'
  and column_name in ('push_token','push_token_updated_at');                -- 0
```
- [ ] `user_push_tokens` not null, `leftover_cols` = 0.

**244 — comments_disabled blocks comment inserts**
```sql
select policyname, with_check
from pg_policies
where schemaname='public' and tablename='comments' and cmd='INSERT';
```
- [ ] An INSERT policy `with_check` references `comments_disabled` (post must not be comments-disabled).
- [ ] Functional: as a normal signed-in user, inserting a comment on a post with `comments_disabled=true` is rejected.

**245 + 247 — role_admin not readable by anon/authenticated**
```sql
select grantee, privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='profiles' and column_name='role_admin'
  and grantee in ('anon','authenticated');                                   -- 0 rows
```
- [ ] 0 rows (only owner/service_role can read the column).

**245/247 — current_user_role_admin works for admin**
Run while signed in as an **admin** (SQL Editor "Run as authenticated" / app session):
```sql
select public.current_user_role_admin();                                     -- true for admin
```
- [ ] Returns `true` for an admin, `false`/`null` for a non-admin.

**247 — admin_list_profiles works for admin, rejects non-admin**
```sql
select count(*) from public.admin_list_profiles(null, false, 10);            -- admin: rows
```
- [ ] Admin: returns rows. Non-admin: raises `not authorized` (errcode 42501).

**246 — end_stale_live_streams exists**
```sql
select to_regprocedure('public.end_stale_live_streams()');                   -- not null
```
- [ ] Not null.

**246 — creator_media_jobs cannot be forged by clients**
```sql
select policyname, cmd, with_check, qual
from pg_policies where schemaname='public' and tablename='creator_media_jobs';
```
- [ ] UPDATE policy restricts owner updates to `status in ('queued','cancelled')`.
- [ ] INSERT policy restricts `kind` to implemented kinds.
- [ ] Functional: as a normal user `update creator_media_jobs set status='succeeded'` is rejected.

**248 — purchase_receipts has refund columns**
```sql
select count(*) from information_schema.columns
where table_schema='public' and table_name='purchase_receipts'
  and column_name in ('refunded_at','refund_reason');                        -- 2
```
- [ ] = 2.

**248 — economy_revoke_purchase exists & service-role only**
```sql
select to_regprocedure('public.economy_revoke_purchase(text,text,text)');    -- not null
select grantee, privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name='economy_revoke_purchase';
```
- [ ] Not null; execute granted only to `service_role` (and owner). `public`/`authenticated` absent.

**249 — gift block guard exists**
```sql
select tgname from pg_trigger
where tgname in ('creator_gifts_block_guard','border_gifts_block_guard');     -- 2 rows
```
- [ ] 2 triggers present.

### Rollback / mitigation per migration
| Migration | If it causes a problem | Mitigation |
|---|---|---|
| 243 | Push tokens stop saving | Verify `lib/notifications.ts` deployed; worst case recreate `profiles.push_token` and backfill from `user_push_tokens` |
| 244 | Legit comments blocked | Confirm post isn't `comments_disabled`; drop/recreate the INSERT policy |
| 245 | Anon profile reads fail | `grant select (<safe cols>) on public.profiles to anon;` |
| 247 | **Admin lockout / profile load fails** | Instant fix: `grant select on public.profiles to authenticated;` (restores reads; re-tighten after) |
| 246 | Live/jobs misbehave | `drop function end_stale_live_streams();` / restore prior `creator_media_jobs` policies |
| 248 | Revoke errors | `drop function economy_revoke_purchase(text,text,text);` (additive; safe to drop) |
| 249 | Legit gifts blocked | `drop trigger creator_gifts_block_guard on public.creator_gifts;` (+ border one) |

---

## 3. Supabase Edge Function deployment

Deploy in this order (from repo root, after `npx supabase link --project-ref <REF>`):
```powershell
npx supabase functions deploy notify-expo-push
npx supabase functions deploy livekit-token
npx supabase functions deploy enqueue-creator-media-job
npx supabase functions deploy pulse-shop-fulfillment
npx supabase functions deploy iap-refund-webhook --no-verify-jwt
npx supabase functions deploy livekit-egress            # only if recording/egress is used
```
Set secrets in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or `npx supabase secrets set NAME=value`).

| Function | Required secrets | Verify | Failure looks like |
|---|---|---|---|
| `notify-expo-push` | `NOTIFY_PUSH_WEBHOOK_SECRET`, `EXPO_ACCESS_TOKEN` | Section 4 tests | 401 on unsigned POST; 503 if secret unset |
| `livekit-token` | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Section 5 host/viewer test | 503 if env missing; 503 fail-closed if joinability RPC errors |
| `enqueue-creator-media-job` | (uses Supabase service env) | enqueue a trim job → row in `creator_media_jobs` | Rejects unsupported `kind` with 400 |
| `pulse-shop-fulfillment` | `APPLE_IAP_SHARED_SECRET` (iOS), `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Android) | Section 8 sandbox purchase | 503 `STORE_NOT_CONFIGURED` if store env missing |
| `iap-refund-webhook` | `IAP_REFUND_WEBHOOK_SECRET`; iOS also `APPLE_ASSN_ISSUER_ID`, `APPLE_ASSN_KEY_ID`, `APPLE_ASSN_PRIVATE_KEY`, `APPLE_ASSN_BUNDLE_ID` | Section 9 refund test | 503 if webhook secret unset; 401 if `?secret=` mismatch |
| `livekit-egress` | `LIVEKIT_URL/API_KEY/API_SECRET`, `LIVE_RECORDINGS_BUCKET` (default `live-recordings`), `STORAGE_S3_ACCESS_KEY_ID`, `STORAGE_S3_SECRET_ACCESS_KEY`; optional `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION` (endpoint auto-derived from built-in `SUPABASE_URL`) | Section 6 | 5xx if LiveKit/S3 creds missing |

Confirm deployment:
```powershell
npx supabase functions list
```
- [ ] All functions show as deployed with recent timestamps.

---

## 4. Push notification setup

Set in **Edge Functions → Secrets**:
- [ ] `NOTIFY_PUSH_WEBHOOK_SECRET` = a long random string (e.g. 32+ chars).
- [ ] `EXPO_ACCESS_TOKEN` = from **expo.dev → Account → Access tokens**.

Set the DB webhook header in **Supabase Dashboard → Database → Webhooks** (the webhook that calls `notify-expo-push`):
- [ ] Add HTTP header **`x-webhook-secret`** = same value as `NOTIFY_PUSH_WEBHOOK_SECRET`.

**Test signed vs unsigned:**
```powershell
# Unsigned -> must be rejected (401)
curl -i -X POST "https://PROD.supabase.co/functions/v1/notify-expo-push" -H "content-type: application/json" -d "{}"
# Signed -> accepted (200/handled)
curl -i -X POST "https://PROD.supabase.co/functions/v1/notify-expo-push" -H "content-type: application/json" -H "x-webhook-secret: YOUR_SECRET" -d "{}"
```
- [ ] Unsigned → **401**. Signed → not 401.

**Confirm tokens read from user_push_tokens:** sign in on a device, then:
```sql
select user_id, platform, updated_at from public.user_push_tokens order by updated_at desc limit 5;
```
- [ ] Your device's row appears.

- [ ] **Blocked actor → no push:** User A blocks User B; B triggers a notification toward A (like/comment) → A receives **no** push.
- [ ] **Generic copy:** trigger a comment/reply notification → push body is generic (e.g. "New activity on your post"), **not** the raw comment text.

---

## 5. LiveKit setup

Get values from **LiveKit Cloud → Project → Settings → Keys** (or self-host).

Set in **Edge Functions → Secrets**:
- [ ] `LIVEKIT_URL` = `wss://your-project.livekit.cloud`
- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET` (server only — never in the app bundle)

Set in **EAS build env** (`eas.json` build profile, or EAS dashboard env):
- [ ] `EXPO_PUBLIC_LIVEKIT_URL` = same WSS URL as `LIVEKIT_URL`
- [ ] `EXPO_PUBLIC_LIVE_STREAMING=1` **only after** the tests below pass on staging.

**Staging verification:**
- [ ] **Host test:** start a live from a host build → camera/mic preview shows; stream appears in Happening Now.
- [ ] **Viewer test:** second account joins → sees host video, viewer count increments.
- [ ] **Token fail-closed test:** temporarily make the viewer ineligible (e.g. blocked / private) → token request returns **503/denied**, no token minted.
- [ ] **End live test:** host ends → viewers get the ended state; row `status='ended'`.
- [ ] **Stale cleanup test:** leave a stream `status='live'` with old heartbeat, then run:
```sql
select public.end_stale_live_streams();
select id, status from public.live_streams where status='live';   -- stale ones cleared
```

---

## 6. LiveKit egress + clipping

- [ ] In **LiveKit Cloud**, ensure **Egress** is enabled for the project (LiveKit Cloud projects have egress enabled by default; for self-host you must run the egress service).
- [ ] Get the Supabase **S3 connection** values from **Supabase Dashboard → Project Settings → Storage → S3 Connection**: under **S3 Access Keys** create a key → `STORAGE_S3_ACCESS_KEY_ID` + `STORAGE_S3_SECRET_ACCESS_KEY` in **Edge Functions → Secrets** (names must **not** start with `SUPABASE_`). Optional: `STORAGE_S3_REGION`; endpoint is auto-derived — only set `STORAGE_S3_ENDPOINT` if uploads fail.
- [ ] Storage bucket **`live-recordings`** exists (Supabase → Storage → **New bucket**). Create it if missing.
- [ ] Storage bucket **`post-media`** exists (feed clips/trim output land here).
- [ ] Verify bucket policies allow the worker/service role to write and signed/public read as intended.

**Clip flow tests:**
- [ ] **Create clip:** from a live or feed video → clip job enqueued (`creator_media_jobs` row appears).
- [ ] **Publish to feed:** processed clip publishes; appears in feed with `media_url` set.
- [ ] **Download clip:** if the creator allows downloads (`default_allow_clip_downloads`), the download succeeds; if not allowed, the option is hidden.
- [ ] **Failure-state test:** submit a bad/oversized source → job fails with a clear error state in the UI (not a silent hang).

**Flag after success (EAS build env):**
- [ ] `EXPO_PUBLIC_FEED_CLIPPING=1`

---

## 7. Creator media worker (Fly.io)

```powershell
cd C:\Users\marco\CareWorth
fly deploy -c fly.creator-media-worker.toml
```
Secrets (server only):
```powershell
fly secrets set SUPABASE_URL="https://PROD.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" -a pulseverse-creator-media
```
- [ ] `SUPABASE_URL` (no spaces), `SUPABASE_SERVICE_ROLE_KEY` set.

Health + logs:
```powershell
fly status -a pulseverse-creator-media
fly logs -a pulseverse-creator-media
```
- [ ] Health URL `https://pulseverse-creator-media.fly.dev/health` returns `ok`.
- [ ] Logs show `health listening on 8080` and idle "no queued ... jobs".

**Job-drain verification:**
- [ ] **Test trim job:** publish a feed clip → logs show `[worker] trim succeeded`; post gets `media_url`, `media_processing_status` cleared.
- [ ] **Test stitch job:** run a Combine-clips export → logs show `[worker] succeeded ... stitch`.
- [ ] **No stuck jobs:** `select id, kind, status, created_at from public.creator_media_jobs where status='queued' order by created_at limit 20;` → drains to `succeeded`/`failed`, not stuck `queued`.
- [ ] Run **one** worker fleet only (Fly OR local, not both).

**Flags after success (EAS build env):**
- [ ] `EXPO_PUBLIC_CREATOR_HUB_COMBINE_CLIPS=1`
- [ ] Other composition flags **only if** their `video_composition` QA passed: `EXPO_PUBLIC_CREATOR_BROLL_STUDIO`, `EXPO_PUBLIC_CREATOR_OVERLAY_PIP`, `EXPO_PUBLIC_CREATOR_GREEN_SCREEN_STUDIO`, `EXPO_PUBLIC_CREATOR_CUTOUT_OVERLAY`, `EXPO_PUBLIC_CREATOR_TEMPLATE_STUDIO`. Leave OFF otherwise (no fake UI).

---

## 8. IAP / store setup

**Product IDs — must exactly match `shop_items.store_product_id_ios` / `store_product_id_android`:**
```sql
select slug, type, store_product_id_ios, store_product_id_android, spark_amount, is_active
from public.shop_items
where type in ('spark_pack','border') and is_active = true
order by type, slug;
```
- [ ] Every active Sparks consumable has matching product IDs in **Google Play Console → Monetize → Products → In-app products**.
- [ ] (iOS, if launching) Every active product exists in **App Store Connect → your app → Monetization → In-App Purchases** (consumables for Sparks; non-consumables for borders).
- [ ] Premium border products created and priced.
- [ ] Retired/delisted borders: confirm restore still re-grants them (Section: restore test). Retired items must stay non-purchasable but restorable.

**Credentials:**
- [ ] **Google service-account JSON** from **Google Cloud Console → IAM & Admin → Service Accounts** (grant it access in **Google Play Console → Users and permissions**, with "View financial data / Manage orders") → paste the full JSON string into the `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` function secret.
- [ ] `GOOGLE_PLAY_PACKAGE_NAME` = **`com.pulseverse.app`** (this app's Android applicationId).
- [ ] (iOS) `APPLE_IAP_SHARED_SECRET` from **App Store Connect → your app → (left nav) App Information → App-Specific Shared Secret** (or the master shared secret under **Users and Access → Integrations → Shared Secret**).

**Tests:**
- [ ] **Sandbox purchase (Sparks):** buy a Sparks pack with a sandbox/test account → wallet credited; `purchase_receipts` row `validation_status='valid'`.
- [ ] **Restore purchase:** reinstall / Restore in Settings → owned borders re-granted (including retired ones); no "no purchases to restore" for a genuine owner.
- [ ] **Failed/reconcile test:** force a failed grant (e.g. mid-flow) → no double-charge, reconcile re-grants on next attempt; consume only after grant succeeds.
- [ ] **Border gift test:** gift a border to another @handle → recipient owns it; buyer charged once.

**Flag after success (EAS build env):**
- [ ] `EXPO_PUBLIC_FEED_CREATOR_GIFTING=1` (only after Sparks are purchasable, so gifts can be funded).

---

## 9. Refund / revocation setup

**Secret (Edge Functions → Secrets):**
- [ ] `IAP_REFUND_WEBHOOK_SECRET` = long random string.

**Google RTDN (Android):**
1. **Google Cloud Console → Pub/Sub → Topics** → create a topic (e.g. `play-rtdn`).
2. **Google Play Console → Monetize → Monetization setup → Real-time developer notifications** → set the topic name → **Send test notification**.
3. In Pub/Sub, add a **Push subscription** to that topic with endpoint:
   ```
   https://PROD.supabase.co/functions/v1/iap-refund-webhook?secret=YOUR_IAP_REFUND_WEBHOOK_SECRET
   ```
- [ ] Test notification reaches the function (check function logs).

**Apple ASSN V2 (only if iOS IAP launches):**
1. **App Store Connect → App → General → App Information → App Store Server Notifications** → set Production + Sandbox URL to:
   ```
   https://PROD.supabase.co/functions/v1/iap-refund-webhook
   ```
2. **App Store Connect → Users and Access → Integrations → Keys (In-App Purchase / App Store Server API)** → create a key.
- [ ] Set `APPLE_ASSN_ISSUER_ID`, `APPLE_ASSN_KEY_ID`, `APPLE_ASSN_PRIVATE_KEY` (full `.p8` PEM), `APPLE_ASSN_BUNDLE_ID`.
- [ ] If these are **not** set, iOS refund auto-revocation is intentionally skipped (fail-safe) — keep iOS IAP gated until set.

**Refund test plan:**
- [ ] **Android refund:** refund a sandbox order in Play Console → function logs show revoke; then:
```sql
select external_transaction_id, validation_status, refunded_at, refund_reason
from public.purchase_receipts where validation_status='refunded' order by refunded_at desc limit 5;
```
- [ ] `refunded_at` set, `validation_status='refunded'`.
- [ ] **Entitlement removed:** the refunded border no longer in `user_inventory` for that user; or Sparks clawed back:
```sql
select * from public.wallet_transactions
where source_type='purchase_receipt' and transaction_type in ('refund','reversal')
order by created_at desc limit 5;
```
- [ ] **Sparks clawback:** `spark_wallets.paid_sparks_balance` decreased by the clawed-back amount (never below 0; shortfall recorded in ledger metadata).
- [ ] **Idempotency:** re-send the same refund notification → second call returns `already_refunded`, **no** second deduction/removal (one ledger row only, by `idempotency_key 'refund:<receipt_id>'`).

---

## 10. Final feature flag checklist

All `EXPO_PUBLIC_*` flags are set in the **EAS build profile** (`eas.json` env, or EAS dashboard env per build). They are read at build time; staff can also toggle via **Admin → Feature flags** at runtime.

| Flag | Current (prod) | Launch value | Set where | Verify first | Emergency kill switch after launch? |
|---|---|---|---|---|---|
| `EXPO_PUBLIC_LIVE_STREAMING` | off | **1** | EAS env | Section 5 (host/viewer/fail-closed/end/stale) | Yes |
| `EXPO_PUBLIC_LIVE_FEED_INJECTION` | off | **1** | EAS env | Live verified (Section 5) | Yes |
| `EXPO_PUBLIC_FEED_CLIPPING` | off | **1** | EAS env | Section 6 + 7 (worker drains, clip publish) | Yes |
| `EXPO_PUBLIC_CREATOR_HUB_COMBINE_CLIPS` | off | **1** | EAS env | Section 7 stitch QA | Yes |
| `EXPO_PUBLIC_FEED_CREATOR_GIFTING` | off | **1** | EAS env | Section 8 (Sparks purchasable) | Yes |
| **Shop / IAP** | not flagged (always on) | on | n/a (store config) | Section 8 sandbox purchase | n/a — disable products in store consoles if needed |
| **Premium borders** | not flagged (always on) | on | n/a | Section 8 border purchase + gift | n/a |
| **Sparks / Diamonds economy** | not flagged (always on) | on | n/a | Section 8 + gift accounting | n/a |

Leave OFF (not implemented — no fake UI): `recorderGreenScreen`, `recorderEffects`, `creatorHubCoCreate`, `creatorHubFeedDiscussion`, `feedVideoRemixAdvanced`.

---

## 11. Final smoke test script

Run on a **release/staging build** with all external services configured.

**Auth & profile**
- [ ] Signup new account → profile created, lands in app shell.
- [ ] Logout / login → session restored.
- [ ] Profile loads (public + own); edit display name/avatar → saves and persists after refresh.
- [ ] Admin account → `/admin` loads (mobile + web), user list populates.
- [ ] Non-admin account → `/admin` redirects/denied; cannot read `role_admin`.

**Posts & feed**
- [ ] Create text post.
- [ ] Upload image post → renders.
- [ ] Upload video post → thumbnail + playback.
- [ ] Feed like / comment / save / share each work and persist.
- [ ] Top tab with no Top-Today content → shows empty state (does **not** silently show For You).

**Circles**
- [ ] Join a circle (web + mobile) → membership reflects; failed join shows error, not fake "joined".
- [ ] Comment/reply in a circle room after joining.
- [ ] Blocked user cannot reply (mobile + web shows clear blocked copy).
- [ ] My Circles (web) lists joined circles; cards navigate to the room.

**My Pulse / Pulse Page**
- [ ] My Pulse rolling feed + media hub (photos/videos/favorites) render.
- [ ] Pulse Page (public profile) loads; privacy enforced for private profiles.

**Safety**
- [ ] Report content (post/comment/profile/circle) from each surface.
- [ ] Block user → cannot interact where restricted; no self-report abuse; no duplicate-report weaponization.

**Notifications**
- [ ] In-app notifications list + unread counts; deep links open the right post/live room.
- [ ] Push notifications arrive; blocked actors produce none; copy is generic (no raw comment text).

**Monetization**
- [ ] Send gift (feed/post/profile/live/circle where UI exists) → recipient credited, creator Diamonds credited, buyer Sparks debited once.
- [ ] Gift to a blocked user → blocked with clean message.
- [ ] Buy Sparks (sandbox) → wallet credited.
- [ ] Buy premium border → owned + equippable.
- [ ] Gift premium border → recipient owns it.
- [ ] Restore purchase → re-grants owned (incl. retired) borders.
- [ ] Play refund → entitlement revoked / Sparks clawed back; duplicate refund = no double-revoke.
- [ ] (iOS, if launched) Apple refund → same as above via ASSN + Server API confirm.

**Live & clipping**
- [ ] Start live, join as viewer, live chat, end live.
- [ ] Stale live cleanup (`end_stale_live_streams()`) clears ghost rows.
- [ ] Create clip → publish to feed → download (if allowed).
- [ ] Worker drains trim/stitch jobs; failures show clear error states.

**Routes / layout**
- [ ] Web in-app post links go to `/web-app/post/[id]`; live notifications open the room.
- [ ] No 404s; signed-in users not dumped out of the app shell.
- [ ] Mobile tab/stack routes all resolve.
- [ ] Responsive web layout (desktop + mobile width) is clean, no horizontal overflow.

---

## 12. Final launch decision table

| Feature | Code ready | External setup ready | Smoke tested | Launch status | Exact blocker if not ready |
|---|---|---|---|---|---|
| role_admin protection | Yes | Apply 245+247 | ☐ | Ready on migrate | Run migrations 245, 247 |
| Push notifications | Yes | ☐ | ☐ | Blocker until setup | `NOTIFY_PUSH_WEBHOOK_SECRET`, `EXPO_ACCESS_TOKEN`, DB webhook header |
| Feed / posts / comments | Yes | None | ☐ | Ready | — |
| Circles / My Circles | Yes | None | ☐ | Ready | — |
| My Pulse / Pulse Page | Yes | None | ☐ | Ready | — |
| Reporting / blocking / moderation | Yes | None | ☐ | Ready | — |
| Live streaming | Yes | ☐ | ☐ | Blocker until setup | LiveKit URL/key/secret + `EXPO_PUBLIC_LIVE_STREAMING=1` |
| Live feed injection | Yes | ☐ | ☐ | Blocker until live verified | Same as Live |
| Live clipping | Yes | ☐ | ☐ | Blocker until setup | Egress + worker + `EXPO_PUBLIC_FEED_CLIPPING=1` |
| Creator Hub combine/stitch | Yes | ☐ | ☐ | Blocker until setup | Worker deployed + `EXPO_PUBLIC_CREATOR_HUB_COMBINE_CLIPS=1` |
| Creator media worker | Yes | ☐ | ☐ | Blocker until deployed | Fly deploy + service-role secret |
| Shop / IAP (Sparks/borders) | Yes | ☐ | ☐ | Blocker until store setup | Store products + Google SA JSON / Apple secret |
| Feed creator gifting | Yes | ☐ | ☐ | Blocker until Sparks live | `EXPO_PUBLIC_FEED_CREATOR_GIFTING=1` after Section 8 |
| Premium borders | Yes | ☐ | ☐ | Blocker until store setup | Border products in stores |
| Sparks / Diamonds economy | Yes | ☐ | ☐ | Blocker until store setup | Spark consumables in stores |
| IAP refund — Android | Yes | ☐ | ☐ | Blocker until RTDN setup | `IAP_REFUND_WEBHOOK_SECRET` + Pub/Sub push URL |
| IAP refund — iOS | Yes (gated) | ☐ | ☐ | Blocker if iOS IAP launches | `APPLE_ASSN_*` + ASSN V2 URL |

Mark each ☐ as you complete it. A feature is **launch-ready** only when Code + External + Smoke are all checked.
