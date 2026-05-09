import type { PostReactionCounts, PostReactionKind } from '@/types';

export const POST_REACTION_ORDER: PostReactionKind[] = [
  'heart',
  'haha',
  'wow',
  'sad',
  'angry',
  'clap',
];

export const POST_REACTION_EMOJI: Record<PostReactionKind, string> = {
  heart: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
  clap: '👏',
};

export function emptyPostReactionCounts(): PostReactionCounts {
  return {
    heart: 0,
    haha: 0,
    wow: 0,
    sad: 0,
    angry: 0,
    clap: 0,
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
