# notify-expo-push

Sends an **Expo push** when a row is inserted into `public.notifications`, using the recipient’s `profiles.push_token`.

## 1. Deploy

```bash
npx supabase functions deploy notify-expo-push --no-verify-jwt
```

`--no-verify-jwt` is recommended so **Database Webhooks** (no user JWT) can invoke the function.

## 2. Secrets

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or `npx supabase secrets set`):

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Usually auto-injected; confirm present |
| `SUPABASE_SERVICE_ROLE_KEY` | Read `profiles.push_token`, `communities.slug` |
| `PUBLIC_SITE_URL` | Canonical HTTPS base for `data.url` (default `https://pulseverse.app`) |
| `EXPO_ACCESS_TOKEN` | Optional but recommended for Expo Push API ([Expo docs](https://docs.expo.dev/push-notifications/sending-notifications/)) |
| `NOTIFY_PUSH_WEBHOOK_SECRET` | Optional; if set, webhook must send header `x-webhook-secret: <same value>` |

## 3. Database Webhook

1. **Database → Webhooks → Create hook**
2. **Table:** `notifications`
3. **Events:** Insert
4. **Type:** Supabase Edge Functions → choose `notify-expo-push`
5. If you set `NOTIFY_PUSH_WEBHOOK_SECRET`, add it as a custom header on the webhook (`x-webhook-secret`).

## Payload shape

Circle thread replies (after migration `088_notifications_community_id.sql`) include `community_id`, so the push `data` can include:

- `circleSlug`, `threadId`, `url` — consumed by `lib/notifications.ts` and `lib/deepLink.ts`.

Other notification types get `postId`, `profileId`, or a generic `url` where applicable.

My Pulse comments (migration **`089_profile_update_comment_notifications.sql`**) use `target_id` like `profile_update:<uuid>`; pushes include `url` → `https://<site>/my-pulse`.

## Notes

- **No server-side “muted circles”:** device mute only affects in-app notification queries; pushes still fire unless you add storage + branching here or skip inserts server-side.
- Apply **`088_notifications_community_id.sql`** before relying on circle deep links in push `data`.
