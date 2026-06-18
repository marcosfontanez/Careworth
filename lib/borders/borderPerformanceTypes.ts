/**
 * Performance-aware profile border rendering — shared types.
 * See docs/BORDER_PERFORMANCE.md for surface policy and asset guidelines.
 */

export type BorderRenderMode = 'static' | 'lite' | 'full' | 'auto';

/** Resolved visual mode after policy + governor (no "auto"). */
export type BorderVisualMode = 'static' | 'lite' | 'full';

export type BorderRenderPriority =
  | 'feed-active'
  | 'feed-inactive'
  | 'profile-header'
  | 'circle-list'
  | 'circle-thread-header'
  | 'comment'
  | 'reply'
  | 'shop-preview'
  | 'shop-grid'
  | 'customize-border'
  | 'leaderboard'
  /** Live monthly podium avatars (top 5). */
  | 'leaderboard-podium'
  /** Prize strip samples in leaderboard UI — full motion showcase. */
  | 'leaderboard-preview'
  | 'notification'
  | 'search'
  | 'follower-list'
  | 'reward-reveal'
  | 'default';

/** Surfaces where featured borders must always play at authored density (not feed-throttled). */
export const HERO_BORDER_RENDER_PRIORITIES: ReadonlySet<BorderRenderPriority> = new Set([
  'profile-header',
  'shop-preview',
  'customize-border',
  'reward-reveal',
  'leaderboard',
  'leaderboard-podium',
  'leaderboard-preview',
]);

export function isHeroBorderRenderPriority(
  priority: BorderRenderPriority | undefined,
): priority is BorderRenderPriority {
  return priority != null && HERO_BORDER_RENDER_PRIORITIES.has(priority);
}

export type BorderAnimationType = 'none' | 'lottie' | 'rive' | 'sprite' | 'video' | 'skia' | 'rn-animated';

export type BorderPerformanceTier = 'cheap' | 'medium' | 'expensive';

/**
 * Catalog metadata for a premium border (slug-level).
 * Missing lite/full URLs fall back to static raster in list surfaces.
 */
export type BorderPerformanceMeta = {
  slug: string;
  animationType: BorderAnimationType;
  performanceTier: BorderPerformanceTier;
  /** Minimum photo diameter (px) before any motion is considered. */
  minSizeForAnimation: number;
  allowInLists: boolean;
  allowFullInFeed: boolean;
  allowFullInProfile: boolean;
  allowLiteInFeed: boolean;
  /** Bundled static PNG is always used as the identity layer. */
  hasStaticRaster: boolean;
  hasLiteAnimation: boolean;
  hasFullAnimation: boolean;
};

export type BorderMotionLayerFlags = {
  visualMode: BorderVisualMode;
  showClassOf2026Overlay: boolean;
  showEmeraldRenewal: boolean;
  showGoldFireworks: boolean;
  showSilverBronzeSparkle: boolean;
  showProceduralFireworks: boolean;
  showJuneLeaderboardFx: boolean;
  /** 0–1 scales PremiumBorderOverlay particle density (full = 1). */
  premiumOverlayIntensity: number;
};
