import { useRef, useCallback, useEffect } from 'react';
import { postsService } from '@/services/supabase';

export function useViewTracker(userId?: string) {
  const viewTimers = useRef<Map<string, number>>(new Map());
  const tracked = useRef<Set<string>>(new Set());

  const onViewStart = useCallback((postId: string) => {
    if (!userId || tracked.current.has(postId)) return;
    viewTimers.current.set(postId, Date.now());
  }, [userId]);

  const onViewEnd = useCallback((postId: string) => {
    if (!userId) return;
    const start = viewTimers.current.get(postId);
    if (!start) return;

    const duration = Date.now() - start;
    viewTimers.current.delete(postId);

    // Only track meaningful views (>2 seconds)
    if (duration > 2000 && !tracked.current.has(postId)) {
      tracked.current.add(postId);
      postsService.trackView(postId, userId, duration).catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      // Flush remaining views on unmount
      viewTimers.current.forEach((start, postId) => {
        const duration = Date.now() - start;
        if (duration > 2000 && userId && !tracked.current.has(postId)) {
          postsService.trackView(postId, userId, duration).catch(() => {});
        }
      });
    };
  }, [userId]);

  return { onViewStart, onViewEnd };
}
