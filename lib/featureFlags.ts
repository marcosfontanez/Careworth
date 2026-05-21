import { create } from 'zustand';
import { isProductionReleaseBuild, liveKitConfigured } from '@/lib/liveKitConfig';

export interface FeatureFlags {
  /** TikTok-style live rooms (mock video provider today). Off for v1 store launch. */
  liveStreaming: boolean;
  /** Merge curated `demo-live-*` rows into Live discovery for demos / screenshots. */
  liveDiscoveryDemos: boolean;
/**
 * Feed rail “Gift” using `SendCreatorGiftTray` — Phase 2 gifting (`FeedActionRail` / `VideoFeedPost`).
 * Default on; staff can turn off from **Admin → Feature flags** if needed.
 */
  feedCreatorGifting: boolean;
  sponsoredPosts: boolean;
  pulseversePro: boolean;
  creatorTips: boolean;
  creatorFund: boolean;
  sponsoredCommunities: boolean;
  analyticsInsights: boolean;
}

interface FeatureFlagStore extends FeatureFlags {
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  setFlags: (flags: Partial<FeatureFlags>) => void;
}

/**
 * Live UI defaults **off** in production builds unless LiveKit is configured.
 * In **development** (`__DEV__`) it defaults **on** so the Live tab works without LiveKit.
 *
 * Override at build time: `EXPO_PUBLIC_LIVE_STREAMING=0` or `=1`.
 */
function defaultLiveStreaming(): boolean {
  const raw = process.env.EXPO_PUBLIC_LIVE_STREAMING?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') return false;

  const explicitlyOn = raw === '1' || raw === 'true' || raw === 'yes';
  const liveKitReady = liveKitConfigured();

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (explicitlyOn) return true;
    return true;
  }

  // Release builds: require explicit flag AND LiveKit URL (prevents poster-only false-ready Live).
  if (isProductionReleaseBuild()) {
    return explicitlyOn && liveKitReady;
  }

  return explicitlyOn || liveKitReady;
}

function defaultLiveDiscoveryDemos(): boolean {
  const raw = process.env.EXPO_PUBLIC_LIVE_DISCOVERY_DEMOS?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  // Never merge demo streams in release builds unless explicitly enabled.
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

const DEFAULT_FLAGS: FeatureFlags = {
  liveStreaming: defaultLiveStreaming(),
  liveDiscoveryDemos: defaultLiveDiscoveryDemos(),
  feedCreatorGifting: true,
  sponsoredPosts: false,
  pulseversePro: false,
  creatorTips: false,
  creatorFund: false,
  sponsoredCommunities: false,
  analyticsInsights: false,
};

export const useFeatureFlags = create<FeatureFlagStore>((set) => ({
  ...DEFAULT_FLAGS,
  setFlag: (key, value) => set({ [key]: value }),
  setFlags: (flags) => set(flags),
}));

export function isFeatureEnabled(key: keyof FeatureFlags): boolean {
  return useFeatureFlags.getState()[key];
}
