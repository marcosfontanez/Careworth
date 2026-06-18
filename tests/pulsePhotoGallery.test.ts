import { describe, expect, it } from 'vitest';
import type { Post, ProfileUpdate } from '@/types';
import {
  buildMediaHubPhotoGallery,
  buildPulseUpdatePhotoGallery,
  findGalleryIndexByKey,
} from '@/lib/media/pulsePhotoGallery';

const basePost = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 'post-1',
    type: 'image',
    mediaUrl: 'https://cdn.example/a.jpg',
    caption: 'Hello',
    commentCount: 2,
    ...overrides,
  }) as Post;

const baseUpdate = (overrides: Partial<ProfileUpdate> = {}): ProfileUpdate =>
  ({
    id: 'upd-1',
    userId: 'user-1',
    type: 'pics',
    picsUrls: ['https://cdn.example/p1.jpg', 'https://cdn.example/p2.jpg'],
    content: 'My pics',
    ...overrides,
  }) as ProfileUpdate;

describe('buildMediaHubPhotoGallery', () => {
  it('maps image posts and skips processing failures', () => {
    const items = buildMediaHubPhotoGallery([
      { kind: 'post', key: 'post:ok', post: basePost() },
      {
        kind: 'post',
        key: 'post:bad',
        post: basePost({
          id: 'post-bad',
          mediaProcessingStatus: 'failed',
        }),
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.sourceType).toBe('feed');
    expect(items[0]?.showViewPost).toBe(true);
  });

  it('maps pulse-pic rows to my-pulse source', () => {
    const items = buildMediaHubPhotoGallery([
      {
        kind: 'pulse-pic',
        key: 'pulse:upd-1:0',
        updateId: 'upd-1',
        imageUrl: 'https://cdn.example/p1.jpg',
        caption: 'Caption',
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(items[0]?.sourceType).toBe('my-pulse');
    expect(items[0]?.pulseUpdateId).toBe('upd-1');
  });

  it('passes circle slug from image posts', () => {
    const items = buildMediaHubPhotoGallery([
      {
        kind: 'post',
        key: 'post:circle',
        post: basePost({ id: 'circle-post', linkedCommunitySlug: 'nurses' }),
      },
    ]);
    expect(items[0]?.sourceType).toBe('circle');
    expect(items[0]?.linkedCircleSlug).toBe('nurses');
  });

  it('hydrates pulse-pic likes from updatesById', () => {
    const updatesById = new Map([
      [
        'upd-1',
        baseUpdate({ id: 'upd-1', liked: true, likeCount: 9, linkedCircleSlug: 'nurses' }),
      ],
    ]);
    const items = buildMediaHubPhotoGallery(
      [
        {
          kind: 'pulse-pic',
          key: 'pulse:upd-1:0',
          updateId: 'upd-1',
          imageUrl: 'https://cdn.example/p1.jpg',
          caption: 'Caption',
          createdAt: new Date().toISOString(),
        },
      ],
      { updatesById },
    );
    expect(items[0]?.liked).toBe(true);
    expect(items[0]?.likeCount).toBe(9);
    expect(items[0]?.linkedCircleSlug).toBe('nurses');
  });
});

describe('buildPulseUpdatePhotoGallery', () => {
  it('returns one item per pic url', () => {
    const items = buildPulseUpdatePhotoGallery(baseUpdate());
    expect(items).toHaveLength(2);
    expect(items[1]?.id).toBe('pulse:upd-1:1');
  });

  it('prefers linked post metadata when present', () => {
    const linked = basePost({ id: 'linked', linkedCommunitySlug: 'nurses' });
    const items = buildPulseUpdatePhotoGallery(baseUpdate({ linkedPostId: 'linked' }), linked);
    expect(items[0]?.sourceType).toBe('circle');
    expect(items[0]?.pulseUpdateId).toBe('upd-1');
  });
});

describe('findGalleryIndexByKey', () => {
  it('finds index by hub key', () => {
    const items = buildMediaHubPhotoGallery([
      { kind: 'post', key: 'post:a', post: basePost({ id: 'a' }) },
      { kind: 'post', key: 'post:b', post: basePost({ id: 'b', mediaUrl: 'https://cdn.example/b.jpg' }) },
    ]);
    expect(findGalleryIndexByKey(items, 'post:b')).toBe(1);
  });
});
