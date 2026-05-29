import { describe, expect, it } from 'vitest';

import {
  canProcessFeedClipStorage,
  parsePostMediaStoragePath,
  resolveFeedClipSourceMediaUrl,
} from '@/lib/feedClipStorage';

describe('feedClipStorage', () => {
  it('parses post-media public URLs', () => {
    const parsed = parsePostMediaStoragePath(
      'https://x.supabase.co/storage/v1/object/public/post-media/user/abc.mp4',
    );
    expect(parsed).toEqual({ bucket: 'post-media', path: 'user/abc.mp4' });
  });

  it('rejects external media URLs', () => {
    expect(parsePostMediaStoragePath('https://cdn.example.com/video.mp4')).toBeNull();
  });

  it('prefers mediaUrl over thumbnailUrl', () => {
    expect(
      resolveFeedClipSourceMediaUrl({
        mediaUrl: 'https://x.supabase.co/storage/v1/object/public/post-media/a.mp4',
        thumbnailUrl: 'https://x.supabase.co/storage/v1/object/public/post-media/b.jpg',
      }),
    ).toContain('a.mp4');
  });

  it('detects trimmable post-media storage', () => {
    expect(
      canProcessFeedClipStorage({
        mediaUrl: 'https://x.supabase.co/storage/v1/object/public/post-media/u/v.mp4',
        thumbnailUrl: undefined,
      }),
    ).toBe(true);
    expect(
      canProcessFeedClipStorage({
        mediaUrl: 'https://youtube.com/watch?v=abc',
        thumbnailUrl: undefined,
      }),
    ).toBe(false);
  });
});
