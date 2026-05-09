# PulseVerse

**Built for Healthcare Life.**

PulseVerse is a TikTok-style short-form social platform purpose-built for nurses, CNAs, patient care technicians, and bedside healthcare workers. It combines personalized content feeds, specialty-based communities, live streaming, professional identity, and jobs discovery into a premium dark-themed mobile experience.

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
│   ├── jobs/               # Job detail [id]
│   ├── onboarding/         # Multi-step onboarding
│   ├── profile/            # Creator profile [id]
│   ├── notifications.tsx   # Notifications screen
│   └── search.tsx          # Search/discover screen
├── components/
│   ├── cards/              # Card components (Job, Community, Comment, etc.)
│   ├── feed/               # Feed-specific components (VideoFeedPost, ActionRail)
│   ├── profile/            # Profile components (ProfileHeader)
│   └── ui/                 # Reusable UI primitives (badges, pills, search, etc.)
├── constants/              # App constants (roles, specialties, interests)
├── hooks/                  # React Query hooks
├── mock/                   # Mock data (creators, posts, communities, jobs, streams)
├── services/               # Service layer (feed, community, job, user, streams)
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

### Auth & Onboarding
- Email, Google, and Apple sign-in
- 5-step onboarding flow

## Brand

| Token | Value |
|-------|-------|
| Dark BG | `#0A1628` |
| Dark Card | `#0F2035` |
| Primary Navy | `#0B1F3A` |
| Royal Blue | `#1E4ED8` |
| Teal | `#14B8A6` |
| Gold | `#D4A63A` |

## License

Proprietary — PulseVerse © 2026
