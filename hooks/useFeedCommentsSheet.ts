import { useCallback, useState } from 'react';
import type { Post } from '@/types';

/** Shared state for opening the in-feed comment drawer from feed viewers. */
export function useFeedCommentsSheet() {
  const [commentsPost, setCommentsPost] = useState<Post | null>(null);

  const openComments = useCallback((post: Post) => {
    setCommentsPost(post);
  }, []);

  const closeComments = useCallback(() => {
    setCommentsPost(null);
  }, []);

  return {
    commentsPost,
    commentsOpen: commentsPost != null,
    openComments,
    closeComments,
  };
}
