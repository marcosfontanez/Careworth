# PulseVerse — launch runbook (Marco)

Use this as the **ordered checklist** to go from “code on `main`” to **TestFlight / soft launch**.  
Steps marked **YOU** require a browser dashboard or terminal on your machine. Steps marked **DONE IN REPO** are already in the codebase.

---

## Phase 0 — Before you start

| Item | Status |
|------|--------|
| Migrations **176–189** committed ( **181 parked** — do not apply until feed QA ) | DONE IN REPO |
| Universal link paths include `/feed/*`, `/live/*` | DONE IN REPO |
| `livekit-token` edge function in repo | DONE IN REPO |
| Launch docs + env templates | DONE IN REPO |

---

## Phase 1 — Production Supabase (YOU)

### 1. Link CLI to production

1. Open **Supabase** → your production project → **Project Settings** → **General** → copy **Reference ID**.
2. In PowerShell, from `C:\Users\marco\CareWorth`:

```powershell
npm run db:link
```

Paste the reference ID when prompted.

### 2. Apply migrations

```powershell
npm run db:push
```

**You should see** migrations through **190** apply.  
**Do not** copy `scripts/sql/parked/181_*` into `supabase/migrations/` until engineering signs off.

#### If `db push` tries to re-run migration 001 (`profiles already exists`)

Your production database was built before the CLI tracked history. **Do not** say yes to re-applying 001–175.

1. Mark existing history as applied (one-time):

```powershell
$versions = 1..175 | ForEach-Object { "{0:D3}" -f $_ }
npx supabase migration repair --status applied @versions
```

2. Run `npm run db:push` again — only **176–189** should remain.

#### If a mid-batch migration fails on production drift

Some prod databases already had partial manual changes. Re-run `npm run db:push` after pulling latest `main` (migrations 177+ include idempotent guards). Paste the error if it persists.

### 3. Auth redirect URLs

1. **Supabase** → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add (replace domain if different):

```
https://pulseverse.app/**
https://www.pulseverse.app/**
https://app.pulseverse.app/**
http://localhost:3000/**
pulseverse://auth/callback
pulseverse://auth/reset-password
```

### 4. Deploy edge functions (YOU)

From repo root, after `supabase link`:

```powershell
npx supabase functions deploy pulse-shop-fulfillment
npx supabase functions deploy livekit-token
npx supabase functions deploy delete-account
npx supabase functions deploy apple-music-developer-token
npx supabase functions deploy notify-expo-push --no-verify-jwt
npx supabase functions deploy dispatch-scheduled --no-verify-jwt
```

Full secret list: `supabase/functions/README.txt`.

**Minimum for shop IAP:**

```powershell
npx supabase secrets set APPLE_IAP_SHARED_SECRET=your_apple_shared_secret
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.pulseverse.app
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Minimum for real Live video (optional until you market Live):**

```powershell
npx supabase secrets set LIVEKIT_URL=wss://YOUR.livekit.cloud
npx supabase secrets set LIVEKIT_API_KEY=...
npx supabase secrets set LIVEKIT_API_SECRET=...
```

### 5. Push notifications webhook (YOU — optional for v1)

1. Deploy `notify-expo-push` (above).
2. **Supabase** → **Database** → **Webhooks** → create webhook on **`notifications` INSERT** → call `notify-expo-push`.
3. Details: `supabase/functions/notify-expo-push/README.md`.

### 6. Scheduled posts cron (YOU — optional)

Deploy `dispatch-scheduled`, set `DISPATCH_SCHEDULED_SECRET`, schedule a cron (Supabase or external) with header `x-cron-secret`. See function README.

### 7. Creator media worker (YOU — if stitch/B-roll posts matter)

On a small VPS or your PC while testing:

```powershell
# Requires ffmpeg + ffprobe on PATH
$env:SUPABASE_URL="https://YOUR.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
npm run worker:media
```

---

## Phase 2 — Vercel marketing site (YOU)

Project: **PulseVerse** Next.js (`web/`).

1. **Vercel** → project → **Settings** → **Environment Variables** → **Production**.
2. Copy every variable from `web/.env.example` (especially below).

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (contact form + admin metrics) |
| `NEXT_PUBLIC_SITE_URL` | Yes (`https://pulseverse.app`) |
| `NEXT_PUBLIC_*_EMAIL` (5) | Yes (or forward `@pulseverse.app` aliases) |
| `APPLE_UNIVERSAL_LINKS_APP_ID` | Yes for iOS links (`GF8CJ5XZB8.com.pulseverse.app` — verify Team ID) |
| `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS` | Yes for Android App Links |
| `NEXT_PUBLIC_EXPO_WEB_APP_URL` | If using `/web-app` embed |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Recommended (rate limits) |

3. **Deployments** → **Redeploy** production.

4. Verify universal links:

```powershell
curl -sI "https://pulseverse.app/.well-known/apple-app-site-association"
curl -s "https://pulseverse.app/.well-known/assetlinks.json"
```

Both should return **200** (AASA must not be 503).

---

## Phase 3 — Expo / EAS mobile (YOU)

1. **expo.dev** → your project → **Environment variables** → profile **production** (and **preview** if used).

| Variable | Required |
|----------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `EXPO_PUBLIC_LIVE_STREAMING` | Already `1` in `eas.json` — set `0` here only if LiveKit not ready |
| `EXPO_PUBLIC_LIVEKIT_URL` | Same WSS as `LIVEKIT_URL` secret (if Live on) |
| `EXPO_PUBLIC_SENTRY_DSN` | Recommended |
| `EXPO_PUBLIC_SUPPORT_EMAIL` etc. | Optional (defaults in code) |
| `EXPO_PUBLIC_TERMS_URL` / `PRIVACY_POLICY_URL` | Optional (opens web legal) |
| `EXPO_PUBLIC_VIDEO_EXPORT_URL` | Optional (export worker) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | If using Sentry source maps |

2. Build and submit (avoid duplicate build-number errors):

```powershell
# See recent builds + which build id is safe to submit
npm run eas:builds

npx eas-cli build --platform ios --profile production

# Submit by build id (copy id from eas:builds — do NOT reuse an id already in docs/eas-store-submissions.json)
npx eas-cli submit --platform ios --profile production --id PASTE_BUILD_ID_HERE

# After submit (success or fail), log it so we do not submit the same build twice:
npm run eas:log:ios -- PASTE_BUILD_ID_HERE 1.0.1 BUILD_NUMBER submitted
```

**Build numbers:** `eas.json` production profile has `"autoIncrement": true` — each **new** production build gets the next number. Re-running `eas submit` on the **same** build id fails with “build number already used”. Fix: check **TestFlight** first; if missing, run a **new** `eas build`, not another submit.

3. **TestFlight** → enable build for testers.

**Live flag note:** Production `eas.json` sets `EXPO_PUBLIC_LIVE_STREAMING=1`. Without `EXPO_PUBLIC_LIVEKIT_URL`, Live tab works but video stays in **mock/poster** mode. Either wire LiveKit or override the env var to `0` on EAS until ready.

---

## Phase 4 — Staff & email (YOU)

1. Forward or create mailboxes per `docs/OPERATIONAL_EMAIL_ADDRESSES.md`.
2. **Supabase** → **Table Editor** → `profiles` → set **`role_admin = true`** for staff accounts.
3. Sign in at `https://pulseverse.app/admin/login`.
4. Apply migration **189** before using **Leads / inquiries** CRM.

---

## Phase 5 — Store & legal (YOU)

1. **App Store Connect** — IAP products match `shop_items` store IDs.
2. **Google Play** — same for Android when shipping Play.
3. Have **counsel review** `/privacy` and `/terms` before large marketing push (`web/README.md`).
4. Play Console contact: **`googleplayreview@pulseverse.app`** (create + monitor).

---

## Phase 6 — Smoke test (YOU)

On a **physical iPhone** with the **new TestFlight build**:

- [ ] Sign up / sign in
- [ ] Feed scroll, like, comment
- [ ] Create a post
- [ ] Open profile, circles
- [ ] Swipe left on video → creator grid → tap video → scroll creator feed
- [ ] Settings → contact support mailto
- [ ] If shop enabled: sandbox IAP once
- [ ] If Live enabled + LiveKit: go live on Wi‑Fi, viewer joins on second device

---

## What we intentionally defer (post-launch)

- Migration **181** (feed ranking optimization)
- Live commerce checkout (Stripe / shop_orders)
- Host controls real-time metrics
- Full remote push without webhook setup
- `transcribe-creator-audio` production wiring

---

## Quick reference

| Doc | Purpose |
|-----|---------|
| `docs/launch/HOSTING_AND_EAS.md` | Hosting + EAS env table |
| `docs/OPERATIONAL_EMAIL_ADDRESSES.md` | Email aliases |
| `docs/ADMIN_WEB_STAFF_MANUAL.md` | Admin console |
| `supabase/functions/README.txt` | Edge function deploy |
| `web/.env.example` | Vercel variables |
| `.env.example` | Mobile variables |
