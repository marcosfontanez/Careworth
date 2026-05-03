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

4) Test in app: Edit Profile > Status > Apple Music search (catalog).

Spotify (client-only): add EXPO_PUBLIC_SPOTIFY_CLIENT_ID to EAS Environment Variables or local .env; Spotify Dashboard redirect URI: pulseverse://spotify
