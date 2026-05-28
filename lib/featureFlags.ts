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
   * Surface the **Combine clips** tile + B-roll alt link on the Creator Hub.
   * Combine clips routes into `/create/video?openStitch=…` which opens
   * `MultiClipStitchModal` + the server-side ffmpeg `creator_media_jobs` queue.
   * Same export-pipeline gaps that gate `feedVideoRemixAdvanced` apply, so we
   * default this OFF in production until the merged-output QA pass completes.
   * Override via `EXPO_PUBLIC_CREATOR_HUB_COMBINE_CLIPS=1` or admin toggle.
   */
  creatorHubCombineClips: boolean;
  /**
   * Surface the **Co-create** quick pill on the Creator Hub. The flow can
   * freeze the app when `collab_projects` migration 096 is not applied on the
   * connected Supabase project — the project-list query never resolves, the
   * loading spinner sticks, and the error toast leaves the screen unresponsive.
   * Default OFF in production until the migration ships everywhere and the
   * timeout/retry hardening lands. Override via `EXPO_PUBLIC_CREATOR_HUB_COCREATE=1`
   * or admin toggle.
   */
  creatorHubCoCreate: boolean;
  /**
   * Surface the **Feed discussion** tile (text post for For You / Following)
   * on the Creator Hub. Beta smoke tests treated it as out-of-scope alongside
   * the long-form creator tools — hide for now; routes to /create/text remain
   * intact for any other entry point (deep link, future tab).
   */
  creatorHubFeedDiscussion: boolean;
  /**
   * Surface the recorder filter + effect chip rail (`Filters` / `Effects`
   * segment toggle in `app/create/video-camera.tsx`). Current beta effects
   * are placeholder tints with no transform pipeline — hiding them avoids the
   * "weak / broken" affordance smoke tests flagged. Filters subgroup stays
   * available behind the same flag so we don't half-show one tab. Set OFF in
   * production by default; flip via `EXPO_PUBLIC_RECORDER_EFFECTS=1` for staff.
   */
  recorderEffects: boolean;
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

/** Creator Hub → Combine clips tile. Default OFF in release until merge QA ships. */
export function defaultCreatorHubCombineClips(): boolean {
  const raw = process.env.EXPO_PUBLIC_CREATOR_HUB_COMBINE_CLIPS?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Creator Hub → Co-create pill. Default OFF until project-list freeze + migration 096 are resolved. */
export function defaultCreatorHubCoCreate(): boolean {
  const raw = process.env.EXPO_PUBLIC_CREATOR_HUB_COCREATE?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Creator Hub → Feed discussion tile. Default OFF for beta. */
export function defaultCreatorHubFeedDiscussion(): boolean {
  const raw = process.env.EXPO_PUBLIC_CREATOR_HUB_FEED_DISCUSSION?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  return false;
}

/** Recorder filters/effects rail. Default OFF in release until effects pipeline lands. */
export function defaultRecorderEffects(): boolean {
  const raw = process.env.EXPO_PUBLIC_RECORDER_EFFECTS?.trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'no') return false;
  if (isProductionReleaseBuild()) return false;
  return typeof __DEV__ !== 'undefined' && __DEV__;
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
  creatorHubCombineClips: defaultCreatorHubCombineClips(),
  creatorHubCoCreate: defaultCreatorHubCoCreate(),
  creatorHubFeedDiscussion: defaultCreatorHubFeedDiscussion(),
  recorderEffects: defaultRecorderEffects(),
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
