import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { circleContentService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { circleContentKeys } from '@/lib/queryKeys';

/** Viewer Helpful marks on loaded thread replies (batch). */
export function useCircleReplyHelpfulMap(threadId: string | undefined, replyIds: string[]) {
  const { user } = useAuth();
  const sig = useMemo(() => [...replyIds].sort().join(','), [replyIds]);
  const uid = user?.id ?? '';
  return useQuery({
    queryKey: circleContentKeys.viewerReplyHelpful(threadId ?? '__disabled__', uid, sig),
    queryFn: () => circleContentService.getReplyHelpfulForUser(replyIds, user!.id),
    enabled: !!user?.id && !!threadId && replyIds.length > 0,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
  });
}

/** Joined-circle activity badges — one RPC + local last-visit map. */
export function useJoinedCircleActivityBadges(
  communityIds: string[],
  hotCircleIds: Set<string>,
) {
  const { user } = useAuth();
  const idsKey = useMemo(() => [...communityIds].sort().join(','), [communityIds]);
  const hotKey = useMemo(() => [...hotCircleIds].sort().join(','), [hotCircleIds]);
  return useQuery({
    queryKey: [...circleContentKeys.joinedActivityBadges(idsKey, user?.id ?? ''), hotKey] as const,
    queryFn: async () => {
      const { getCircleLastVisitMap } = await import('@/lib/circleExperience');
      const since = await getCircleLastVisitMap(communityIds);
      const map = await circleContentService.getJoinedCircleActivityBadges(communityIds, since);
      for (const id of hotCircleIds) {
        const existing = map.get(id) ?? {
          communityId: id,
          newWallPosts: 0,
          newThreads: 0,
          newRepliesOnYours: 0,
          unansweredQuestions: 0,
        };
        map.set(id, { ...existing, isHotToday: true });
      }
      return map;
    },
    enabled: !!user?.id && communityIds.length > 0,
    staleTime: 45_000,
  });
}

export function useCircleWelcomeThread(
  communityId: string | undefined,
  fallbackThreadId?: string | null,
) {
  const cid = (communityId ?? '').trim();
  return useQuery({
    queryKey: [...circleContentKeys.welcomeThread(cid), fallbackThreadId ?? ''] as const,
    queryFn: () => circleContentService.getWelcomeThread(cid, fallbackThreadId),
    enabled: cid.length > 0,
    staleTime: 120_000,
  });
}

export function useCircleTopHelpers(communityId: string | undefined, enabled = true) {
  const cid = (communityId ?? '').trim();
  return useQuery({
    queryKey: circleContentKeys.topHelpers(cid),
    queryFn: () => circleContentService.getTopHelpers(cid, 3),
    enabled: enabled && cid.length > 0,
    staleTime: 120_000,
  });
}
