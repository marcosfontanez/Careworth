import { describe, expect, it } from 'vitest';

import {
  canDownloadPostWithCreatorSettings,
  canRemixPostWithCreatorSettings,
  isPostOwner,
  postAllowsClipDownloads,
  postAllowsRemix,
  postAllowsViewerClips,
} from '@/lib/postCreatorPermissions';
import type { Post } from '@/types';

const baseVideo: Pick<
  Post,
  | 'type'
  | 'isAnonymous'
  | 'mediaUrl'
  | 'thumbnailUrl'
  | 'allowRemix'
  | 'allowClipDownloads'
  | 'creatorId'
  | 'mediaProcessingStatus'
> = {
  type: 'video',
  isAnonymous: false,
  mediaUrl: 'https://x.supabase.co/storage/v1/object/public/post-media/u/v.mp4',
  thumbnailUrl: undefined,
  allowRemix: true,
  allowClipDownloads: false,
  creatorId: 'creator-1',
  mediaProcessingStatus: undefined,
};

describe('postAllows* helpers', () => {
  it('treats missing clip flags as allowed except downloads', () => {
    expect(postAllowsViewerClips({ allowViewerClips: undefined })).toBe(true);
    expect(postAllowsRemix({ allowRemix: undefined })).toBe(true);
    expect(postAllowsClipDownloads({ allowClipDownloads: undefined })).toBe(false);
  });

  it('respects explicit deny flags', () => {
    expect(postAllowsViewerClips({ allowViewerClips: false })).toBe(false);
    expect(postAllowsRemix({ allowRemix: false })).toBe(false);
    expect(postAllowsClipDownloads({ allowClipDownloads: true })).toBe(true);
  });
});

describe('isPostOwner', () => {
  it('matches viewer id to creator id', () => {
    expect(isPostOwner({ creatorId: 'c1' }, { id: 'c1' })).toBe(true);
    expect(isPostOwner({ creatorId: 'c1' }, { id: 'c2' })).toBe(false);
  });
});

describe('canRemixPostWithCreatorSettings', () => {
  it('allows owner on eligible video', () => {
    expect(canRemixPostWithCreatorSettings(baseVideo, { id: 'creator-1' })).toBe(true);
  });

  it('allows others when remix enabled', () => {
    expect(canRemixPostWithCreatorSettings(baseVideo, { id: 'viewer' })).toBe(true);
  });

  it('blocks others when remix disabled', () => {
    expect(
      canRemixPostWithCreatorSettings({ ...baseVideo, allowRemix: false }, { id: 'viewer' }),
    ).toBe(false);
  });
});

describe('canDownloadPostWithCreatorSettings', () => {
  it('allows owner download when media exists', () => {
    expect(canDownloadPostWithCreatorSettings(baseVideo, { id: 'creator-1' })).toBe(true);
  });

  it('blocks others when downloads disabled', () => {
    expect(canDownloadPostWithCreatorSettings(baseVideo, { id: 'viewer' })).toBe(false);
  });

  it('allows others when downloads enabled on eligible video', () => {
    expect(
      canDownloadPostWithCreatorSettings(
        { ...baseVideo, allowClipDownloads: true },
        { id: 'viewer' },
      ),
    ).toBe(true);
  });

  it('blocks others while processing', () => {
    expect(
      canDownloadPostWithCreatorSettings(
        { ...baseVideo, allowClipDownloads: true, mediaProcessingStatus: 'running' },
        { id: 'viewer' },
      ),
    ).toBe(false);
  });
});
