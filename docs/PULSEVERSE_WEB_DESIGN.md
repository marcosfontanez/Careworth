# PulseVerse Web — Design Direction (official)

This is the canonical visual + layout direction for the native Next.js `/web-app`
experience under `web/`. All web-app surfaces should converge on this system.

## North-star mockups

| Surface | Mockup |
| --- | --- |
| Feed (short-form video theater) | `docs/design/web/pulseverse-web-video-feed-mockup.png` |
| My Pulse / Pulse Page | `docs/design/web/pulseverse-web-my-pulse-mockup.png` |
| Creator Hub | `docs/design/web/pulseverse-web-creator-hub-mockup.png` |
| Circles | `docs/design/web/pulseverse-web-circles-mockup.png` |

## Core principles

PulseVerse Web is a **premium dark-mode healthcare-social short-form VIDEO platform** —
not a stacked social card feed (not Facebook / LinkedIn / Reddit).

- **Layout:** consistent 3-column shell on every signed-in surface —
  **left nav rail** (Feed, Circles, Live, My Pulse, Creator Hub, Notifications, Settings) ·
  **center content** · **right contextual rail** (trending circles, suggested creators,
  safety, get-the-app). Slim glass **top bar** (logo + wordmark, search, Create, account chip).
- **Visual system:** luxury dark mode (near-black navy `#020617`–`#0a1224`, layered
  gradients + faint teal radial glow), neon-glass translucent panels with ~1px cyan/teal
  hairline borders, soft layered shadows, rounded 20–28px corners. Accents: electric
  cyan/teal (`#2DD4BF`, `#22D3EE`) and electric blue/purple (`#6366F1`, `#8B5CF6`); gold
  reserved for featured / premium / verified. See `.cursor/rules/pulseverse-design-system.mdc`.
- **Feed is a video theater:** one centered **9:16 vertical** player at a time, cinematic
  blurred backdrop, floating **For You / Following / Top Today** tabs, lower-left creator +
  caption + sound overlay, compact glass action rail on the video's right edge (collapsed →
  bordered avatar + chevron; expanded → like / comments / share / sound / more), slim
  progress bar. Navigation via wheel / keyboard / swipe / chevrons.
- **Media everywhere is vertical:** profile + creator-hub thumbnails are **9:16 portrait
  tiles**, never wide article cards.

## Surface notes

- **My Pulse / Pulse Page:** gradient banner, avatar with premium glowing ring + earned
  caption badge (e.g. "Class of 2026"), verified name, identity chips, bio, stats strip
  (Followers / Following / Pulse Score + tier), a 9:16 posts grid, and a Pulse Updates column.
- **Creator Hub:** premium create tiles (Upload Video, Go Live, B-roll Studio, Clip Studio,
  New Post), an analytics strip (real owner stats), recent uploads grid (9:16 tiles).
  Creation actions deep-link to the native app until web posting ships.
- **Circles:** a featured **pinned** circle card first (e.g. "App Suggestions"), then a glass
  grid of circle cards with icon, member count, description, and a View action; client-side
  search. Confession / anonymous circles never expose identity.

## Non-negotiables (privacy + safety)

Every surface preserves the native-web protections: no draft/scheduled content, no
queued/running/failed media for visitors, no anonymous/confession identity leakage, no
private content leakage, blocked users excluded, hidden creators excluded. Only show
interactions that are wired (auth-gated, RLS-safe); otherwise show read-only counts or
deep-link to the app — never a broken button.
