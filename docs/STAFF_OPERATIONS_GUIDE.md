# PulseVerse Staff Operations Guide

**Internal only — do not link from public marketing or app store listings.**

## Admin surfaces

| Surface | Path | Best for |
|---------|------|----------|
| **Web Staff Portal** | `/admin/login` → `/admin/dashboard` | Daily ops, dashboards, moderation SLA, appeals, economy, partnerships, audit, platform flags |
| **Mobile Admin Panel** | App → Settings → Admin panel (staff only) | Quick moderation, on-call bans, staff promotion, verified badge, Circle curation, sound catalog |

Both require `profiles.role_admin = true`. Non-staff never see mobile admin; web `/admin/*` redirects to login.

## Getting access

1. An existing staff member opens **Users → User detail** (web) or **Users tab** (mobile).
2. Use **Grant staff** with an internal note (why this person needs access).
3. New staff sign in at `/admin/login` with their normal PulseVerse account.

**Revoke staff:** Web requires typing `REVOKE` when removing staff from another staff account. The system blocks revoking the last staff account.

## Reports & moderation

1. **Dashboard → Today's action queue** or **Moderation** for pending reports.
2. Review target type, severity, reporter note, prior actions (user detail page).
3. Actions: dismiss, warn, remove content, suspend subject, circle-specific actions.
4. Every web moderation action writes to **Audit log** and may enqueue webhook outbox rows.

**Live incidents:** `/admin/live` — end streams via staff controls; check active count in action queue.

## Appeals

1. `/admin/appeals` — each card shows target content and current enforcement state.
2. **Approve & restore** when the linked post is hidden (`privacy_mode = private`) — restores public visibility automatically.
3. **Approve — manual restore required** when there is no post link or auto-restore is unsafe.
4. Add internal staff notes and rejection reasons (stored in audit metadata).
5. After approval, follow the on-screen banner for next steps.

## Circles curation

**Web:** `/admin/circles` — create, edit, feature order, archive (metadata flag), filters.

**Mobile:** Admin panel → Circles tab — pins, moderators, identity/welcome thread (full parity for advanced fields).

Audit: all Circle mutations log to `admin_audit_log` with `source_surface` web or mobile.

## Shop & border grants

Web: **Merchandising** / **Shop catalog** / **Sparks economy** — grant items, inspect receipts, economy pipeline.

Always note grants in audit or internal CRM when gifting high-value borders.

## Leads

`/admin/leads` — marketing contact inquiries. Triage new leads from dashboard action queue.

## Daily ops checklist

- [ ] Clear pending reports queue (or assign owners)
- [ ] Check pending appeals
- [ ] Scan active live streams
- [ ] Review new leads
- [ ] Confirm **Admin data health** shows service role configured in production
- [ ] Spot-check audit log for unusual staff activity

## Launch gap priorities (P1+)

| Priority | Item | Status |
|----------|------|--------|
| P1 | Campaign create/edit (web) | Planning — view/export only today |
| P1 | Inventory booking | Heuristic estimate — not confirmed bookings |
| P1 | Web sound catalog | Mobile-only writes today |
| P1 | Webhook outbox delivery UI | Pending/failed counts on platform; worker external |
| P2 | Role tiers beyond `role_admin` | See `ADMIN_PERMISSIONS_PLAN.md` |

## Production requirements

- Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel (server-only) for complete admin aggregates.
- Never expose service role to the client or commit it to the repo.
- Admin routes remain `noindex`.
