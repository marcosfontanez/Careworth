/** One row from get_ranked_feed_v4 / v3 / v2 / v1. */
export type RankedFeedRow = { post_id: string; score: number; source?: string };

export type RankedFeedRpcResult = { data: unknown; error: { message: string } | null };

export type RankedFeedRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<RankedFeedRpcResult>;
};

/**
 * Personalized ranker call with documented fallback chain.
 *
 * Try order (each tier is additive on the prior):
 *   0. get_ranked_feed_v4 — seen-aware soft exclusion + per-open jitter
 *   1. get_ranked_feed_v3 — paginatable exclude_post_ids + exclusions
 *   2. get_ranked_feed_v2 — personalization without exclude_post_ids
 *   3. get_ranked_feed     — baseline scorer only
 *
 * Empty v4/v3 results (no error) fall through to the next tier so the feed
 * never goes blank when a ranker returns zero candidates.
 */
export async function callRankedFeedRpc(
  client: RankedFeedRpcClient,
  viewerId: string,
  feedLimit: number,
  excludeIds: readonly string[] = [],
): Promise<RankedFeedRow[]> {
  const excludeArray = excludeIds.length ? Array.from(new Set(excludeIds)) : ([] as string[]);
  const excludeSet = new Set(excludeArray);
  const headroom = excludeArray.length;

  const v4 = await client.rpc('get_ranked_feed_v4', {
    viewer_id: viewerId,
    feed_limit: feedLimit,
    exclude_post_ids: excludeArray,
  });
  if (!v4.error && Array.isArray(v4.data) && v4.data.length) {
    return v4.data as RankedFeedRow[];
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__ && v4.error) {
    console.warn('get_ranked_feed_v4 unavailable, falling back to v3:', v4.error.message);
  }

  const v3 = await client.rpc('get_ranked_feed_v3', {
    viewer_id: viewerId,
    feed_limit: feedLimit,
    exclude_post_ids: excludeArray,
  });
  if (!v3.error && Array.isArray(v3.data) && v3.data.length) {
    return v3.data as RankedFeedRow[];
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__ && v3.error) {
    console.warn('get_ranked_feed_v3 unavailable, falling back to v2:', v3.error.message);
  }

  const v2 = await client.rpc('get_ranked_feed_v2', {
    viewer_id: viewerId,
    feed_limit: feedLimit + headroom,
  });
  if (!v2.error && Array.isArray(v2.data) && v2.data.length) {
    const rows = v2.data as RankedFeedRow[];
    return rows.filter((r) => !excludeSet.has(r.post_id));
  }
  if (typeof __DEV__ !== 'undefined' && __DEV__ && v2.error) {
    console.warn('get_ranked_feed_v2 unavailable, falling back to v1:', v2.error.message);
  }

  const v1 = await client.rpc('get_ranked_feed', {
    viewer_id: viewerId,
    feed_limit: feedLimit + headroom,
  });
  if (v1.error) throw v1.error;
  const v1Rows = (v1.data ?? []) as RankedFeedRow[];
  return v1Rows.filter((r) => !excludeSet.has(r.post_id));
}

/** Mirrors feed tab sponsored injection gate — both flags must be ON. */
export function shouldInjectSponsoredFeedPost(flags: {
  sponsoredPosts: boolean;
  sponsoredPlacementDelivery: boolean;
}): boolean {
  return flags.sponsoredPosts && flags.sponsoredPlacementDelivery;
}
