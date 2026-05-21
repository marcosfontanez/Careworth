# Phase 2 — beta hardening validation checklist

Use after deploying Phase 1 (**migration 190**) and Phase 2 (**migration 191**) code, before expanding beyond a small closed tester cohort.

See also: **`docs/PHASE_1_RELEASE_VALIDATION.md`**, **`docs/LAUNCH_RUNBOOK.md`**.

---

## A. New migrations / RPC changes (191)

Apply with:

```powershell
npm run db:push
```

| Change | Purpose |
|--------|---------|
| **`191_phase2_beta_hardening.sql`** | Strict `economy_send_creator_gift` context validation; adds `public.notifications` to `supabase_realtime` publication |

### Gift context validation (`economy_send_creator_gift`)

Supported `context_type` values:

| Type | `context_id` rule |
|------|-------------------|
| `profile` | Must equal `creator_user_id` |
| `post` | Post must exist; `posts.creator_id` must equal `creator_user_id` |
| `live` | Stream must exist; `live_streams.host_id` must equal `creator_user_id`; stream must not be `ended` |

Rejected patterns (RPC raises `invalid_gift_context` or `invalid_recipient`):

- Unknown context type
- Fake / nonexistent UUID for post or live
- Mismatched post owner vs gift recipient
- Mismatched live host vs gift recipient
- Profile gift where `context_id` ≠ creator profile id
- Gift on ended live stream
- Creator profile not found

---

## B. Edge functions to redeploy

Redeploy if you changed push payload routing:

```powershell
npx supabase functions deploy notify-expo-push --no-verify-jwt
```

No new Edge Functions in Phase 2.

---

## C. Notification freshness expectations

Phase 2 uses **both**:

1. **Supabase Realtime** — `public.notifications` INSERT/UPDATE for the signed-in user (requires migration **191** publication add + app Realtime enabled).
2. **15s polling fallback** — `useNotifications` / `useUnreadCount` refetch interval if Realtime is unavailable.

Expected UX after deploy:

- Unread badge updates within **~1 second** when Realtime is connected.
- Worst case (Realtime blocked): badge refreshes within **~15 seconds**.

Verify Realtime: Supabase Dashboard → **Database → Publications** → `supabase_realtime` includes `notifications`.

---

## D. Terms acceptance (single source of truth)

- **Signup** (`app/auth/login.tsx`) no longer has a consent checkbox.
- **Authoritative consent** is `profiles.terms_and_privacy_accepted_at`, set only on **`app/auth/legal-ack.tsx`** after first sign-in.
- New users must complete the legal/HIPAA gate before entering the app.

---

## E. Push notification deep links

Webhook: INSERT on `public.notifications` → `notify-expo-push`.

| Notification type | Tap destination | Payload fields |
|-------------------|-----------------|---------------|
| `new_follower` | `/profile/{followerId}` | `profileId`, `url` |
| `comment` | `/post/{postId}` | `postId`, `url` |
| `reply` (post) | `/post/{postId}` | `postId`, `url` |
| `reply` (My Pulse) | `/my-pulse` | `url` (target `profile_update:…`) |
| `circle_thread_reply` | `/communities/{slug}/thread/{id}` | `circleSlug`, `threadId`, `url` |
| `like` / `save` / `share` / `reaction` | `/post/{postId}` | `postId`, `url` |
| `creator_new_post` | `/post/{postId}` | `postId`, `url` |
| `tier_up` | `/profile/{userId}` | `profileId`, `url` |

**Not supported for push tap routing (by design):**

- Economy gift notifications (`diamonds_earned`, `gift_sent`) — inserted via `_economy_user_notify` into `user_notifications`, not `public.notifications`; no webhook push today.

---

## F. Manual QA checklist

### 1. Gift context validation

- [ ] Valid **post** gift from feed / post detail succeeds; creator receives Diamonds.
- [ ] Valid **profile** gift from public profile succeeds.
- [ ] Valid **live** gift during active stream succeeds.
- [ ] Fake post UUID fails with user-friendly “gift target is no longer valid” message.
- [ ] Gift to post owned by a **different** creator fails server-side.

### 2. Profile reporting

- [ ] Open another user’s profile → overflow (⋯) → **Report profile**.
- [ ] Submit report → success toast/alert.
- [ ] Own profile overflow does **not** show Report (owner menu only).

### 3. Circle thread admin moderation

- [ ] Create a `circle_thread` report from the app.
- [ ] Admin web → Reports queue → open report → **Remove content** deletes thread.
- [ ] **Suspend subject** resolves author from `circle_threads.author_id`.

### 4. Notification live refresh

- [ ] User A follows User B → User B’s unread badge increments within ~1s (Realtime) or ≤15s (fallback).
- [ ] Comment on User B’s post → same timeliness check.
- [ ] Sign out → no duplicate Realtime subscriptions (no console errors on re-login).

### 5. Terms acceptance

- [ ] New email signup → no checkbox on signup form.
- [ ] First sign-in → routed to **Legal acknowledgment** screen.
- [ ] Accept → `terms_and_privacy_accepted_at` set; app entry proceeds.
- [ ] Returning user with timestamp set → skips legal gate.

### 6. Push notification taps (device build)

- [ ] `new_follower` → opens follower’s profile.
- [ ] Post `comment` → opens post (comments visible).
- [ ] Post `reply` → opens post (not notifications inbox).
- [ ] Circle thread reply → opens thread in circle.

---

## G. Admin / web deploy

If you run the marketing admin site separately, redeploy **web** after Phase 2 so `circle_thread` remove/suspend paths are live:

```powershell
# From your web deploy pipeline (Vercel, etc.)
```

Changed file: `web/src/lib/admin/moderation-mutations.ts`.
