import { useQuery } from '@tanstack/react-query';
import { pulseScoreKeys } from '@/lib/queryKeys';
import { pulseScoresService } from '@/services/supabase/pulseScores';

/**
 * Finalized prior-month stats + global rank from `get_pulse_month_celebration`.
 * Null when the RPC returns no row (month not finalized, no score, etc.).
 */
export function usePulseMonthCelebration(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: pulseScoreKeys.monthCelebration(userId ?? null),
    queryFn: async () => {
      try {
        return await pulseScoresService.getMonthCelebration();
      } catch {
        return null;
      }
    },
    enabled: Boolean(enabled && userId),
    /** Short TTL so a user who logs in right after deploy/rollover sees the modal without stale cache. */
    staleTime: 0,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
