import { describe, expect, it } from 'vitest';

import { canClipFeedPost, canDownloadFeedPost } from '@/lib/feedClipPermissions';
import type { Post } from '@/types';

const baseVideo: Pick<
  Post,
  | 'id'
  | 'type'
  | 'isAnonymous'
  | 'mediaUrl'
  | 'thumbnailUrl'
  | 'mediaProcessingStatus'
  | 'creatorId'
  | 'privacyMode'
  | 'allowViewerClips'
  | 'allowClipDownloads'
> = {
  id: 'p1',
  type: 'video',
  isAnonymous: false,
  mediaUrl: 'https://x.supabase.co/storage/v1/object/public/post-media/u/v.mp4',
  thumbnailUrl: undefined,
  mediaProcessingStatus: undefined,
  creatorId: 'creator-1',
  privacyMode: 'public',
  allowViewerClips: true,
  allowClipDownloads: false,
};

describe('canClipFeedPost', () => {
  it('allows owner on own video even when clips disabled for others', () => {
    expect(
      canClipFeedPost(
        { ...baseVideo, allowViewerClips: false },
        { id: 'creator-1' },
        { feedClippingEnabled: true },
      ).allowed,
    ).toBe(true);
  });

  it('blocks when feature disabled', () => {
    const r = canClipFeedPost(baseVideo, { id: 'viewer' }, { feedClippingEnabled: false });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('feature_disabled');
  });

  it('blocks anonymous posts', () => {
    const r = canClipFeedPost({ ...baseVideo, isAnonymous: true }, { id: 'viewer' }, { feedClippingEnabled: true });
    expect(r.allowed).toBe(false);
  });

  it('blocks processing posts', () => {
    const r = canClipFeedPost(
      { ...baseVideo, mediaProcessingStatus: 'queued' },
      { id: 'creator-1' },
      { feedClippingEnabled: true },
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('processing');
  });

  it('allows remix-eligible public video for other users when clips allowed', () => {
    expect(canClipFeedPost(baseVideo, { id: 'viewer-2' }, { feedClippingEnabled: true }).allowed).toBe(true);
  });

  it('blocks public video when creator disabled clips', () => {
    const r = canClipFeedPost(
      { ...baseVideo, allowViewerClips: false },
      { id: 'viewer-2' },
      { feedClippingEnabled: true },
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('creator_disabled');
  });

  it('blocks followers-only by default even when viewer follows', () => {
    const r = canClipFeedPost(
      { ...baseVideo, privacyMode: 'followers', allowViewerClips: false },
      { id: 'viewer-2' },
      { feedClippingEnabled: true, viewerFollowsCreator: true },
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('creator_disabled');
  });

  it('allows followers-only when creator enabled clips and viewer follows', () => {
    expect(
      canClipFeedPost(
        { ...baseVideo, privacyMode: 'followers', allowViewerClips: true },
        { id: 'viewer-2' },
        { feedClippingEnabled: true, viewerFollowsCreator: true },
      ).allowed,
    ).toBe(true);
  });

  it('blocks followers-only for non-owner non-follower', () => {
    const r = canClipFeedPost(
      { ...baseVideo, privacyMode: 'followers', allowViewerClips: true },
      { id: 'viewer-2' },
      { feedClippingEnabled: true },
    );
    expect(r.allowed).toBe(false);
  });

  it('blocks external media URLs', () => {
    const r = canClipFeedPost(
      { ...baseVideo, mediaUrl: 'https://cdn.example.com/v.mp4' },
      { id: 'creator-1' },
      { feedClippingEnabled: true },
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('storage_unavailable');
  });
});

describe('canDownloadFeedPost', () => {
  it('allows owner download', () => {
    expect(canDownloadFeedPost(baseVideo, { id: 'creator-1' })).toBe(true);
  });

  it('blocks others when downloads disabled', () => {
    expect(canDownloadFeedPost(baseVideo, { id: 'viewer' })).toBe(false);
  });

  it('allows others when downloads enabled', () => {
    expect(
      canDownloadFeedPost({ ...baseVideo, allowClipDownloads: true }, { id: 'viewer' }),
    ).toBe(true);
  });
});
