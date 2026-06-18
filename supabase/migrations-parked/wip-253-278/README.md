# Parked WIP migrations (253–278)

These files were restored from WIP stash work and **must not** be applied directly.
They conflict with the main migration sequence (279–285) when numbered 253–278.

Phase 3 reconciliation (branch `wip/onboarding-circles-pulseboard`) squashed them into
**286–303** under `supabase/migrations/`. Keep this folder for audit/reference only.

| Old file | Reconciled as |
|----------|----------------|
| 254_onboarding_audience_preferences.sql | 286 |
| 256_reapply_profiles_column_grants.sql | 287 (+ final grant pass in 303) |
| 258_profiles_pulse_status.sql | 288 |
| 259–261 profile board shoutouts | 289 |
| 262–263 weekly recap / snapshot | 290 |
| 264–266 pulse board retention / public / read fixes | 291 |
| 267–268, 270 circle helpful | 292 |
| 269 circle identity | 293 |
| 273 general public circles | 294 |
| 274–275 weekly prompts | 295 |
| 276 metrics | 296 |
| 277 cron | 297 |
| 278 feed ranker v4 | 298 |
| 255 hashtag synonyms | 299 |
| 271 username RPC | 300 |
| 272 delete account | 301 |
| 253 june leaderboard frames | 302 |
| 257 admin economy | 303 |

**291 reconcile note:** `265` replaced `post_profile_board_shoutout` without owner notify from `261`; reconciled 291 appends a merged RPC (265 visibility + 261 notification).

**Do not** `supabase db push --linked` or apply to production.
