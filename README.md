# PulseVerse

**Built for Healthcare Life.**

PulseVerse is a TikTok-style short-form social platform purpose-built for nurses, CNAs, patient care technicians, and bedside healthcare workers. It combines personalized content feeds, specialty-based communities, live streaming, and professional identity tools into a premium dark-themed mobile experience.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (SDK 54) |
| Language | TypeScript (strict) |
| Navigation | Expo Router v6 (file-based) |
| Styling | NativeWind (TailwindCSS) + StyleSheet |
| Server State | TanStack React Query v5 |
| Client State | Zustand v5 |
| Video | Expo Video |
| Images | Expo Image |
| Haptics | Expo Haptics |
| Icons | @expo/vector-icons (Ionicons) |
| Gradients | Expo Linear Gradient |
| Backend | Supabase (Auth, Database, Storage, Realtime) |

## Web deployment (Vercel)

There are **two** production deployments from this monorepo, with different roles:

1. **`pulseverse` → [pulseverse.app](https://pulseverse.app)** — The **Next.js marketing site** in `web/` (install, features, legal, etc.). Signed-in users have **`/me`** (account); from there, **“Browse in phone view”** goes to **`/web-app`**, which renders a **phone-style frame** and **iframes** the real app (see below).

2. **`careworth` → [careworth.vercel.app](https://careworth.vercel.app)** — The **Expo web export** of the React Native app (`npx expo export --platform web`). That build is *the app running in the browser* and is what users see inside the frame on **`pulseverse.app/web-app`**.

**Wiring:** Set **`NEXT_PUBLIC_EXPO_WEB_APP_URL`** on the **pulseverse** Vercel project to the **origin** of the Expo web deploy (e.g. `https://careworth.vercel.app` or a dedicated app subdomain), **no trailing slash**. CSP and embed headers for `/web-app` are configured in `web/next.config.ts` and `web/src/lib/web-app-embed-policy.ts`.

**Operational note:** Keep **`main` green** for **both** projects when you ship app changes the iframe relies on; a broken **careworth** export shows up as a blank or failed embed on **pulseverse.app/web-app**.

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Project Structure

```
PulseVerse/
├── app/                    # Expo Router screens & navigation
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── feed.tsx        # TikTok-style vertical feed
│   │   ├── communities.tsx # Community discovery
│   │   ├── create.tsx      # Content creation hub
│   │   ├── live.tsx        # Twitch-style live streaming
│   │   └── profile.tsx     # User profile
│   ├── auth/               # Authentication screens
│   ├── comments/           # Comments modal
│   ├── communities/        # Community detail [slug]
│   ├── create/             # Post creation flows
│   ├── live/               # Live stream viewer & go-live
│   ├── feed/               # Post detail [id]
│   ├── profile/            # Creator profile [id]
│   ├── notifications.tsx   # Notifications screen
│   └── search.tsx          # Search/discover screen
├── components/
│   ├── cards/              # Card components (Community, Comment, etc.)
│   ├── feed/               # Feed-specific components (VideoFeedPost, ActionRail)
│   ├── profile/            # Profile components (ProfileHeader)
│   └── ui/                 # Reusable UI primitives (badges, pills, search, etc.)
├── constants/              # App constants (roles, specialties, interests)
├── hooks/                  # React Query hooks
├── mock/                   # Mock data (creators, posts, communities, streams)
├── services/               # Service layer (feed, community, user, streams)
├── store/                  # Zustand stores
├── theme/                  # Design tokens (colors, spacing, typography)
├── types/                  # TypeScript domain models
└── utils/                  # Utility functions (formatting, etc.)
```

## Key Features

### Feed
- Full-screen vertical scroll (TikTok-style)
- Segment tabs: For You, Following, Friends, Top Today
- Smart ranking algorithm (engagement velocity, recency, affinity)
- Floating action rail (like, comment, save, share, follow)

### Communities (Reddit-style)
- 10 broad healthcare communities
- Upvote/downvote system, Hot/New/Top sorting
- Post type flair, about section with rules
- Search, trending topics, join/leave

### Live Streaming (Twitch-style)
- Featured live hero card
- Category chips, top creators
- Stream viewer with chat overlay
- Go live modal

### Create
- Video, Photo, Text Discussion, Anonymous Confession flows
- Community tagging, hashtag support

### Profile
- Dark premium profile card with badges
- Community memberships, tabbed content (Posts, Saved, Communities, Likes)
- Follower/Following stats, post grid

### Auth & onboarding
- Email, Google, and Apple sign-in
- Optional onboarding flows may ship in dedicated routes when enabled (see `app/` and release notes)

## Database types & migrations

After editing `supabase/migrations/*.sql`, regenerate client types and verify freshness locally:

```bash
npm run db:types
npm run db:types:check
```

(`db:types` needs `npx supabase login` or `SUPABASE_ACCESS_TOKEN`. CI does not run the mtime check because git checkouts do not preserve stable file timestamps.)

## EAS Android submit (Play Console)

`eas.json` uses **`serviceAccountKeyPath`: `./google-services.json`** for Android submit. That file must be your **Google Play Console service account JSON** (API access), not Firebase `google-services.json` unless you deliberately reuse the same file. Keep it **local or in EAS Secrets** — do not commit secrets.

## Security checklist (Supabase)

- **RLS / admin**: Moderation and admin RPCs gate on `profiles.role_admin` (e.g. migrations `002_reporting_analytics.sql`, `066_moderation_staff_notes_and_admin_delete.sql`, `149_profiles_lock_privilege_columns.sql`). Re-review when adding tables or client-callable RPCs.
- **Clients**: Only the **anon** Supabase key belongs in the mobile app; never ship `service_role` in client bundles.
- **Economy**: Production IAP flows use Edge fulfillment (`pulse-shop-fulfillment`). Live gifts debit **Sparks** (Pulse Shop balance).

## Dependencies

`npm audit` may show **PostCSS** advisories via Expo / Next transitive deps. Avoid **`npm audit fix --force`** — it can pin incompatible Expo/Next versions. Prefer upgrading Expo / Next when upstream clears the chain.

## Brand

| Token | Theme reference | Value |
|-------|-----------------|-------|
| Dark BG | `colors.dark.bg` | `#060E1A` |
| Dark Card | `colors.dark.card` | `#0F1C30` |
| Primary Navy | `colors.primary.navy` | `#0B1F3A` |
| Royal Blue | `colors.primary.royal` | `#1E4ED8` |
| Teal | `colors.primary.teal` | `#14B8A6` |
| Gold | `colors.primary.gold` | `#D4A63A` |

## License

Proprietary — PulseVerse © 2026
