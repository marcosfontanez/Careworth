# Launch checklist — hosting & EAS

Host these files on **`https://pulseverse.app`** (or your production marketing domain) so App Links / Universal Links verify. Paths are fixed by Apple and Google.

## 1. Apple Universal Links

**Serve at:** `https://pulseverse.app/.well-known/apple-app-site-association`  
**Requirements:** `Content-Type: application/json` (no `.json` extension), **HTTPS**, no redirects.

Replace `TEAMID` with your [Apple Developer Team ID](https://developer.apple.com/account/#/membership/) and ensure `paths` match routes you want to open in-app.

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.pulseverse.app",
        "paths": ["*", "/feed/*", "/post/*", "/profile/*", "/legal/*"]
      }
    ]
  }
}
```

After deploy, verify with [Apple’s CDN](https://search.developer.apple.com/appsearch-validation-tool/) or:

```bash
curl -sI "https://pulseverse.app/.well-known/apple-app-site-association"
```

## 2. Android App Links

**Serve at:** `https://pulseverse.app/.well-known/assetlinks.json`

Replace `YOUR_SHA256` with the signing certificate fingerprint from Play Console (App signing) or `eas credentials`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.pulseverse.app",
      "sha256_cert_fingerprints": ["YOUR_SHA256"]
    }
  }
]
```

## 3. EAS environment (production)

Prefer **[EAS Environment Variables](https://docs.expo.dev/build-reference/variables/)** for secrets instead of committing them in `eas.json`.

| Variable | Purpose |
| -------- | ------- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_VIDEO_EXPORT_URL` | Optional; Fly export worker base URL |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional; Sentry React Native DSN |
| `EXPO_PUBLIC_SENTRY_ENABLE_DEV` | Set `1` only to send dev-build events |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Overrides default `support@pulseverse.app` in Settings |
| `EXPO_PUBLIC_MARKETING_SITE` | Base marketing URL (future deep links) |
| `EXPO_PUBLIC_TERMS_URL` | If set, Settings → Terms opens browser |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | If set, Settings → Privacy opens browser |
| `EXPO_PUBLIC_LIVE_STREAMING` | Set `1` for TestFlight/App Store builds so Live tab + Go Live appear (`lib/featureFlags.ts`; dev builds default on via `__DEV__`). Root `eas.json` sets this for **preview** and **production** profiles. |

Sentry: create a project at [sentry.io](https://sentry.io), add the React Native DSN, then add `EXPO_PUBLIC_SENTRY_DSN` in EAS. New native build required after adding `@sentry/react-native` (already in `app.json` plugins).

## 4. App Store Connect (`eas submit`)

Replace placeholders in root `eas.json` under `submit.production`:

- `appleId`, `ascAppId`, `appleTeamId`
- Android: service account JSON path and desired `track`

## 5. Live / Sparks (post–v1)

In **`lib/featureFlags.ts`**, `liveStreaming` defaults **on** only in **development** (`__DEV__`). **Release** builds need **`EXPO_PUBLIC_LIVE_STREAMING=1`** at EAS build time (see §3 table); otherwise the Live tab shows the “Coming after launch” placeholder.

- `liveStreaming` — Live tab, `/live/*`, Create → Go Live
- `feedCreatorGifting` — Feed rail creator gifts (`FeedActionRail` / `VideoFeedPost`); baseline QA doc: `docs/GIFT_SYSTEM_PHASE0_BASELINE.md`

In-app **Admin → Feature flags** toggles are **per device** only (Zustand); they do **not** replace build-time env for TestFlight. To ship Live widely, keep **`EXPO_PUBLIC_LIVE_STREAMING=1`** on **preview** / **production** EAS profiles (already in root `eas.json`).
