import { withLinkedCommunityMeta } from '@/lib/postLinkedCommunityMeta';
import { communitiesService } from '@/services/supabase/communities';
import type { Post } from '@/types';

/**
 * Attach `linkedCommunitySlug` / `linkedCommunityName` from the first
 * `communities[]` id when posts were loaded without denormalized Circle fields.
 */
export async function enrichPostsWithLinkedCommunityMeta(posts: Post[]): Promise<Post[]> {
  if (!posts.length) return posts;

  const needLookup = new Set<string>();
  for (const p of posts) {
    if (p.linkedCommunitySlug?.trim()) continue;
    const cid = p.communities?.[0]?.trim();
    if (cid) needLookup.add(cid);
  }
  if (needLookup.size === 0) return posts;

  try {
    const comms = await communitiesService.getByIds([...needLookup]);
    const byId = new Map(comms.map((c) => [c.id, { name: c.name, slug: c.slug }]));
    return posts.map((p) => {
      if (p.linkedCommunitySlug?.trim()) return p;
      const cid = p.communities?.[0]?.trim();
      if (!cid) return p;
      const meta = byId.get(cid);
      return meta ? withLinkedCommunityMeta(p, meta) : p;
    });
  } catch {
    return posts;
  }
}
