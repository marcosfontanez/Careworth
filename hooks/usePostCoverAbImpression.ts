import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { coverAbVariant } from '@/lib/coverAbPoster';
import { logPostCoverAbEvent } from '@/lib/postCoverAnalytics';
import type { Post } from '@/types';

/** Logs one impression per (post, variant) while the cell is active — analytics only. */
export function usePostCoverAbImpression(
  post: Pick<Post, 'id' | 'creatorId' | 'thumbnailUrl' | 'coverAltUrl' | 'type'>,
  isActive: boolean,
) {
  const { user } = useAuth();
  const loggedKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive || !user?.id) return;
    if (post.type !== 'video') return;
    const a = post.thumbnailUrl?.trim();
    const b = post.coverAltUrl?.trim();
    if (!a || !b) return;
    if (post.creatorId === user.id) return;

    const variant = coverAbVariant(post);
    const key = `${post.id}:${variant}`;
    if (loggedKey.current === key) return;
    loggedKey.current = key;

    void logPostCoverAbEvent({
      postId: post.id,
      viewerId: user.id,
      variant,
      eventType: 'impression',
    });
  }, [isActive, user?.id, post.id, post.creatorId, post.thumbnailUrl, post.coverAltUrl, post.type]);
}
