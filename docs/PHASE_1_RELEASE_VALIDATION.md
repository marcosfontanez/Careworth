# Phase 1 — release validation checklist

Use after deploying code from the Phase 1 remediation pass and before inviting beta testers.

See also: **`docs/LAUNCH_RUNBOOK.md`** (full launch order).

---

## A. Required Supabase Edge Functions

Deploy from repo root after `supabase link`:

```powershell
npx supabase functions deploy pulse-shop-fulfillment
npx supabase functions deploy livekit-token
npx supabase functions deploy delete-account
npx supabase functions deploy notify-expo-push --no-verify-jwt
npx supabase functions deploy dispatch-scheduled --no-verify-jwt
```

| Function | Purpose |
|----------|---------|
| **pulse-shop-fulfillment** | IAP receipt validation → Sparks / borders / creator gifts |
| **livekit-token** | Mint LiveKit host/viewer tokens for real live video |
| **delete-account** | Hard-delete `auth.users` (+ cascaded app data) for Settings → Delete Account |
| **notify-expo-push** | Push delivery when `notifications` rows are inserted (via webhook) |
| **dispatch-scheduled** | Promote scheduled posts to live (requires external cron) |

---

## B. Required Supabase secrets / dashboard config

### Edge Function secrets

```powershell
# Shop IAP (sandbox or production)
npx supabase secrets set APPLE_IAP_SHARED_SECRET=your_apple_shared_secret
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.pulseverse.app
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# LiveKit (only if marketing Live in beta)
npx supabase secrets set LIVEKIT_URL=wss://YOUR.livekit.cloud
npx supabase secrets set LIVEKIT_API_KEY=...
npx supabase secrets set LIVEKIT_API_SECRET=...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for Edge Functions.

### Auth redirect URLs

**Supabase → Authentication → URL Configuration → Redirect URLs** must include:

```
pulseverse://auth/reset-password
pulseverse://auth/callback
https://pulseverse.app/**
```

### Push webhook (recommended for beta)

1. Deploy `notify-expo-push`
2. **Database → Webhooks** → INSERT on `public.notifications` → invoke `notify-expo-push`
3. Details: `supabase/functions/notify-expo-push/README.md`

### Migrations

Apply through **191** (includes Phase 1 blockers + Phase 2 beta hardening):

```powershell
npm run db:push
```

---

## C. Required EAS / Expo environment variables

Set in **Expo → Project → Environment variables** for **preview** and **production** profiles:

| Variable | Required | Notes |
|----------|----------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** | `https://xxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Anon key from Supabase |
| `EXPO_PUBLIC_LIVEKIT_URL` | If Live enabled | Same WSS URL as `LIVEKIT_URL` secret; **required** for Live tab in release builds |
| `EXPO_PUBLIC_LIVE_STREAMING` | Optional | `=1` only when LiveKit URL is set; release builds auto-hide Live without URL |
| `EXPO_PUBLIC_LIVE_DISCOVERY_DEMOS` | Optional | Keep **unset** or `=0` in production |
| `EXPO_PUBLIC_SENTRY_DSN` | Recommended | Error monitoring |
| `EXPO_PUBLIC_MARKETING_SITE` | Recommended | `https://pulseverse.app` |

Rebuild iOS/Android after env changes:

```powershell
eas build --profile preview --platform all
```

---

## D. Production safety defaults (code-enforced)

| Setting | Expected in production |
|---------|------------------------|
| **Live tab** | Hidden in release builds unless `EXPO_PUBLIC_LIVE_STREAMING=1` **and** `EXPO_PUBLIC_LIVEKIT_URL` is set |
| **Demo live streams** | Off in release unless `EXPO_PUBLIC_LIVE_DISCOVERY_DEMOS=1` |
| **Creator tips** | Off (`creatorTips` feature flag default false) |
| **Legacy user_coins** | Client UPDATE revoked (migration 190) |
| **Reward celebration spoof** | `reward_delivery_enqueue_client` requires proof of grant (migration 190) |

---

## E. Smoke test checklist (manual)

Run on a **physical device** with an EAS preview/production build (not Expo Go).

### Auth & account lifecycle

- [ ] Email signup → login
- [ ] Forgot password email → tap link on device → set new password → login with new password
- [ ] Legal acknowledgment gate after OAuth signup
- [ ] Profile load failure shows retry (airplane mode test), not silent feed entry
- [ ] Delete test account in Settings → confirm gone from Supabase Auth users

### Notifications & social

- [ ] User A follows User B → B sees **new_follower** in bell
- [ ] Unfollow + refollow within 24h → no duplicate notification
- [ ] Comment on post → creator notified

### Safety

- [ ] User B blocks User A → A opens B’s profile URL → **Profile unavailable**
- [ ] A blocks B → A sees B with empty My Pulse / posts (viewer blocked)
- [ ] Report live stream → admin **Remove content** ends stream

### Live (if configured)

- [ ] With LiveKit URL + secrets: Go Live → second account joins
- [ ] Without LiveKit URL on release build: Live tab shows **Live unavailable**

### Commerce (sandbox)

- [ ] Spark pack IAP sandbox purchase credits wallet
- [ ] Send creator gift debits Sparks / credits diamonds

### Push (if webhook configured)

- [ ] Follow notification triggers device push
- [ ] Tap push opens correct screen

---

## F. Phase 1 still manual / not code-fixed

- Push webhook dashboard setup
- IAP product SKU alignment in App Store Connect / Play Console
- Creator media worker for stitch/B-roll (separate VPS)
- Scheduled posts cron for `dispatch-scheduled`
- Legal counsel review of terms/privacy
