# PulseVerse Live — Closed Beta Launch Validation

Use this checklist after deploying migrations **194–195**, edge function **livekit-token**, and an EAS build with LiveKit env vars set.

## Prerequisites

| Item | Where | Value |
|------|-------|-------|
| `EXPO_PUBLIC_LIVE_STREAMING` | EAS env (preview + production) | `1` |
| `EXPO_PUBLIC_LIVEKIT_URL` | EAS env | `wss://<project>.livekit.cloud` |
| `LIVEKIT_URL` | Supabase Edge secrets | Same WSS URL |
| `LIVEKIT_API_KEY` | Supabase Edge secrets | LiveKit Cloud API key |
| `LIVEKIT_API_SECRET` | Supabase Edge secrets | LiveKit secret (never in app) |
| `EXPO_PUBLIC_LIVE_DISCOVERY_DEMOS` | EAS env | **unset or `0`** in production |

Deploy:

```bash
npm run db:push
npx supabase functions deploy livekit-token
```

Rebuild EAS after client/env changes.

## Two-device QA matrix

**Device A** = host (EAS dev/preview build, not Expo Go)  
**Device B** = viewer (same)  
**Admin** = staff account on admin web

| # | Test | Pass criteria |
|---|------|---------------|
| 1 | Live disabled without LiveKit URL | Release build with flag off or missing `wss://` URL hides real Live / uses mock poster-only |
| 2 | Host starts stream | Go Live → wizard → room row created → host sees CONNECTING then LIVE after LiveKit connects |
| 3 | Viewer sees stream in Live tab | Stream appears only after `broadcast_started_at` is set (discovery filters unbroadcast rows) |
| 4 | Viewer joins stream | LiveKit video or poster + chat; no token before broadcast |
| 5 | Viewer sends chat | Message persists, correct display name, no duplicate after realtime echo |
| 6 | Viewer reports chat message | Long-press another user's chat row → ReportModal → `stream_message` report in admin queue |
| 7 | Admin sees stream_message report | Queue shows message preview + author |
| 8 | Admin removes message | Message disappears from viewer chat within ~realtime |
| 9 | Viewer sends live gift | Gift animation / chat row; Sparks debit |
| 10 | Sparks deduct | Viewer wallet decreases in Pulse Shop |
| 11 | Diamonds credit host | Host wallet increases (may be on hold per economy rules) |
| 12 | Host ends stream | DB `status=ended`; host routed to Live tab |
| 13 | Viewer sees ended state | **Realtime** — viewer sees "This live has ended" within a few seconds (no 12s poll wait) |
| 14 | Ended stream rejects gifts | RPC raises `stream_not_live` |
| 15 | Ended stream rejects viewer token | Edge returns 403 "Stream has ended" |
| 16 | Viewer reports live stream | Overflow → Report stream → admin `live_stream` queue |
| 17 | Admin ends reported stream | Stream removed from discovery; viewers get ended state |
| 18 | Blocked user chat | Host blocks viewer (or viewer blocked host) → blocked party cannot send chat; input disabled + RLS rejects insert |
| 19 | Token refresh (host) | Stay live >58 min (or temporarily lower TTL in dev) → video reconnects without manual leave/rejoin |
| 20 | Token refresh (viewer) | Stay watching >28 min → brief reconnect toast; video resumes |
| 21 | Gift leaderboard hydrate | Viewer joins mid-stream after gifts were sent → ribbon shows prior supporters from DB |
| 22 | Leaderboard realtime | New gift during session updates leaderboard without reload |

## Known closed-beta limitations

- **Token refresh** — automatic re-mint ~2 min (host) / ~1.5 min (viewer) before JWT expiry; brief LiveKit reconnect blink expected.
- **No LiveKit webhooks** — stream end is host-driven via app; stale attendance pruned by RPC heartbeat window.
- **Gift leaderboard** — DB-hydrated on join + realtime for new gifts; acceptable for closed beta (not a global all-time creator chart).
- **Expo Go** — mock video provider only; real LiveKit requires EAS build.

## Token TTL reference

| Role | TTL | Refresh buffer | Source |
|------|-----|----------------|--------|
| Host | 60 minutes | 120 seconds before expiry | `livekit-token` edge + `hooks/useLiveKitSession.ts` |
| Viewer | 30 minutes | 90 seconds before expiry | same |

## Report target types (canonical)

| Surface | `target_type` | `target_id` |
|---------|---------------|-------------|
| Live stream overflow | `live_stream` | `live_streams.id` |
| Chat long-press | `stream_message` | `stream_messages.id` |

## Beta stabilization additions (post launch-readiness)

| Area | Behavior |
|------|----------|
| LiveKit tokens | Server mint only; client schedules refresh via `useLiveKitSession` |
| Ended state | `live_streams` Realtime UPDATE → React Query invalidation |
| Live chat blocks | RLS on `stream_messages` insert + disabled composer when block exists |
| Leaderboard | `streamGiftsService.fetchLeaderboard` on join + Realtime inserts |
