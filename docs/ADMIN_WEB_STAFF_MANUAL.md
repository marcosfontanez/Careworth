# PulseVerse — Web Admin Console · Staff Manual

**Audience:** PulseVerse staff with `role_admin` on their Supabase profile.  
**Scope:** The marketing website’s admin area (`/admin/*`), not the mobile app’s in-app admin tools unless noted.  
**Last aligned to repo:** CareWorth web app under `web/src/app/(admin)/admin/`.

---

## Table of contents

1. [Purpose and principles](#1-purpose-and-principles)  
2. [Access, accounts, and security](#2-access-accounts-and-security)  
3. [Signing in and signing out](#3-signing-in-and-signing-out)  
4. [Console layout](#4-console-layout)  
5. [Overview: Dashboard & Insights](#5-overview-dashboard--insights)  
6. [Operations](#6-operations)  
7. [Community](#7-community)  
8. [Trust & safety](#8-trust--safety)  
9. [Partnerships & revenue](#9-partnerships--revenue)  
10. [Settings](#10-settings)  
11. [Background: API routes staff rarely touch](#11-background-api-routes-staff-rarely-touch)  
12. [Operational dependencies](#12-operational-dependencies)  
13. [Boundaries — what this console does not replace](#13-boundaries--what-this-console-does-not-replace)  
14. [Troubleshooting](#14-troubleshooting)  
15. [Glossary](#15-glossary)

---

## 1. Purpose and principles

The **Web Admin Console** is PulseVerse’s browser-based operations hub. It is used to:

- Monitor platform health and high-level metrics  
- Run **trust & safety** workflows (reports, moderation, appeals)  
- Inspect **users**, **circles**, and **live** streams  
- Operate **Pulse Shop & avatar border** grants (staff tooling)  
- Manage **platform** items such as feature flags and partner API keys (where configured)  
- Review **campaigns** and **creator/partner**-oriented dashboards  

**Principles**

- **Least privilege:** Only users with **`profiles.role_admin = true`** can access `/admin` (except the login page).  
- **Auditability:** Writes that affect money, inventory, permissions, platform behavior, enforcement, campaigns metadata visible to partners, or commercial pipelines should emit **`admin_audit_log`** rows when wired (moderation, live force-end, shop grants, avatar grants/equip, platform toggles, appeals, marketing leads, etc.).  
- **Export hygiene:** Treat **external-ready** advertiser exports as distinct from **internal staff** bundles (post previews and diagnostic histograms stay internal-only). See §9.7.  
- **Production data:** This console reads (and sometimes writes) **live database** data. Treat every action as production-impactful unless you are explicitly on a staging project.

---

## 2. Access, accounts, and security

### 2.1 Who gets access

Access is **not** tied to a separate “admin password product.” It requires:

1. A normal PulseVerse **Supabase Auth** account (email/password used at `/admin/login`).  
2. The **`role_admin`** flag set to **true** on that user’s row in the **`profiles`** table (typically applied by engineering or a super-admin via Supabase Studio / existing admin tooling).

If you can sign in but see **forbidden** or are bounced to login, your account likely lacks **`role_admin`** — contact whoever manages database access.

### 2.2 Where the console lives

- **URL:** `https://<your-pulseverse-domain>/admin`  
- **Login:** `https://<your-pulseverse-domain>/admin/login`  
- Visiting **`/admin`** redirects to **`/admin/dashboard`**.

### 2.3 Session and cookies

The site uses **Supabase SSR cookies** for session refresh. If actions fail with “not signed in,” try a **hard refresh** or **sign out and sign in again** — session cookie drift can happen during deploys or multi-tab use.

### 2.4 Service role vs your session

Many **read-only dashboards** show fuller totals when the **server** has `SUPABASE_SERVICE_ROLE_KEY` configured (bypasses RLS for aggregated queries). **You** still act as yourself; the server uses that key only for permitted server-side loaders. If metrics look “too low,” ask engineering whether staging/production has that variable set.

---

## 3. Signing in and signing out

### Sign in

1. Open **`/admin/login`**.  
2. Enter the **email** and **password** for your staff account.  
3. Optionally, if you followed a deep link, **`next`** may return you to a specific `/admin/...` path after login.  
4. On success you land on **`/admin/dashboard`**.

**Failure modes (typical)**

| Situation | Meaning |
|-----------|---------|
| Redirect back with **forbidden** | Account exists but **`role_admin`** is false — access denied by design. |
| **Auth** error | Wrong password or auth policy issue. |
| **Confirm** error | Email not confirmed (if your project enforces confirmation). |
| **Config** error | Supabase env not configured on the server — engineering issue. |

### Sign out

Use **Sign out** in the **sidebar footer**. You will return to **`/admin/login`**.

---

## 4. Console layout

### Sidebar groups

| Group | Items |
|-------|--------|
| **Overview** | Dashboard, Insights |
| **Operations** | Audit log, Platform, Shop & borders |
| **Community** | Users, Circles, Live |
| **Trust & safety** | Moderation, Reports, Appeals, Brand safety |
| **Partnerships & revenue** | Advertiser overview, Audience insights, Campaigns, Inventory & placements, Creators, Leads / inquiries, Media kit / exports |
| **Settings** | Preferences (`#preferences`), Platform controls (`#platform-controls`) |

### Sidebar extras

- **Appeals** may show a **numeric badge** when there are pending appeals (depends on loaded counts).  
- **Platform checks** — quick link showing how many health checks are OK; opens context toward Dashboard health detail.

### Header

Most pages use a consistent **title**, **breadcrumbs**, and sometimes **action buttons** (e.g. links to public pages or Insights).

---

## 5. Overview: Dashboard & Insights

### 5.1 Dashboard (`/admin/dashboard`)

**Purpose:** Single pane for **day-to-day ops awareness**.

Typical contents (exact widgets evolve with code):

- Aggregate **counts** (users, posts, circles, reports, etc.)  
- **Growth** and **engagement** chart series  
- **Audience** mix  
- **Reports** breakdown (reasons, sources)  
- **Top circles** activity  
- **Report pipeline** summary  
- **Moderator workload** snapshot  
- **Recent admin-related activity** feed  
- **Live** 24h snapshot  
- **Moderation SLA** hints  
- **System health** checklist  
- **Export** — JSON snapshot labeled **`internal_operational_dashboard`** (aggregate KPIs only — staff use, not for sponsors)

**How to use it**

- Start shifts here for **volume** and **health**.  
- Drill into **Moderation** or **Reports** when queue KPIs move.  
- If **health** shows degraded/down, escalate per your **incident** process.

### 5.2 Insights (`/admin/insights`)

**Purpose:** **Product analytics** workspace with tabbed KPIs — broader than Dashboard cards alone.

Includes themes such as:

- Overview KPIs  
- Trust & safety KPIs  
- Partner / advertiser engagement (aligned with Partner metrics page)  
- Live KPIs  
- Campaign KPIs  
- My Pulse–oriented KPIs  

**Important:** The page explains that without **`SUPABASE_SERVICE_ROLE_KEY`** on the server, some totals may reflect **RLS-limited** visibility vs SQL Editor. For audit-grade numbers, confirm environment with engineering.

---

## 6. Operations

### 6.1 Audit log (`/admin/audit`)

**Purpose:** Read-only table of **recent staff/system audit events** written by supported admin flows.

- Columns typically include **time**, **staff**, **action**, **entity type**, **entity id**.  
- Row cap (e.g. latest 120) keeps the page fast.

**Representative action prefixes** (not exhaustive — check code or DB for the full set):

- **`moderation.*`** — dismiss, review, uphold, warn, remove, suspend, etc.  
- **`live.admin_end`** — force-ended live stream.  
- **`grant_shop_catalog_item`**, **`grant_pulse_avatar_frame`**, **`equip_pulse_avatar_frame`** — economy cosmetics.  
- **`feature_flag.enable` / `feature_flag.disable`**, **`partner_api_key.create` / `partner_api_key.revoke`**, **`compliance_task.complete` / `compliance_task.uncomplete`** — platform page.  
- **`appeal.status.*`** — appeal outcomes.  
- **`marketing_lead.update`** — lead status / owner / notes / last-contacted updates.

**Use when:** Investigating “who changed what” for supported action types.

### 6.2 Platform (`/admin/platform`)

**Purpose:** **Platform & enterprise** controls and monitors.

**Typical sections**

- **Operational counters** — experiments, sponsor deals, fraud queue, trust scores, warehouse runs, pending webhooks (depends on schema migrations applied).  
- **Feature flags** — toggle rows in **`feature_flags`** (enabled/disabled). Changes affect behavior **only where the app reads those flags**.  
- **Partner API keys** — issue labeled keys (secret shown once), revoke keys.  
- **Webhook outbox** — recent outbound webhook rows (monitoring).  
- **Compliance tasks** — checklist items staff can mark complete.

**Staff caution:** Partner keys are **secrets**. Store them only in your team’s **approved** secret manager; never paste into public channels.

### 6.3 Shop & borders (`/admin/merchandising`)

**Purpose:** **Cosmetics and commerce ops** for Pulse Shop SKUs and **avatar frames** (monthly / prestige borders).

**URL sections**

- **`/admin/merchandising`** — defaults to Pulse Shop catalog focus.  
- **`/admin/merchandising?section=shop`** — Pulse Shop catalog.  
- **`/admin/merchandising?section=frames`** — Avatar frame grants.

**Legacy redirects**

- `/admin/shop-catalog` → merchandising `section=shop`  
- `/admin/avatar-borders` → merchandising `section=frames`

#### Pulse Shop catalog (staff-facing behaviors)

- Inspect **catalog rows**: names, slugs, types, **iOS/Android store product IDs**, pricing hints, etc.  
- Review **recent admin grants** and **border statistics** where wired.  
- **Grant flow:** Staff can grant a catalog item to a user by **user UUID** or **@handle**, invoking the **`economy_admin_grant_shop_item`** RPC path (server validates staff).

**Important:** Creating **new App Store / Play consumables** or fixing **SKU_NOT_FOUND** in the mobile app is done in **Apple App Store Connect** and **Google Play Console** — the console **displays** IDs and **grants** inventory; it does not create Apple/Google products.

#### Avatar frame grants

- Staff can **grant** a **pulse_avatar_frames** row to a user and optionally **equip** it.  
- Duplicate grants are blocked; **equip-only** path may apply if the user already owns the frame.

**Documentation for mobile staff tooling:** Native Pulse Shop also exposes a **staff-only “store product IDs”** helper on spark packs for admins (`role_admin` on profile) — keep web catalog and Supabase **`shop_items`** as the source of truth.

---

## 7. Community

### 7.1 Users (`/admin/users`)

**Purpose:** Profile directory for lookup and triage.

- Search/filter in the **Users console** UI.  
- Use when linking reports, appeals, or support tickets to **account identifiers**.

### 7.2 User economy audit (`/admin/users/[userId]`)

**Purpose:** **Deep dive** on one user’s **Pulse Shop / economy** footprint.

Shows (subject to data):

- Wallet / sparks / diamonds style ledger views  
- **Purchase receipts** tied to validated IAP  
- **Inventory** / shop ownership signals  

**Requirement:** `userId` must be a valid UUID in the URL.

### 7.3 Circles (`/admin/circles`)

**Purpose:** Read-only **communities** directory.

- Filter locally by name/slug.  
- **Structural edits** (rename slug, merge circles, etc.) are **not** performed here today — those remain **database / Studio / migrations** workflows unless a future write API is added.

### 7.4 Live (`/admin/live`)

**Purpose:** Operational view of **`live_streams`** (includes ended rows when loaded).

- Columns typically include title, host, viewers, peak, status, flags.  
- **Review** shortcuts toward moderation.  
- **End stream** action calls a rate-limited API to force-end a stuck stream (ops safety valve).

Use according to your **live incident** playbook (coordinate with host when possible).

---

## 8. Trust & safety

### 8.1 Moderation (`/admin/moderation`)

**Purpose:** Primary **open-queue** triage UI.

- KPI strip: open reports, needs review, resolved today, critical themes, average resolution time (definitions are labeled on screen).  
- **Moderation console** lists actionable reports.

**Typical actions** (exact naming matches internal mutation layer):

- **Dismiss** — close without upholding violation  
- **Uphold** — record action taken  
- **Review** — mark in review  
- **Warn** — warning pathway  
- **Remove** — remove reported content (destructive)  
- **Suspend** — suspend subject (destructive; may include ban reason)

These actions are also exposed via **`POST /api/admin/moderation`** for reliability in some environments.

### 8.2 Reports (`/admin/reports`)

**Purpose:** Full **reports** table view (broader than open-queue-only).

Use for historical searches and audits alongside Moderation.

### 8.3 Appeals (`/admin/appeals`)

**Purpose:** **`content_appeals`** queue presented as cards.

- Staff update status via row actions: **`approved`**, **`rejected`**, **`reviewed`** (workflow-specific meanings — align with policy docs). Successful updates emit **`appeal.status.*`** audit rows.  
- Sidebar badge highlights backlog when configured.

### 8.4 Brand safety (`/admin/brand-safety`)

**Purpose:** Same domain as §9.5 — **aggregated posture** for exec/partner readouts. Detailed queue work stays in **Moderation** and **Reports**.

---

## 9. Partnerships & revenue

### 9.1 Advertiser overview (`/admin/advertisers`)

**Purpose:** **Advertiser intelligence center** — operational + commercial analytics with explicit sampling caps and provenance (session vs service-role aggregates).

- Window presets (**7d / 30d / 90d**) and **minimum cohort size** for suppressed breakdowns.  
- Deep links: public **`/advertisers`**, Insights engagement tab, **Audience insights**, **Media kit**, contact intake.

This page surfaces the full dashboard UI (charts and tables). For **sponsor-facing** bundles, prefer **`/admin/media-kit`** print/PDF plus **external-safe** CSV/JSON downloads (§9.7).

### 9.2 Audience insights (`/admin/audience-insights`)

**Purpose:** Staff-facing **audience composition** view aligned with capped aggregates (roles, specialties, geo-style signals where populated).

- Cross-links to Advertiser overview and Media kit when assembling outbound narratives.

### 9.3 Campaigns (`/admin/campaigns` and `/admin/campaigns/[id]`)

**Purpose:** Portfolio over **`ad_campaigns`** — sponsor, placement title, schedule, row-level impressions/clicks/CTR, pacing notes when budgets exist.

- **List CSV:** campaign-level rollup (`id`, sponsor, placement, status, dates, counters, budgets, pacing text) — operational export; **no end-user rows**. Filename prefix **`pulseverse-campaigns-`**.  
- **Detail route:** glossary + pacing callouts; **no per-day delivery warehouse** in-schema yet — detail page states this explicitly.

There is **no** campaign edit or status-change UI in the web console today; rely on database workflows for row edits.

### 9.4 Inventory & placements (`/admin/inventory`)

**Purpose:** Read-oriented **placement / inventory** lens over campaign-like rows (still keyed off stored placement titles until a dedicated placement catalog ships).

- Cross-links to Campaigns and Insights for pacing checks.

### 9.5 Brand safety (`/admin/brand-safety`)

**Purpose:** Aggregated **trust & safety posture** signals for commercial conversations (open reports, filing velocity, appeals, live heuristics).

- Complements **Moderation** / **Reports** queues — use queues for actioning, this page for narrative snapshots.

### 9.6 Creators (`/admin/creators`)

**Purpose:** Creator-oriented directory (followers, verified, score columns, filters).

- Optional deep links to **web/expo** profile URLs when **`NEXT_PUBLIC_EXPO_WEB_APP_URL`** is configured.

### 9.7 Media kit & exports (`/admin/media-kit`)

**Purpose:** **Print-friendly advertiser snapshot** plus download buttons.

- **Print / Save as PDF:** The printable surface is the **summary card** (overview bullets, brand safety aggregates, campaign readiness footnotes). The heavy **`AdvertiserEngagementDashboard`** chart grid is **hidden in print** so PDFs stay closer to an exec summary.  
- **Downloads (four buttons):**
  - **External-safe CSV / JSON** — filenames **`pulseverse-advertiser-external-*`**; **`exportAudience: external_advertiser_safe`**; aggregates only (no post previews, no event/screen/hour histograms; KPI **hints** stripped on JSON).  
  - **Internal CSV / JSON** — filenames **`pulseverse-advertiser-internal-*`**; **`exportAudience: internal_staff_only`** (JSON wraps full payload); includes **top-post previews**, KPI hints, and diagnostic distributions — **never** forward to advertisers.

Always verify footnotes (`notInstrumented`, `dataAccess`, `campaignMetricsScope`) before external sharing.

### 9.8 Leads / inquiries (`/admin/leads`)

**Purpose:** CRM-lite triage for **`marketing_contact_messages`** inbound (contact form, media kit requests, etc.).

- Columns include pipeline **status** (`new`, `contacted`, `qualified`, `proposal_sent`, `closed_won`, `closed_lost`), optional **owner** (staff profile), **internal notes**, **last contacted** timestamp.  
- **Filters** by status; default sort **newest first**.  
- Successful saves emit **`marketing_lead.update`** audit events (metadata summarizes status/owner/notes flags — not a full note dump).

Requires migration **`189_marketing_contact_messages_crm_lite`** on the Supabase project.

---

## 10. Settings (`/admin/settings`)

### 10.1 Your staff preferences

- **Locale** (`preferred_locale`)  
- **Product digest email** toggle  

Stored on **your** `profiles` row (same fields as mobile). Updates require **`role_admin`** server-side check.

### 10.2 Platform feature controls (informational)

The page explains that **master production switches** for roadmap items may land here later; today **moderation** and **database/migrations** remain authoritative for many behaviors.

### 10.3 Recent product events

Read-only tail of **`analytics_events`** for lightweight diagnostics.

---

## 11. Background: API routes staff rarely touch

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/moderation` | Moderation mutations via JSON (`action`, `reportId`, …). Rate limited. Writes **`admin_audit_log`** via shared mutation helpers. |
| `POST /api/admin/live/end` | Force-end live stream by `streamId`. Rate limited. Audited as **`live.admin_end`**. |
| `GET /api/admin/debug-auth` | Confirms admin cookies reach the API layer (**read-only** sanity check). Rate limited. |

Staff normally interact through **UI buttons** that call these safely.

---

## 12. Operational dependencies

For **accurate** dashboards and safe writes:

- **Supabase project** linked to the deployed site (`NEXT_PUBLIC_SUPABASE_URL`, anon key).  
- **`SUPABASE_SERVICE_ROLE_KEY`** on the **server** for fuller aggregates (Insights banner documents this).  
- **Migrations** that create **`feature_flags`**, **`partner_api_keys`**, **`compliance_tasks`**, **`webhook_outbox`**, audit tables, appeals, reports — match your environment (engineering owns migration apply order).  
- **Leads CRM-lite:** `marketing_contact_messages` columns + admin RLS — migration **`189_marketing_contact_messages_crm_lite`**.  
- **Mobile IAP:** Spark packs and paid borders require matching **store product IDs** in Apple/Google consoles.

---

## 13. Boundaries — what this console does not replace

| Need | Where it’s handled |
|------|---------------------|
| Apple/Google IAP SKU creation | App Store Connect / Play Console |
| Raw SQL / RLS policy changes | Supabase migrations + Studio (engineering) |
| Circle structural DB edits | Studio/migrations (no write UI here) |
| Mobile-only admin flows | Expo app `/admin` or equivalent (separate manual if needed) |
| Legal holds / law enforcement | Follow legal process outside this UI |

---

## 14. Troubleshooting

| Symptom | What to try |
|---------|-------------|
| **Forbidden** after login | Confirm **`role_admin`** on your profile. |
| **Blank or tiny metrics** | Ask if **`SUPABASE_SERVICE_ROLE_KEY`** is set on the deployment. |
| Moderation action fails / “not signed in” | Hard refresh; sign out/in; check cookie blockers. |
| Grant shop item fails | Verify recipient **UUID** or **@handle**, catalog **item id**, and RPC error text surfaced in UI. |
| Live end fails | Confirm **stream id**, rate limit not hit, engineering logs for `adminEndLiveStream`. |
| Appeals status won’t save | Check network tab / retry; confirm row still exists; escalate if RLS/policy errors appear in logs. |
| Lead updates fail silently | Confirm migration **189** applied; verify **`role_admin`** session; check browser console / server logs for RLS errors. |
| Wrong file sent to a sponsor | Re-download **external** (`pulseverse-advertiser-external-*`) — internal bundles contain post previews. |

---

## 15. Glossary

| Term | Meaning |
|------|---------|
| **`role_admin`** | Boolean on **`profiles`** granting web `/admin` access. |
| **RLS** | Row Level Security — Postgres policies that hide rows from non-privileged queries. |
| **Service role key** | Server-only Supabase key that bypasses RLS — never expose to browsers. |
| **Pulse Shop catalog** | `shop_items` rows driving SKUs, sparks packs, borders, etc. |
| **Avatar frames** | `pulse_avatar_frames` — prestige/monthly ring catalog; grants in `user_pulse_avatar_frames`. |
| **RPC** | Postgres function invoked via `supabase.rpc(...)` (e.g. admin grant). |
| **`marketing_contact_messages`** | Inbound marketing/contact rows surfaced on **Leads / inquiries** after CRM-lite migration. |

---

## Document maintenance

- When new `/admin` routes or actions ship, update **Sections 4–11** and **Section 11**.  
- When onboarding staff, verify **`role_admin`** + walk through **Dashboard → Moderation → Merchandising → Partnerships (Advertiser overview + Media kit exports)** once.

---

*This manual describes application behavior as implemented in the PulseVerse codebase. Environment-specific URLs and policies may vary by deployment.*
