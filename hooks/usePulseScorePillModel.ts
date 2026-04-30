import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pulseScoresService } from '@/services/supabase';
import {
  PULSE_TIERS,
  normalisePulseTier,
  tierForScore,
  type PulseTier,
  type PulseTierMeta,
} from '@/utils/pulseScore';

/**
 * Live Pulse score + tier for the gradient pill (matches
 * {@link PulseStatsRow} fallback / sticky behaviour).
 */
export function usePulseScorePillModel(
  userId: string | null | undefined,
  initialScore?: number | null,
  initialTier?: string | null,
) {
  const {
    data: snapshot,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ['pulseScoreCurrent', userId],
    queryFn: () => pulseScoresService.getCurrent(userId!),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
    placeholderData:
      Number.isFinite(initialScore) && initialScore != null
        ? {
            reach: 0,
            resonance: 0,
            rhythm: 0,
            range: 0,
            reciprocity: 0,
            overall: Number(initialScore),
            tier: (normalisePulseTier(initialTier) ?? tierForScore(Number(initialScore)).id) as PulseTier,
            monthStart: '',
            streakDays: 0,
          }
        : undefined,
  });

  const rpcOverall = snapshot?.overall;
  const fallbackOverall = Number.isFinite(initialScore) ? Number(initialScore) : 0;
  const useFallback =
    rpcOverall == null || (isError && !snapshot) || (isLoading && !snapshot);
  const resolvedOverall = useFallback ? fallbackOverall : (rpcOverall ?? 0);

  const lastNonZeroRef = useRef<number>(0);
  if (resolvedOverall > 0) {
    lastNonZeroRef.current = resolvedOverall;
  }
  /** While the RPC is still loading, avoid flashing 0 if we already showed a positive score. */
  const overall =
    useFallback && resolvedOverall === 0 ? lastNonZeroRef.current : resolvedOverall;

  const rpcTier: PulseTier | undefined = snapshot?.tier;
  const initialTierSafe = normalisePulseTier(initialTier);
  const tier: PulseTierMeta =
    (rpcTier && PULSE_TIERS.find((t) => t.id === rpcTier)) ||
    (initialTierSafe && PULSE_TIERS.find((t) => t.id === initialTierSafe)) ||
    tierForScore(overall);

  return { overall, tier };
}
