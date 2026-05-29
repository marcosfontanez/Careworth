# Supabase migrations — launch notes

Apply with `npm run db:push` after `npm run db:link` (see **docs/LAUNCH_RUNBOOK.md**).

## Production batch (176–189)

| # | File | Purpose |
|---|------|---------|
| 176 | livekit streams, reminders, attendance | Live hub + LiveKit |
| 177 | RLS + EXECUTE allowlist | Security hardening |
| 179 | storage public buckets | Listing hardening |
| 180 | guard high-risk RPCs | Tips/ads/streak guards |
| 182 | streak/tip/poll atomic | App uses these RPCs |
| 183 | stitch_source_post_id | Stitch attribution |
| 184–187 | creator_media_jobs | Media worker |
| 185 | pulse music player rename | Profile column |
| 188 | RLS auth initplan | Performance |
| 189 | marketing_contact_messages CRM | Admin leads |
| 190 | phase1 production blockers | user_coins lock, reward enqueue hardening, new_follower trigger |
| 191 | phase2 beta hardening | creator gift context validation, notifications Realtime publication |
| 192 | economy RLS helper execute | restore `_economy_is_admin()` EXECUTE for shop/wallet RLS (fixes migration 177 gap) |
| 193 | phase3 closed beta expansion | economy gift push mirror + lock `_economy_user_notify` |
| 196 | is_valid_username execute | restore EXECUTE for profiles CHECK (Current Vibe / profile song saves) |
| 200–209 | live join, recordings, clips, markers | LiveKit room + Clip Studio pipeline |
| 210 | feed_clip_source | Feed-native clip lineage (`source_post_id`, trim window) |
| 211 | feed_rpcs_exclude_failed_processing | Hide `media_processing_status=failed` from feed RPCs |

## Live + Feed clips (200–211)

- **200–209** — Live join hardening, recordings egress, clip markers, Clip Studio settings.
- **210** — Feed clip composer attribution columns on `posts`. Required before feed-native clips persist lineage.
- **211** — Feed RPCs exclude failed media processing posts (aligns with client `postAppearsInMainFeeds`).
- **Worker:** run `node scripts/creator-media-worker.mjs` (ffmpeg) so trim jobs for feed + Live clips complete.

## Phase 3 (193) — economy gift push

- **`economy_send_creator_gift`** now validates `context_id` for `profile`, `post`, and `live` before debiting Sparks.
- **`public.notifications`** added to **`supabase_realtime`** for in-app badge freshness.

## Parked (do NOT apply yet)

**181** feed ranking optimization → `scripts/sql/parked/181_optimize_get_ranked_feed_v2_ctes.sql`  
Not production-approved until feed output-equivalence QA completes.
