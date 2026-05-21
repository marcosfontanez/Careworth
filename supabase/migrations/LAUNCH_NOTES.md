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

## Phase 3 (193) — economy gift push

- **`economy_send_creator_gift`** now validates `context_id` for `profile`, `post`, and `live` before debiting Sparks.
- **`public.notifications`** added to **`supabase_realtime`** for in-app badge freshness.

## Parked (do NOT apply yet)

**181** feed ranking optimization → `scripts/sql/parked/181_optimize_get_ranked_feed_v2_ctes.sql`  
Not production-approved until feed output-equivalence QA completes.
