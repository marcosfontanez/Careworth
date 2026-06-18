import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { circleContentKeys } from '@/lib/queryKeys';
import type { CircleThread } from '@/types';

/** Refresh thread detail + room Questions list after flair edit. */
export function invalidateCircleThreadFlairCaches(
  queryClient: QueryClient,
  thread: Pick<CircleThread, 'id' | 'circleId' | 'circleSlug'>,
): void {
  void queryClient.invalidateQueries({ queryKey: circleContentKeys.thread(thread.id) });
  const slug = thread.circleSlug?.trim();
  const cid = thread.circleId?.trim();
  if (slug && cid) {
    void queryClient.invalidateQueries({
      queryKey: [...circleContentKeys.threadsForRoom(slug, cid), 'inf'],
    });
  }
}

export function patchCircleThreadInCaches(
  queryClient: QueryClient,
  thread: CircleThread,
): void {
  queryClient.setQueryData(circleContentKeys.thread(thread.id), thread);

  const slug = thread.circleSlug?.trim();
  const cid = thread.circleId?.trim();
  if (!slug || !cid) return;

  const listKey = [...circleContentKeys.threadsForRoom(slug, cid), 'inf'] as const;
  queryClient.setQueriesData<InfiniteData<CircleThread[]>>({ queryKey: listKey }, (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page) =>
        page.map((t) =>
          t.id === thread.id ? { ...t, flairTag: thread.flairTag, kind: thread.kind } : t,
        ),
      ),
    };
  });
}
