import { useMemo } from 'react';
import { resolveFeedClipAttribution } from '@/lib/feedClipAttribution';
import { usePost, useUser } from '@/hooks/useQueries';
import type { Post } from '@/types';

/** Resolves clip attribution labels + navigation targets for a post. */
export function useFeedClipAttribution(post: Post | null | undefined) {
  const sourcePostId = post?.sourcePostId?.trim() ?? '';
  const sourceCreatorId = post?.sourceCreatorId?.trim() ?? '';

  const {
    data: sourcePost,
    isPending: sourcePostLoading,
    isError: sourcePostError,
  } = usePost(sourcePostId, { enabled: Boolean(sourcePostId) });

  const needCreatorFallback =
    Boolean(sourceCreatorId) &&
    Boolean(sourcePostId) &&
    !sourcePostLoading &&
    (sourcePostError || !sourcePost);

  const {
    data: sourceCreator,
    isPending: sourceCreatorLoading,
  } = useUser(sourceCreatorId);

  const creatorProfile =
    sourcePost?.creator ??
    (needCreatorFallback || (!sourcePostId && sourceCreatorId) ? sourceCreator ?? null : null);

  const creatorLoading = Boolean(
    (sourcePostId && sourcePostLoading) ||
      ((needCreatorFallback || (!sourcePostId && sourceCreatorId)) && sourceCreatorLoading),
  );

  return useMemo(() => {
    if (!post) {
      return resolveFeedClipAttribution(
        { sourcePostId: undefined, sourceLiveStreamId: undefined, sourceCreatorId: undefined, caption: '' },
        {},
      );
    }
    return resolveFeedClipAttribution(post, {
      sourcePost: sourcePostLoading ? undefined : sourcePost ?? null,
      sourcePostLoading,
      sourceCreatorProfile: creatorLoading ? undefined : creatorProfile,
      sourceCreatorLoading: creatorLoading,
    });
  }, [post, sourcePost, sourcePostLoading, creatorProfile, creatorLoading]);
}
