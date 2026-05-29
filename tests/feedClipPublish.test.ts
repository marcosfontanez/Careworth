import { describe, expect, it } from 'vitest';

import { buildFeedClipPublishPayload } from '@/lib/feedClipPublish';
import { getFeedClipAttribution } from '@/lib/feedClipLabels';
import type { Post } from '@/types';

const sourcePost = {
  id: 'source-1',
  creatorId: 'creator-1',
  creator: { displayName: 'Alex', username: 'alexrn' },
  sourceLiveStreamId: 'live-1',
} as Pick<Post, 'id' | 'creatorId' | 'creator' | 'sourceLiveStreamId'> as Post;

describe('buildFeedClipPublishPayload', () => {
  it('maps attribution and lineage fields', () => {
    const payload = buildFeedClipPublishPayload({
      sourcePost,
      trimStartSec: 2,
      trimEndSec: 12,
      caption: 'Great tip',
      hashtags: ['nursing'],
      phiAcknowledged: true,
    });
    expect(payload.source_post_id).toBe('source-1');
    expect(payload.source_creator_id).toBe('creator-1');
    expect(payload.source_live_stream_id).toBe('live-1');
    expect(payload.clip_start_seconds).toBe(2);
    expect(payload.clip_end_seconds).toBe(12);
    expect(payload.caption).toContain('Clipped from');
    expect(payload.caption).toContain('Great tip');
  });
});

describe('getFeedClipAttribution', () => {
  it('returns live and creator labels', () => {
    const labels = getFeedClipAttribution(
      { sourcePostId: 'source-1', sourceLiveStreamId: 'live-1' },
      { displayName: 'Alex', username: 'alexrn' },
    );
    expect(labels.liveLabel).toBe('Clipped from Live');
    expect(labels.creatorLabel).toContain('Clipped from');
  });
});
