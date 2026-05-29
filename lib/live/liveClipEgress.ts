import { isProductionReleaseBuild, liveKitConfigured } from '@/lib/liveKitConfig';

/**
 * Server-side LiveKit egress + S3 must be configured for clip markers / Clip Studio.
 * Set `EXPO_PUBLIC_LIVE_CLIP_EGRESS=1` on builds where livekit-egress is deployed.
 */
export function defaultLiveClipEgress(): boolean {
  const raw = process.env.EXPO_PUBLIC_LIVE_CLIP_EGRESS?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return liveKitConfigured();
}

export function isLiveClipEgressEnabled(): boolean {
  return defaultLiveClipEgress();
}
