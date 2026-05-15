import type { PostReactionCounts, PostReactionKind } from '@/types';

/**
 * Single app-wide reaction set (posts + comments). Order: heart → laugh → cry → anger → surprise.
 * DB may still store legacy `clap` rows; {@link normalizePostReactionKind} maps unknown kinds to null.
 */
export const POST_REACTION_ORDER: PostReactionKind[] = [
  'heart',
  'haha',
  'sad',
  'angry',
  'wow',
];

export const POST_REACTION_EMOJI: Record<PostReactionKind, string> = {
  heart: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

export function emptyPostReactionCounts(): PostReactionCounts {
  return {
    heart: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
  };
}

const REACTION_SET = new Set<string>(POST_REACTION_ORDER);

export function isPostReactionKind(v: string): v is PostReactionKind {
  return REACTION_SET.has(v);
}

export function normalizePostReactionKind(raw: string | null | undefined): PostReactionKind | null {
  if (raw == null || raw === '') return null;
  return isPostReactionKind(raw) ? raw : null;
}
