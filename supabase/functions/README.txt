Edge Functions — optional shared CORS (`_shared/edgeCors.ts`)

Set Supabase secret EDGE_CORS_ALLOWLIST to a single https origin if you want browser callers pinned to that Origin;
omit for `*` (default; React Native `invoke` often has no Origin). Used by: pulse-shop-fulfillment, apple-music-developer-token,
enqueue-creator-media-job, notify-expo-push, dispatch-scheduled, transcribe-creator-audio.

---

Push notifications (Edge Function: notify-expo-push)

1) Deploy (no JWT verification — for Database Webhooks):
   npx supabase functions deploy notify-expo-push --no-verify-jwt

2) Set secrets: EXPO_ACCESS_TOKEN (recommended),
   PUBLIC_SITE_URL (e.g. https://pulseverse.app), optional NOTIFY_PUSH_WEBHOOK_SECRET.
   Supabase URL + API keys (SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS) are auto-injected.

3) Create a Database Webhook on public.notifications INSERT → invoke this function.
   See supabase/functions/notify-expo-push/README.md for details.

---

Apple Music developer token (Edge Function: apple-music-developer-token)

1) Link project (once):
   npx supabase link --project-ref YOUR_PROJECT_REF

2) Set secrets (MusicKit key from Apple Developer):
   npx supabase secrets set APPLE_TEAM_ID=XXXXXXXXXX APPLE_KEY_ID=XXXXXXXXXX APPLE_P8_KEY="$(cat ./AuthKey_XXXXXXXXXX.p8)"
   Or paste PEM in dashboard: Project Settings > Edge Functions > Secrets.

3) Deploy:
   npx supabase functions deploy apple-music-developer-token

4) Callers must be **logged in**: `Authorization: Bearer <user access token>` plus `apikey` (both are sent when using `supabase.functions.invoke` from an authenticated Supabase client — see `lib/music/appleMusic.ts`).
   Unsigned requests get 401. Per-user rate limit inside the function reduces abuse (30 mint requests / minute / user per isolate).

5) Optional — restrict browser Origin when you expose this URL on the web:
   npx supabase secrets set EDGE_CORS_ALLOWLIST=https://your-domain.com

6) Test from the app while signed in using any flow that calls `searchAppleMusicSongs` (catalog API helper).

Spotify (client-only): add EXPO_PUBLIC_SPOTIFY_CLIENT_ID to EAS Environment Variables or local .env; Spotify Dashboard redirect URI: pulseverse://spotify

---

Pulse Shop fulfillment (Edge Function: pulse-shop-fulfillment)

1) Deploy (JWT required — user Bearer token):
   npx supabase functions deploy pulse-shop-fulfillment

2) Set secrets:
   npx supabase secrets set APPLE_IAP_SHARED_SECRET=xxxxxxxx
   npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME=com.your.app
   npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

3) Optional — same `EDGE_CORS_ALLOWLIST` secret as Apple Music (single web origin); omit for `*` (React Native).

4) App: call via `lib/pulseShopFulfillment.ts` — see supabase/functions/pulse-shop-fulfillment/README.md

---

LiveKit access tokens (Edge Function: livekit-token)

1) Set secrets (Dashboard → Project Settings → Edge Functions → Secrets, or CLI):
   npx supabase secrets set LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
   npx supabase secrets set LIVEKIT_API_KEY=xxxxxxxx
   npx supabase secrets set LIVEKIT_API_SECRET=xxxxxxxx

   LIVEKIT_URL must be the WebSocket URL shown in LiveKit Cloud (same project as the keys).

2) Deploy (JWT verification ON — default):
   npx supabase functions deploy livekit-token

3) App / EAS: set EXPO_PUBLIC_LIVEKIT_URL to the same WSS URL so the client selects the LiveKit video provider
   (see `services/live/videoProvider.ts`). Never put LIVEKIT_API_SECRET in the app bundle.

4) Callers: logged-in `supabase.functions.invoke('livekit-token', { body: { streamId } })` — see `services/live/liveKitToken.ts`.

---

LiveKit egress recording (Edge Function: livekit-egress)

1) Apply migration `205_live_recordings.sql` (table + private `live-recordings` bucket).

2) Create Supabase Storage S3 access keys (Project Settings → Storage → S3 Access Keys).

3) Set secrets:
   npx supabase secrets set LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
   npx supabase secrets set LIVEKIT_API_KEY=xxxxxxxx
   npx supabase secrets set LIVEKIT_API_SECRET=xxxxxxxx
   npx supabase secrets set STORAGE_S3_ACCESS_KEY_ID=xxxxxxxx
   npx supabase secrets set STORAGE_S3_SECRET_ACCESS_KEY=xxxxxxxx
   Optional: LIVE_RECORDINGS_BUCKET=live-recordings, STORAGE_S3_REGION=us-east-1
   (Do not use SUPABASE_* secret names — reserved by Supabase. Endpoint auto-derived from SUPABASE_URL.)

4) Deploy (JWT verification ON — default):
   npx supabase functions deploy livekit-egress

5) App: host broadcast ready → `startLiveRecording(streamId)`; end stream → `stopLiveRecording(streamId)` — see `services/live/liveRecordings.ts`.
   Failures are non-fatal; live continues if egress or storage is misconfigured.

---

Account deletion (Edge Function: delete-account)

1) Deploy (JWT verification ON — default):
   npx supabase functions deploy delete-account

2) App: Settings → Delete Account calls `lib/deleteAccount.ts` (Bearer user JWT + apikey).

3) Uses service role to `auth.admin.deleteUser`. profiles and most FK-linked rows cascade.
   Purchase/wallet audit rows may retain per schema ON DELETE rules — verify before marketing hard-delete.

4) Add `pulseverse://auth/reset-password` to Supabase Auth redirect URLs for native password reset.

---

Circle notification fan-out (migration 220 — legacy drain only)

Migration 221 digest supersedes new large-circle per-post fan-out. The queue table remains
for rows enqueued before 221; migration 222 schedules pg_cron to drain them when available:

  select public.process_circle_post_notification_fanout(10);

Or invoke the same RPC from a small Edge Function cron. Jobs are not exposed to mobile clients.

