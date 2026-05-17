import { create } from 'zustand';

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

const DEFAULT_FLAGS: FeatureFlags = {
  liveStreaming: false,
  liveDiscoveryDemos: true,
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
