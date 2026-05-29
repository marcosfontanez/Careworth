import { describe, expect, it } from 'vitest';

import {
  FEED_CLIP_LIVE_UNAVAILABLE_LABEL,
  FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL,
  getFeedClipCompactBadgeLabel,
  parseFeedClipAttributionFromCaption,
  resolveFeedClipAttribution,
} from '@/lib/feedClipAttribution';
import type { Post } from '@/types';

const sourceCreator = { displayName: 'Alex Rivera', username: 'alexrn' };

const sourcePost = {
  id: 'source-1',
  creatorId: 'creator-1',
  creator: sourceCreator,
  caption: 'Original video',
  privacyMode: 'public',
  type: 'video',
} as Post;

describe('parseFeedClipAttributionFromCaption', () => {
  it('reads the first-line attribution prefix', () => {
    expect(
      parseFeedClipAttributionFromCaption('Clipped from @alexrn\n\nGreat tip'),
    ).toBe('Clipped from @alexrn');
  });
});

describe('resolveFeedClipAttribution', () => {
  it('links to source post when available', () => {
    const resolved = resolveFeedClipAttribution(
      { sourcePostId: 'source-1', sourceLiveStreamId: undefined, sourceCreatorId: 'creator-1', caption: '' },
      { sourcePost },
    );
    expect(resolved.creatorChip?.label).toBe('Clipped from @alexrn');
    expect(resolved.creatorChip?.navigable).toBe(true);
    expect(resolved.creatorChip?.target).toEqual({ kind: 'source_post', postId: 'source-1' });
  });

  it('falls back to creator profile when source post is unavailable', () => {
    const resolved = resolveFeedClipAttribution(
      {
        sourcePostId: 'source-1',
        sourceCreatorId: 'creator-1',
        caption: 'Clipped from @alexrn\n\nBody',
      },
      { sourcePost: null, sourceCreatorProfile: sourceCreator },
    );
    expect(resolved.creatorChip?.label).toBe('Clipped from @alexrn');
    expect(resolved.creatorChip?.sourceUnavailable).toBe(true);
    expect(resolved.creatorChip?.target).toEqual({ kind: 'source_creator', userId: 'creator-1' });
  });

  it('shows original unavailable when source post and creator are gone', () => {
    const resolved = resolveFeedClipAttribution(
      { sourcePostId: 'source-1', sourceCreatorId: undefined, caption: '' },
      { sourcePost: null },
    );
    expect(resolved.creatorChip?.label).toBe(FEED_CLIP_ORIGINAL_UNAVAILABLE_LABEL);
    expect(resolved.creatorChip?.navigable).toBe(false);
  });

  it('shows private/deleted source as unavailable with caption fallback', () => {
    const resolved = resolveFeedClipAttribution(
      {
        sourcePostId: 'source-1',
        sourceCreatorId: undefined,
        caption: 'Clipped from @alexrn\n\nBody',
      },
      { sourcePost: null },
    );
    expect(resolved.creatorChip?.label).toBe('Clipped from @alexrn');
    expect(resolved.creatorChip?.sourceUnavailable).toBe(true);
    expect(resolved.creatorChip?.navigable).toBe(false);
  });

  it('preserves live lineage chip', () => {
    const resolved = resolveFeedClipAttribution(
      { sourcePostId: 'source-1', sourceLiveStreamId: 'live-1', sourceCreatorId: 'creator-1', caption: '' },
      { sourcePost, liveStreamAvailable: true },
    );
    expect(resolved.liveChip?.label).toBe('Clipped from Live');
    expect(resolved.liveChip?.target).toEqual({ kind: 'live_stream', streamId: 'live-1' });
  });

  it('marks live unavailable when replay is gone', () => {
    const resolved = resolveFeedClipAttribution(
      { sourcePostId: 'source-1', sourceLiveStreamId: 'live-1', sourceCreatorId: 'creator-1', caption: '' },
      { sourcePost, liveStreamAvailable: false },
    );
    expect(resolved.liveChip?.label).toBe(FEED_CLIP_LIVE_UNAVAILABLE_LABEL);
    expect(resolved.liveChip?.navigable).toBe(false);
  });

  it('uses stored creator id when source post id was cleared on delete', () => {
    const resolved = resolveFeedClipAttribution(
      {
        sourcePostId: undefined,
        sourceCreatorId: 'creator-1',
        caption: 'Clipped from @alexrn\n\nBody',
      },
      { sourceCreatorProfile: sourceCreator },
    );
    expect(resolved.creatorChip?.label).toBe('Clipped from @alexrn');
    expect(resolved.creatorChip?.target).toEqual({ kind: 'source_creator', userId: 'creator-1' });
    expect(resolved.creatorChip?.sourceUnavailable).toBe(true);
  });
});

describe('getFeedClipCompactBadgeLabel', () => {
  it('returns caption attribution on grids when present', () => {
    expect(
      getFeedClipCompactBadgeLabel({
        sourcePostId: 'source-1',
        caption: 'Clipped from @alexrn\n\nTip',
      }),
    ).toBe('Clipped from @alexrn');
  });

  it('returns live clip label for live lineage', () => {
    expect(
      getFeedClipCompactBadgeLabel({
        sourceLiveStreamId: 'live-1',
        caption: '',
      }),
    ).toBe('Live clip');
  });
});
