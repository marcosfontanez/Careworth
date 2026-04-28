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
