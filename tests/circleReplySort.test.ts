import { describe, expect, it } from 'vitest';
import { sortCircleReplies } from '@/lib/circleReplySort';
import type { CircleReply } from '@/types';

function reply(id: string, createdAt: string, helpfulCount?: number, reactionCount?: number): CircleReply {
  return {
    id,
    threadId: 't1',
    authorId: 'a1',
    body: 'x',
    createdAt,
    helpfulCount,
    reactionCount,
  };
}

describe('sortCircleReplies', () => {
  it('sorts Helpful by helpful_count desc then oldest first', () => {
    const sorted = sortCircleReplies(
      [
        reply('a', '2026-01-03T00:00:00Z', 0),
        reply('b', '2026-01-01T00:00:00Z', 5),
        reply('c', '2026-01-02T00:00:00Z', 5),
        reply('d', '2026-01-04T00:00:00Z', undefined),
      ],
      'helpful',
    );
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('does not crash when counts are null or zero', () => {
    const sorted = sortCircleReplies(
      [reply('x', '2026-01-01T00:00:00Z'), reply('y', '2026-01-02T00:00:00Z', 0)],
      'helpful',
    );
    expect(sorted).toHaveLength(2);
  });

  it('sorts New by created_at desc', () => {
    const sorted = sortCircleReplies(
      [reply('old', '2026-01-01T00:00:00Z'), reply('new', '2026-01-05T00:00:00Z')],
      'new',
    );
    expect(sorted[0]?.id).toBe('new');
  });
});
