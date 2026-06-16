# Admin Permissions Plan

**Internal technical plan — not public.**

## Status

**Implemented (migration 284):** `profiles.staff_roles`, role-tier helpers, web/mobile permission gates, owner-only staff management, last-owner lockout at RPC layer.

## Current model (dual-read migration)

| Layer | Behavior |
|-------|----------|
| `profiles.role_admin` | Legacy boolean — kept during migration |
| `profiles.staff_roles` | `staff_role[]` — primary authorization source |
| Legacy fallback | `role_admin = true` + empty `staff_roles` → treated as **owner** |
| Backfill | All existing `role_admin` staff → `{owner}` |

## Role tiers

| Role | Purpose |
|------|---------|
| **owner** | Full access, staff role management, API keys, destructive platform controls |
| **admin** | Daily ops except owner-only controls (API keys, staff grants) |
| **moderator** | Moderation, reports, appeals, live safety |
| **community** | Circle curation (featured, pins, moderators) |
| **marketing** | Leads, campaigns, inventory booking, media kit, advertiser insights |
| **support** | User lookup, reports, limited moderation notes |
| **analyst** | Read-only analytics, audit, exports |
| **economy** | Shop grants, Sparks economy, merchandising |

## Permissions matrix (route → permission → roles)

| Admin area | Permission | Roles |
|------------|------------|-------|
| Dashboard | `dashboard.read` | All staff tiers |
| Insights | `insights.read` | owner, admin, analyst, marketing |
| Audit log | `audit.read` | owner, admin, analyst |
| Platform (read) | `platform.read` | owner, admin |
| Feature flags | `platform.flags` | owner, admin |
| API keys | `platform.api_keys` | **owner only** |
| Webhooks | `platform.webhooks` | owner, admin |
| Compliance tasks | `platform.compliance` | owner, admin |
| Sound catalog | `sound_catalog.manage` | owner, admin |
| Shop & borders grants | `merchandising.grant` | owner, admin, economy |
| Sparks economy | `economy.read` / `economy.write` | owner, admin, economy (write); analyst (read) |
| Users (lookup) | `users.read` | owner, admin, moderator, community, support, analyst |
| Ban / suspend / verify | `users.moderate` | owner, admin, moderator |
| Staff grants / roles | `users.staff_manage` | **owner only** |
| Circles curation | `circles.manage` | owner, admin, community |
| Live ops | `live.manage` | owner, admin, moderator |
| Moderation queue | `moderation.write` | owner, admin, moderator, support |
| Reports | `reports.read` | owner, admin, moderator, support, analyst |
| Appeals | `appeals.write` | owner, admin, moderator |
| Brand safety | `brand_safety.read` | owner, admin, marketing, analyst |
| Partnerships / advertisers | `partnerships.read` | owner, admin, marketing, analyst |
| Campaigns | `campaigns.write` | owner, admin, marketing |
| Inventory booking | `inventory.write` | owner, admin, marketing |
| Leads CRM | `leads.write` | owner, admin, marketing |
| Media kit | `media_kit.read` | owner, admin, marketing, analyst |
| Creators explorer | `creators.read` | owner, admin, marketing, analyst |
| Settings | `settings.read` | All staff tiers |

## API permission gates

| Endpoint | Permission |
|----------|------------|
| `POST /api/admin/moderation` | `moderation.write` |
| `POST /api/admin/live/end` | `live.manage` |
| `GET/POST /api/admin/campaigns` | `campaigns.write` |
| `GET/POST /api/admin/placements` | `inventory.write` |
| `GET/POST /api/admin/sounds` | `sound_catalog.manage` |
| `GET/POST /api/admin/webhooks` | `platform.webhooks` |

## RPC / DB safety

- `admin_profile_set_staff_roles` — owner only; blocks last-owner removal
- `admin_profile_set_role_admin` — owner only; syncs `staff_roles`; last-owner guard
- `current_user_staff_roles()` — client-safe role read (replaces direct `role_admin` column reads)
- Audit: `staff.roles.update`, `staff.grant`, `staff.revoke`

## Mobile admin tabs

| Tab | Permission |
|-----|------------|
| Reports / Content | `moderation.write` |
| Users | `users.read` |
| Circles | `circles.manage` |
| Stats | `insights.read` |
| Revenue | `economy.read` |

## Out of scope (unchanged)

- Public ad delivery / `sponsoredPosts`
- Public website / SEO
- Partner API key scopes (separate from staff roles)
- Circle **moderators** (community-scoped, not staff tiers)

## Future deprecation

1. Dual-read complete (this release)
2. Migrate all RLS `role_admin` checks to `caller_has_staff_role` incrementally
3. Deprecate `role_admin` column after all gates migrated
