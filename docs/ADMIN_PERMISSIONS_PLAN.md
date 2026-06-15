# Admin Permissions Plan

**Internal technical plan — not public.**

## Current model

- Single boolean: `profiles.role_admin`
- RPC gate: `current_user_role_admin()` for client checks
- Staff mutations: security definer RPCs (`admin_profile_set_role_admin`, `admin_profile_set_is_verified`, `admin_post_set_privacy_mode`, …)
- Audit: append-only `admin_audit_log` (staff insert RLS: `auth.uid() = staff_user_id`)

### Risks

- Any staff member can access all admin areas (economy, API keys, platform flags).
- No owner vs moderator separation.
- Last-staff lockout partially mitigated in web UI; not enforced in RPC layer yet.

## Proposed role tiers

| Role | Access |
|------|--------|
| **owner** | All access, staff management, API keys, destructive platform controls |
| **admin** | Daily ops except owner-only destructive controls |
| **moderator** | Moderation, reports, appeals, live safety |
| **support** | User lookup, reports, limited notes — no economy grants |
| **marketing** | Leads, campaigns, media kit, advertiser insights |
| **analyst** | Read-only analytics/export |
| **economy** | Shop grants, Sparks, receipts, inventory |

## Schema plan (future migration)

```sql
-- Illustrative — not applied yet
create type admin_role as enum (
  'owner', 'admin', 'moderator', 'support', 'marketing', 'analyst', 'economy'
);

alter table profiles add column admin_roles admin_role[] default '{}';

-- Backfill: role_admin true → {owner} or {admin} per policy
```

Alternative: `staff_roles` join table `(user_id, role, granted_by, granted_at)`.

## RLS plan

- Replace `role_admin = true` checks with `has_admin_role('moderator')` OR array overlap helpers.
- Economy tables: grant write to `economy` + `owner` only.
- `admin_audit_log`: insert unchanged; read requires any staff role.

## RPC plan

- Wrap existing admin RPCs with role checks (e.g. only `owner`/`admin` for `admin_profile_set_role_admin`).
- Add `admin_require_role(text[])` helper in PL/pgSQL.

## UI permission plan

- Web sidebar: hide sections by role (economy, platform, partnerships).
- Mobile tabs: hide Revenue/Stats for non-analyst; hide Circles curation for non-admin.
- Server actions: re-check role server-side (never UI-only).

## Migration path

1. Ship `admin_roles` column + backfill from `role_admin`.
2. Dual-read: UI checks `role_admin OR admin_roles`.
3. Update RLS policies incrementally (moderation first).
4. Deprecate `role_admin` after all gates migrated.
5. Emergency owner recovery: break-glass service-role script + documented owner UUID.

## Staff access safety (P2)

- Prevent last-owner lockout (DB trigger or RPC guard).
- Re-auth for staff grants, API key creation, major platform flags.
- Optional staff action notes (already in audit metadata).
- Session timeout / step-up auth for sensitive actions.

## Fallback for existing users

All current `role_admin = true` profiles become `owner` (or `admin` if you prefer narrower default) during backfill — communicate before migration.
