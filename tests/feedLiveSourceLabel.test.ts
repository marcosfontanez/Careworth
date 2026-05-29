import { describe, expect, it } from 'vitest';

import { getFeedLiveSourceLabel } from '@/lib/feedLiveSourceLabel';

describe('getFeedLiveSourceLabel', () => {
  it('returns null for normal posts', () => {
    expect(getFeedLiveSourceLabel({})).toBeNull();
    expect(getFeedLiveSourceLabel({ sourceLiveStreamId: '' })).toBeNull();
  });

  it('labels clip posts from live', () => {
    expect(getFeedLiveSourceLabel({ sourceLiveStreamId: 'stream-123' })).toBe('Clipped from Live');
  });
});
