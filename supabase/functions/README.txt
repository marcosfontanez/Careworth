Edge Functions — optional shared CORS (`_shared/edgeCors.ts`)

Set Supabase secret EDGE_CORS_ALLOWLIST to a single https origin if you want browser callers pinned to that Origin;
omit for `*` (default; React Native `invoke` often has no Origin). Used by: pulse-shop-fulfillment, apple-music-developer-token,
enqueue-creator-media-job, notify-expo-push, dispatch-scheduled, transcribe-creator-audio.

---

Push notifications (Edge Function: notify-expo-push)

1) Deploy (no JWT verification — for Database Webhooks):
   npx supabase functions deploy notify-expo-push --no-verify-jwt

2) Set secrets: SUPABASE_SERVICE_ROLE_KEY, EXPO_ACCESS_TOKEN (recommended),
   PUBLIC_SITE_URL (e.g. https://pulseverse.app), optional NOTIFY_PUSH_WEBHOOK_SECRET.

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
