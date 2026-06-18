import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  callRankedFeedRpc,
  shouldInjectSponsoredFeedPost,
  type RankedFeedRpcClient,
} from '@/lib/feedRankerRpc';

function mockClient(handlers: Record<string, () => Promise<{ data: unknown; error: null } | { data: null; error: { message: string } }>>): RankedFeedRpcClient {
  return {
    rpc: vi.fn(async (fn: string, _args: Record<string, unknown>) => {
      const handler = handlers[fn];
      if (!handler) throw new Error(`unexpected rpc ${fn}`);
      return handler();
    }),
  };
}

describe('callRankedFeedRpc', () => {
  it('returns v4 rows on success', async () => {
    const client = mockClient({
      get_ranked_feed_v4: async () => ({
        data: [{ post_id: 'p-v4', score: 99, source: 'personalized' }],
        error: null,
      }),
    });

    const rows = await callRankedFeedRpc(client, 'viewer-1', 10);
    expect(rows).toEqual([{ post_id: 'p-v4', score: 99, source: 'personalized' }]);
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledWith('get_ranked_feed_v4', {
      viewer_id: 'viewer-1',
      feed_limit: 10,
      exclude_post_ids: [],
    });
  });

  it('falls back to v3 when v4 errors', async () => {
    const client = mockClient({
      get_ranked_feed_v4: async () => ({ data: null, error: { message: 'function missing' } }),
      get_ranked_feed_v3: async () => ({
        data: [{ post_id: 'p-v3', score: 50, source: 'cold_start' }],
        error: null,
      }),
    });

    const rows = await callRankedFeedRpc(client, 'viewer-1', 10);
    expect(rows).toEqual([{ post_id: 'p-v3', score: 50, source: 'cold_start' }]);
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it('falls back to v3 when v4 returns an empty array', async () => {
    const client = mockClient({
      get_ranked_feed_v4: async () => ({ data: [], error: null }),
      get_ranked_feed_v3: async () => ({
        data: [{ post_id: 'p-v3-empty-fallback', score: 12 }],
        error: null,
      }),
    });

    const rows = await callRankedFeedRpc(client, 'viewer-1', 10);
    expect(rows[0]?.post_id).toBe('p-v3-empty-fallback');
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it('passes exclude_post_ids to v4 and v3', async () => {
    const client = mockClient({
      get_ranked_feed_v4: async () => ({ data: [], error: null }),
      get_ranked_feed_v3: async () => ({
        data: [{ post_id: 'p-new', score: 1 }],
        error: null,
      }),
    });

    await callRankedFeedRpc(client, 'viewer-1', 8, ['seen-a', 'seen-b']);
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'get_ranked_feed_v4', {
      viewer_id: 'viewer-1',
      feed_limit: 8,
      exclude_post_ids: ['seen-a', 'seen-b'],
    });
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'get_ranked_feed_v3', {
      viewer_id: 'viewer-1',
      feed_limit: 8,
      exclude_post_ids: ['seen-a', 'seen-b'],
    });
  });
});

describe('migration 304 v4 interest synonyms', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/304_feed_ranker_v4_interest_synonyms.sql',
  );
  const sql = readFileSync(migrationPath, 'utf8');

  it('patches v4 cold-start to expand interests via feed_interest_match_topics', () => {
    expect(sql).toContain('feed_interest_match_topics(ui.interest)');
    expect(sql).toContain('viewer_interest_topics as (');
    expect(sql).toContain('count(distinct vi.topic)::int * 15');
    expect(sql).not.toContain('viewer_interests as (');
  });
});

describe('sponsored feed injection gate', () => {
  it('requires both sponsored flags to be ON', () => {
    expect(
      shouldInjectSponsoredFeedPost({ sponsoredPosts: false, sponsoredPlacementDelivery: false }),
    ).toBe(false);
    expect(
      shouldInjectSponsoredFeedPost({ sponsoredPosts: true, sponsoredPlacementDelivery: false }),
    ).toBe(false);
    expect(
      shouldInjectSponsoredFeedPost({ sponsoredPosts: false, sponsoredPlacementDelivery: true }),
    ).toBe(false);
    expect(
      shouldInjectSponsoredFeedPost({ sponsoredPosts: true, sponsoredPlacementDelivery: true }),
    ).toBe(true);
  });

  it('default sponsored flags stay OFF (matches lib/featureFlags defaults)', () => {
    expect(shouldInjectSponsoredFeedPost({ sponsoredPosts: false, sponsoredPlacementDelivery: false })).toBe(
      false,
    );
  });
});
