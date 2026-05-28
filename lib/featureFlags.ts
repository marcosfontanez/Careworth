import { create } from 'zustand';
import { isProductionReleaseBuild, liveKitConfigured } from '@/lib/liveKitConfig';

export interface FeatureFlags {
  /** TikTok-style live rooms (mock video provider today). Off for v1 store launch. */
  liveStreaming: boolean;
  /** Merge curated `demo-live-*` rows into Live discovery for demos / screenshots. */
  liveDiscoveryDemos: boolean;
  /** Inject “Happening Now” live tray + chrome indicator into the For You feed (Phase 4). */
  liveFeedInjection: boolean;
  /** Feed-native clip composer from long-press / clip route (Phase 5). */
  feedClipping: boolean;
  /**
   * Advanced video remix actions in the feed long-press menu (Duet, Stitch, B-roll).
   * Default **off** in production until end-to-end audio mixing + export rendering ships.
   * Use Sound and Full Editor remain available regardless of this flag because they
   * are fully wired (sound preselect / generic composer with optional context).
   * Override at build time: `EXPO_PUBLIC_FEED_VIDEO_REMIX_ADVANCED=1`.
   */
  feedVideoRemixAdvanced: boolean;
  /**
   * Surface the Circle composer "Video" post-type chip + media tile. The Circle
   * video pipeline historically reused the Feed image upload helper without
   * thumbnail generation, which broke preview rendering and produced posts with
   * no `thumbnail_url`. The fix wires Circle through the same proven Feed video
   * helpers (`pickVideoFromGallery`, `makeVideoThumbnail`, `compressVideoIfTooLarge`,
   * `uploadPostMediaWithMeta`). Flag exists as a safety net — flip OFF via
   * `EXPO_PUBLIC_CIRCLE_VIDEO_POSTING=0` or admin to hide the chip if a
   * regression slips into beta.
   */
  circleVideoPosting: boolean;
  /**
   * Feed rail “Gift” using `SendCreatorGiftTray` — Phase 2 gifting (`FeedActionRail` / `VideoFeedPost`).
   * Default **on** in development; **off** in production release unless
   * `EXPO_PUBLIC_FEED_CREATOR_GIFTING=1`. Staff can also toggle from **Admin → Feature flags**.
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

function defaultLiveFeedInjection(): boolean {
  const raw = process.env.EXPO_PUBLIC_LIVE_FEED_INJECTION?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) {
    return defaultLiveStreaming();
  }
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function defaultFeedClipping(): boolean {
  const raw = process.env.EXPO_PUBLIC_FEED_CLIPPING?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Advanced remix actions (Duet / Stitch / B-roll) — gated for beta because:
 *   - Duet recording captures only the user's mic; original audio is never
 *     mixed back into the export (no server-side compositor wired today).
 *   - Stitch / B-roll modals work in the composer but the assembled output
 *     has not had a full QA pass on iOS 26.5 / Android edge cases.
 * Re-enable per build with `EXPO_PUBLIC_FEED_VIDEO_REMIX_ADVANCED=1`.
 */
export function defaultFeedVideoRemixAdvanced(): boolean {
  const raw = process.env.EXPO_PUBLIC_FEED_VIDEO_REMIX_ADVANCED?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/**
 * Circle composer video posting — defaults **on** because the fix in this
 * branch wires Circle uploads through the same Feed video helpers. Override
 * with `EXPO_PUBLIC_CIRCLE_VIDEO_POSTING=0` (or admin toggle) to instantly
 * hide the Video chip + media flow if a regression appears in beta.
 */
export function defaultCircleVideoPosting(): boolean {
  const raw = process.env.EXPO_PUBLIC_CIRCLE_VIDEO_POSTING?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  return true;
}

/**
 * Feed creator gifting defaults **on** in development for local QA.
 * Production release builds stay **off** unless `EXPO_PUBLIC_FEED_CREATOR_GIFTING=1`.
 */
export function defaultFeedCreatorGifting(): boolean {
  const raw = process.env.EXPO_PUBLIC_FEED_CREATOR_GIFTING?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

const DEFAULT_FLAGS: FeatureFlags = {
  liveStreaming: defaultLiveStreaming(),
  liveDiscoveryDemos: defaultLiveDiscoveryDemos(),
  liveFeedInjection: defaultLiveFeedInjection(),
  feedClipping: defaultFeedClipping(),
  feedVideoRemixAdvanced: defaultFeedVideoRemixAdvanced(),
  circleVideoPosting: defaultCircleVideoPosting(),
  feedCreatorGifting: defaultFeedCreatorGifting(),
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
