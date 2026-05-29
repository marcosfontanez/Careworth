import type { Post } from '@/types';

export type LinkedCommunityMeta = {
  name?: string | null;
  slug?: string | null;
};

/** Attach denormalized Circle display fields — no extra network call on feed cells. */
export function withLinkedCommunityMeta(post: Post, meta: LinkedCommunityMeta | null | undefined): Post {
  const name = meta?.name?.trim();
  const slug = meta?.slug?.trim();
  if (!name && !slug) return post;
  return {
    ...post,
    ...(name ? { linkedCommunityName: name } : {}),
    ...(slug ? { linkedCommunitySlug: slug } : {}),
  };
}
