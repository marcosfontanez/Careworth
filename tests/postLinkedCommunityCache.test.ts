import { describe, expect, it } from 'vitest';
import { withLinkedCommunityMeta } from '@/lib/postLinkedCommunityMeta';
import type { Post } from '@/types';

const basePost = { id: 'p1', communities: ['c1'] } as Post;

describe('withLinkedCommunityMeta', () => {
  it('adds linked community display fields', () => {
    const out = withLinkedCommunityMeta(basePost, { name: 'Nursing', slug: 'nursing' });
    expect(out.linkedCommunityName).toBe('Nursing');
    expect(out.linkedCommunitySlug).toBe('nursing');
  });

  it('returns original post when meta is empty', () => {
    expect(withLinkedCommunityMeta(basePost, null)).toBe(basePost);
  });
});
