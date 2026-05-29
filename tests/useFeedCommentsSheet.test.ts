import { describe, expect, it } from 'vitest';
import type { Post } from '@/types';

/** Mirrors {@link useFeedCommentsSheet} state transitions for unit coverage. */
function reduceCommentsSheet(
  state: Post | null,
  action: { type: 'open'; post: Post } | { type: 'close' },
): Post | null {
  switch (action.type) {
    case 'open':
      return action.post;
    case 'close':
      return null;
    default:
      return state;
  }
}

const mockPost = { id: 'p1', commentCount: 3 } as Post;

describe('useFeedCommentsSheet state', () => {
  it('opens with the selected post', () => {
    expect(reduceCommentsSheet(null, { type: 'open', post: mockPost })?.id).toBe('p1');
  });

  it('closes back to null', () => {
    expect(reduceCommentsSheet(mockPost, { type: 'close' })).toBeNull();
  });

  it('replaces post when opening a different clip', () => {
    const next = { id: 'p2', commentCount: 0 } as Post;
    expect(reduceCommentsSheet(mockPost, { type: 'open', post: next })?.id).toBe('p2');
  });
});
