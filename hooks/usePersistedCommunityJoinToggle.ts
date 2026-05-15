import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { communityService } from '@/services';
import { communityKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';

/**
 * Join / leave a circle with Supabase persistence (same as the room screen).
 * List screens previously only flipped Zustand — joins reverted on refresh and felt “broken”.
 */
export function usePersistedCommunityJoinToggle() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCommunityJoined = useAppStore((s) => s.setCommunityJoined);
  const showToast = useToast((s) => s.show);
  const busyRef = useRef<Set<string>>(new Set());

  return useCallback(
    async (communityId: string) => {
      const cid = (communityId ?? '').trim();
      if (!cid) return;
      if (!user?.id) {
        router.push('/auth/login');
        return;
      }
      if (busyRef.current.has(cid)) return;
      busyRef.current.add(cid);
      try {
        const joined = await communityService.toggleJoin(cid, { notifyNewPosts: true });
        setCommunityJoined(cid, joined);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['communities'] }),
          queryClient.invalidateQueries({ queryKey: communityKeys.circlesHome() }),
        ]);
      } catch (e) {
        if (__DEV__) console.warn('[usePersistedCommunityJoinToggle]', e);
        showToast('Could not update this circle. Try again.', 'error');
      } finally {
        busyRef.current.delete(cid);
      }
    },
    [user?.id, router, queryClient, setCommunityJoined, showToast],
  );
}
