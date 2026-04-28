# Performance — Next Steps (Post-`062_indexes_audit`)

This is the runway of optimizations **not** shipped in the current
performance pass. Each item lists why it's deferred, how to evaluate
whether it's worth doing, and the rough work involved if you decide
to ship.

---

## 1. FlashList migration (Shopify's drop-in `<FlatList>` replacement)

### Status: **deferred — not auto-swap**

### Why we didn't ship it now

FlashList is genuinely faster than `FlatList` (recycles cells the way
native UICollectionView does, ~5× lower memory on long lists), **but**:

1. The full-screen vertical paging feed (`app/(tabs)/feed.tsx`) is
   our most performance-critical list, and FlashList's recycling
   model interacts subtly with `expo-video` when cells are
   reattached during fast paging. There are reports of intermittent
   black-frame-on-recycle bugs that need careful manual testing on
   physical devices, not the simulator.
2. The win on short lists (followers, comments threads, conversations)
   is small enough that the dependency add isn't justified for those
   alone — `FlatList` + `removeClippedSubviews` (already shipped in
   `T4.16`) covers the same ground for ~80% of the benefit.

### When to revisit

- After 1.0 launch, when you have real user-scroll telemetry showing
  jank specifically on long lists (FlashList shines >300 items).
- If you ever build a "Saved videos grid" or "Liked posts grid" that
  routinely renders >500 cells.

### How to evaluate

```bash
npx expo install @shopify/flash-list
```

Pick a short, *non-feed* list to migrate first (e.g.
`app/followers.tsx`). The API is mostly drop-in, but you must add the
`estimatedItemSize` prop and ensure `keyExtractor` returns a stable id.

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={data}
  keyExtractor={(item) => item.id}
  estimatedItemSize={72}    // measure your row height once
  renderItem={renderRow}
/>
```

Profile with the React DevTools Profiler **on a physical mid-tier
Android** before and after. If FPS during scroll improves by >15%,
expand to comments / messages / saved.

**Don't migrate the feed until you've shipped a hidden flag and
soaked it through TestFlight for at least a week.**

---

## 2. Pull `@/services/supabase` apart from a single barrel

### Status: **deferred — too risky for marginal win**

### Why

Currently every screen does
`import { postsService } from '@/services/supabase'` which reaches
into a barrel `services/supabase/index.ts` that re-exports ~18
service modules. With Metro's tree-shaking limitations in production,
some of those modules may end up in the main bundle even when
unused.

The fix is to import directly from the leaf path
`from '@/services/supabase/posts'` everywhere, but that's a 100+
file change and the actual measured impact (in bundle bytes) is
uncertain — could be as little as 50KB after Hermes bytecode
compression.

### How to evaluate

1. Build a release bundle: `npx expo export --platform ios`.
2. Inspect `dist/_expo/static/js/ios/*.hbc` size.
3. Manually rewrite `services/supabase/index.ts` to a single export
   and rebuild — diff the bundle sizes. If the delta is >100KB,
   the refactor is worthwhile.

---

## 3. Image CDN (Bunny.net or Cloudflare R2 + Image Resizing)

### Status: **deferred — needs external account + DNS**

### Current state

- All media (avatars, post images, thumbnails) lives in Supabase
  Storage and is served via Supabase's CDN (Fly.io edge — solid for
  US/EU, weaker in APAC).
- `lib/storage.ts` already calls Supabase's `/storage/v1/render/image`
  transform endpoint, so the byte-savings from `?width=` are already
  in place.

### Why move

- Bunny.net's image CDN is ~3× faster TTFB in APAC and South America.
- Pricing: $0.005 per GB outbound vs Supabase's $0.09 per GB. Once
  you cross ~50GB/month of egress, Bunny pays for itself plus a
  meaningful cost reduction.

### Migration path

1. Sign up for Bunny.net Storage + Image Optimizer pull zone.
2. Configure the pull zone to use your Supabase Storage public URL
   as the origin.
3. Add an env var `EXPO_PUBLIC_IMAGE_CDN=https://yourzone.b-cdn.net`.
4. Update `lib/storage.ts:withSupabaseImageTransform` so that when
   `EXPO_PUBLIC_IMAGE_CDN` is set, it rewrites
   `https://<project>.supabase.co/storage/v1/object/public/...` →
   `https://<cdn>/<path>?width=...&quality=...`.
5. Bunny's transform query syntax differs from Supabase's — wrap the
   parameter mapping in `lib/storage.ts` so callers don't change.

**Estimated work:** half a day. **Estimated saving:** ~40% faster
image loads worldwide, ~30–50% bandwidth bill reduction at scale.

---

## 4. HLS adaptive video streaming

### Status: **deferred — significant infrastructure work**

### Current state

Videos are uploaded as MP4 (H.264) and played directly via
`expo-video`. No bitrate adaptation — a user on a slow LTE connection
loads the same 1.8 Mbps file as a user on Wi-Fi. (After the
`videoCompression.ts` change in the previous pass we're already at
720p / 1.8 Mbps, which is reasonable, but still not adaptive.)

### Why move

- HLS allows the video player to switch between 360p / 480p / 720p
  segments based on real-time bandwidth, eliminating buffering on
  weak connections.
- The lowest-resolution variant starts playing 2–3× faster (smaller
  initial segment to download).

### Migration path (rough — ~1 week of work)

1. Modify the existing FFmpeg worker on Fly.io
   (`docker-compose.yml` for the export queue) to also produce HLS
   ladder output: 360p / 480p / 720p `.ts` segments + `.m3u8`
   playlist on every video upload.
2. Store the playlist + segments in `post-media/` under a
   per-post folder.
3. Update `lib/videoCompression.ts` upload flow to upload to Bunny
   Storage (or keep on Supabase) and write a single `playlist.m3u8`
   reference into `posts.media_url`.
4. `expo-video` supports HLS natively on iOS — Android needs
   `expo-av`'s HLS playback OR `react-native-video` with ExoPlayer.
   Audit per-platform.

**Cost trade-off:** transcoding to a 3-rung ladder triples FFmpeg
CPU-time per upload. Worth it once you have >1000 videos uploaded
per day; not worth it for a launch-stage app.

---

## 5. Supabase Edge Functions for hot reads

### Status: **deferred — measure first**

### Why move

Currently the For You feed runs through PostgREST (Supabase's
auto-generated REST layer over Postgres). For the most-hit endpoint
(the feed query), an Edge Function written in Deno can:

- Sit closer to the user (Cloudflare Workers edge POPs vs Fly.io's
  fewer regions).
- Cache aggressively at the edge with custom invalidation.
- Pre-shape the response to drop fields the client doesn't need
  (you'd already be on top of this with `T1.1: trim POST_SELECT`).

### How to evaluate

Before doing this, measure: enable Supabase's slow query log and
look at the p95 latency of `select * from posts ...` queries against
the For You ranking. If p95 is <150ms, the marginal Edge Function
win is small. If p95 is consistently >250ms (especially on global
users), Edge Functions become attractive.

### Migration sketch

```ts
// supabase/functions/feed-for-you/index.ts
import { serve } from 'https://deno.land/std/http/server.ts';

serve(async (req) => {
  const userId = /* validate JWT */;
  const cacheKey = `feed:${userId}`;
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const { data } = await supabase.rpc('feed_for_you_v1', { p_user_id: userId });
  const res = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=15',
    },
  });
  await caches.default.put(cacheKey, res.clone());
  return res;
});
```

Then in the client, route the feed query to
`https://<project>.supabase.co/functions/v1/feed-for-you` instead of
`postsService.getFeed`.

---

## 6. PgBouncer (transaction-mode connection pooler)

### Status: **verify — likely already on**

### Why

The Supabase Pro plan exposes two connection strings:

- `db.<ref>.supabase.co:5432` — direct, capped at ~60 connections.
- `db.<ref>.supabase.co:6543` — pgbouncer (transaction mode),
  effectively unlimited.

The Expo client uses Supabase's HTTP REST layer, which already goes
through pgbouncer. **But** any server-side workers (the Fly.io export
worker, any cron job, future Edge Functions) need to use port `6543`
in their connection strings. Audit:

```bash
# In your Fly.io worker repo
grep -r ":5432" .

# Should return zero hits (or only test/dev configs).
```

If you find any `:5432` in production server code, switch to `:6543`
and add `?pgbouncer=true&statement_cache_size=0` to the URL.

---

## 7. Materialize the For You ranking score

### Status: **deferred — only matters at scale**

### Why

The For You feed currently runs the ranking score computation on
every page load (see `runRankedForYouFeed` in
`services/supabase/posts.ts`). For each post it pulls signals from
multiple tables and computes weights at query time.

At >100 active users / minute, this query becomes the dominant
database load. The fix is to materialize a `feed_ranked_today` view
that's refreshed every 5 minutes by `pg_cron`.

```sql
create materialized view public.feed_ranked_today as
select * from public.compute_feed_ranking_today();

create unique index on public.feed_ranked_today (post_id);

select cron.schedule(
  'refresh-feed-ranked-today',
  '*/5 * * * *',
  $$ refresh materialized view concurrently public.feed_ranked_today; $$
);
```

The client query becomes a simple `select * from feed_ranked_today
order by score desc limit 50` — sub-10ms regardless of how many
posts exist in the system.

**Trade-off:** feed freshness drops from "instantaneous" to "up to
5min behind", which is fine for a TikTok-style feed but might be
surprising for power users. Worth doing only after launch when
you have real query-load data.

---

## Sign-off

These are all real, measurable optimizations — but each carries a
cost (refactor risk, infra spend, ongoing complexity). Ship them in
order of measured pain, not theoretical impact.

If you only do one in the next quarter, do **#3 — image CDN** once
you cross 50GB/month of media egress. The cost saving alone funds
most of the year's other infra bills.
