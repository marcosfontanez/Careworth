# Phase 3 — closed beta expansion validation

Use after Phase 1 (**190**), Phase 2 (**191–192**), and Phase 3 (**193**) are deployed, before widening the beta cohort.

See also: **`docs/PHASE_2_BETA_HARDENING_VALIDATION.md`**, **`docs/LAUNCH_RUNBOOK.md`**.

---

## A. Migrations to apply

```powershell
npm run db:push
```

Through **193**:

| Migration | Purpose |
|-----------|---------|
| **193** | Mirror `diamonds_earned` / `gift_sent` to `public.notifications` for push; lock `_economy_user_notify` to service_role |

---

## B. Edge functions to redeploy

```powershell
npx supabase functions deploy notify-expo-push --no-verify-jwt
```

**Webhook:** Keep **one** INSERT webhook on `public.notifications` → `notify-expo-push`.  
Phase 3 mirrors economy gift events into that table — **no second webhook** on `user_notifications`.

---

## C. Admin web redeploy

Redeploy the marketing/admin site so report queue previews and moderation actions include:

- `circle_thread`
- `live_stream` → `live`
- `stream_message` (soft-delete chat)

Changed: `web/src/lib/admin/queries.ts`, `web/src/lib/admin/moderation-mutations.ts`.

---

## D. Economy gift push architecture

**Decision:** Mirror push-eligible economy types into `public.notifications` inside `_economy_user_notify` (Option A).

| Type | `user_notifications` | `public.notifications` | Push deep link |
|------|---------------------|--------------------------|----------------|
| `diamonds_earned` | Yes (economy feed) | Yes (mirror) | `/pulse-shop` |
| `gift_sent` | Yes | Yes (mirror) | `/profile/{creator_id}` |
| Border / sparks purchase | Yes | No | N/A (in-app economy only) |

**Duplicate avoidance:** One mirror row per economy event; idempotent gift RPCs still call notify once. Push webhook fires once per mirror INSERT.

**Payload examples:**

```json
{
  "type": "diamonds_earned",
  "message": "+45 Diamonds from a gift",
  "target_id": "<creator_gift_uuid>",
  "data": { "url": "https://pulseverse.app/pulse-shop" }
}
```

```json
{
  "type": "gift_sent",
  "message": "You sent …",
  "target_id": "<creator_profile_uuid>",
  "data": { "url": "https://pulseverse.app/profile/<creator_profile_uuid>", "profileId": "<creator_profile_uuid>" }
}
```

---

## E. Admin moderation coverage matrix

| App `target_type` | Queue preview | Remove content | Suspend subject |
|-------------------|---------------|----------------|-----------------|
| `post` | Caption + author | Delete post | Post creator |
| `comment` | Body + author | Delete comment | Comment author |
| `profile` | Display name | N/A (use Suspend) | Profile id |
| `live_stream` | Stream title + host | End stream | Host |
| `circle_thread` | Title/body + author | Delete thread | Thread author |
| `stream_message` | Chat body + author | Soft-delete message | Message author |

---

## F. Security verification (Phase 3)

After **193**, confirm in SQL:

```sql
-- _economy_user_notify not callable by clients
select has_function_privilege('authenticated', 'public._economy_user_notify(uuid,text,text,text,jsonb)', 'EXECUTE');
-- expect false

-- Economy release still service_role only
select has_function_privilege('authenticated', 'public.economy_release_pending_diamonds()', 'EXECUTE');
-- expect false
```

**Reviewed in Phase 3 (no code change needed):**

- `economy_release_pending_diamonds` — service_role only (122)
- `reward_delivery_enqueue_client` — hardened in 190 (proof-of-grant required)
- `increment_creator_earnings`, `bump_streak`, `update_user_streak`, `increment_poll_vote` — hardened in 180
- Staff analytics RPCs — admin gate in 157

**Fixed in Phase 3:**

- `_economy_user_notify` — explicit REVOKE from anon/authenticated/public

---

## G. Manual QA checklist

### Economy gift push

- [ ] User A sends creator gift → User B (creator) gets push “Diamonds earned” → tap opens **Pulse Shop**
- [ ] User A gets push “Gift sent” → tap opens **creator profile**
- [ ] Bell inbox shows same events (mirror rows)
- [ ] No duplicate pushes for one gift (single INSERT)

### Admin moderation

- [ ] Report each type from app → appears in admin queue with readable preview
- [ ] Remove: post, comment, circle thread, live (ends), stream message (tombstone)
- [ ] Suspend resolves correct author for each type

### Security smoke

- [ ] `_economy_user_notify` not invokable from client (PostgREST 403/404)
- [ ] Shop + wallets still load after **192** `_economy_is_admin` grant

---

## H. Known deferred risks

- `stream_message` reporting UI exists in `ReportModal` but no in-app report entry yet (admin path ready when wired)
- Economy border/sparks purchase types remain in `user_notifications` only (no push)
- Full SECURITY DEFINER inventory audit beyond economy/moderation scope — defer to pre-public launch
