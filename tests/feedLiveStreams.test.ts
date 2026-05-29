import { describe, expect, it } from 'vitest';

import { filterFeedLiveStreams } from '@/lib/live/feedLiveStreams';

const now = Date.now();

function liveRow(id: string) {
  return {
    id,
    status: 'live' as const,
    endedAt: undefined,
    broadcastStartedAt: new Date(now - 60_000).toISOString(),
    hostLastSeenAt: new Date(now - 15_000).toISOString(),
    startedAt: new Date(now - 120_000).toISOString(),
  };
}

describe('filterFeedLiveStreams', () => {
  it('keeps active real streams', () => {
    const rows = filterFeedLiveStreams([liveRow('real-stream-1')]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('real-stream-1');
  });

  it('drops demo-live preview rows', () => {
    const rows = filterFeedLiveStreams([liveRow('demo-live-casual-wellness'), liveRow('real-stream-2')]);
    expect(rows.map((r) => r.id)).toEqual(['real-stream-2']);
  });

  it('drops stale streams', () => {
    const rows = filterFeedLiveStreams([
      {
        ...liveRow('stale'),
        hostLastSeenAt: new Date(now - 10 * 60_000).toISOString(),
      },
    ]);
    expect(rows).toHaveLength(0);
  });
});
