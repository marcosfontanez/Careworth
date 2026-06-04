import { describe, expect, it } from 'vitest';

import {
  clipDefaultsFromProfile,
  initialPostClipSettings,
} from '@/lib/postCreatorClipDefaults';

describe('clipDefaultsFromProfile', () => {
  it('uses profile defaults when set', () => {
    expect(
      clipDefaultsFromProfile({
        defaultAllowViewerClips: false,
        defaultAllowRemix: false,
        defaultAllowClipDownloads: true,
      }),
    ).toEqual({
      defaultAllowViewerClips: false,
      defaultAllowRemix: false,
      defaultAllowClipDownloads: true,
    });
  });

  it('falls back to product defaults when profile missing', () => {
    expect(clipDefaultsFromProfile(null)).toEqual({
      defaultAllowViewerClips: true,
      defaultAllowRemix: true,
      defaultAllowClipDownloads: true,
    });
  });
});

describe('initialPostClipSettings', () => {
  const openDefaults = {
    defaultAllowViewerClips: true,
    defaultAllowRemix: true,
    defaultAllowClipDownloads: true,
  };

  it('inherits profile defaults for public uploads', () => {
    expect(initialPostClipSettings('public', openDefaults)).toEqual({
      allowViewerClips: true,
      allowRemix: true,
      allowClipDownloads: true,
    });
  });

  it('forces all off for followers-only uploads', () => {
    expect(initialPostClipSettings('followers', openDefaults)).toEqual({
      allowViewerClips: false,
      allowRemix: false,
      allowClipDownloads: false,
    });
  });

  it('respects profile defaults off for new public uploads', () => {
    expect(
      initialPostClipSettings('public', {
        defaultAllowViewerClips: false,
        defaultAllowRemix: false,
        defaultAllowClipDownloads: true,
      }),
    ).toEqual({
      allowViewerClips: false,
      allowRemix: false,
      allowClipDownloads: true,
    });
  });
});
