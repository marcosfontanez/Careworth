import { Platform } from 'react-native';

export type FeedListWindowConfig = {
  windowSize: number;
  maxToRenderPerBatch: number;
  initialNumToRender: number;
};

/**
 * Vertical feed pre-mounts neighbor cells so the next video buffers early.
 * Android tends to hit decoder / surface contention sooner than iOS — use a
 * slightly smaller window so scroll stays closer to 60fps on mid-tier devices.
 *
 * When tuning: compare `[feedPerf]` timings (`lib/feedPerf.ts`) on a physical
 * mid-tier Android device before widening these numbers.
 */
export function getFeedVideoListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    /** Fewer mounted `VideoView`s reduces Stagefright / JNI aborts under scroll + IME. */
    return { windowSize: 3, maxToRenderPerBatch: 2, initialNumToRender: 2 };
  }
  /** iOS: mount one page first for less work before first paint; neighbors follow in one batch. */
  return { windowSize: 5, maxToRenderPerBatch: 3, initialNumToRender: 1 };
}

export type ThreadListKind = 'dmInverted' | 'liveChatBottom' | 'comments';

/**
 * DMs, live chat, and comment threads mount rich rows (avatars, chips, link previews).
 * A smaller `windowSize` on Android cuts memory churn and jank vs default ~11.
 */
export function getThreadListWindow(kind: ThreadListKind): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    switch (kind) {
      case 'dmInverted':
        return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 14 };
      case 'liveChatBottom':
        return { windowSize: 8, maxToRenderPerBatch: 8, initialNumToRender: 14 };
      case 'comments':
      default:
        return { windowSize: 8, maxToRenderPerBatch: 8, initialNumToRender: 12 };
    }
  }
  switch (kind) {
    case 'dmInverted':
      return { windowSize: 11, maxToRenderPerBatch: 12, initialNumToRender: 18 };
    case 'liveChatBottom':
      return { windowSize: 11, maxToRenderPerBatch: 12, initialNumToRender: 16 };
    case 'comments':
    default:
      return { windowSize: 11, maxToRenderPerBatch: 12, initialNumToRender: 14 };
  }
}

/** Notifications hub `SectionList` — tighten recycle window on Android. */
export function getNotificationSectionListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 5, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return { windowSize: 7, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Saved-posts 3-column grid still mounts image/video tiles — fewer off-screen rows on Android. */
export function getSavedPostsGridListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 5, maxToRenderPerBatch: 6, initialNumToRender: 9 };
  }
  return { windowSize: 7, maxToRenderPerBatch: 9, initialNumToRender: 9 };
}

/** Messenger inbox rows include avatars + previews — slightly tighter recycle window on Android. */
export function getMessengerInboxListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 12 };
  }
  return { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 14 };
}

/** Discover horizontal rails — thumbnails + overlays; shrink recycle radius on Android. */
export function getDiscoverHorizontalShelfWindow(
  initialNumToRender: number,
  maxToRenderPerBatch: number,
): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return {
      windowSize: 4,
      maxToRenderPerBatch: Math.max(3, maxToRenderPerBatch - 1),
      initialNumToRender: Math.max(3, initialNumToRender - 1),
    };
  }
  return { windowSize: 5, maxToRenderPerBatch, initialNumToRender };
}

/** Universal search — mixed heavy rows (avatars, sounds, post previews). */
export function getUniversalSearchListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 6, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return { windowSize: 8, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Song / curated sound rows with artwork (song picker, camera sound rail). */
export function getSoundRowPickerListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Admin moderation lists (reports, users, posts). */
export function getAdminModerationListWindow(
  variant: 'default' | 'soundCatalog' = 'default',
): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return variant === 'soundCatalog'
      ? { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 12 }
      : { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return variant === 'soundCatalog'
    ? { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 14 }
    : { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Followers / blocked / collab picker / link-circle — avatar + subtitle rows. */
export function getAvatarSubtitleRowListWindow(
  density: 'default' | 'initialBoost' = 'default',
): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 12 };
  }
  return density === 'initialBoost'
    ? { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 14 }
    : { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Hashtag results — leading thumb + two-line copy. */
export function getHashtagPostRowListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return { windowSize: 9, maxToRenderPerBatch: 10, initialNumToRender: 12 };
}

/** Circles directory (`circles-featured`) — alphabetical room rows. */
export function getCirclesDirectoryListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 7, maxToRenderPerBatch: 12, initialNumToRender: 12 };
  }
  return { windowSize: 10, maxToRenderPerBatch: 20, initialNumToRender: 16 };
}

/** Community wall — `CirclePostCard` / thread cells with media. */
export function getCommunityWallFeedListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 5, maxToRenderPerBatch: 6, initialNumToRender: 5 };
  }
  return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 6 };
}

/** Live gift leaderboard modal — avatar rows + badges. */
export function getGiftLeaderboardListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 5, maxToRenderPerBatch: 8, initialNumToRender: 10 };
  }
  return { windowSize: 7, maxToRenderPerBatch: 8, initialNumToRender: 12 };
}

/** Featured live hero strip — only a few cards; still trim Android recycle window. */
export function getFeaturedLiveHeroCarouselWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 4, maxToRenderPerBatch: 3, initialNumToRender: 3 };
  }
  return { windowSize: 5, maxToRenderPerBatch: 3, initialNumToRender: 3 };
}

/** Creator profile video grid (2 columns, video thumbs). */
export function getCreatorVideosGridListWindow(): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 4, maxToRenderPerBatch: 6, initialNumToRender: 6 };
  }
  return { windowSize: 5, maxToRenderPerBatch: 6, initialNumToRender: 6 };
}

/** My Posts / link-post picker — 2-column grids with `RecentMediaThumb`. */
export function getProfileTwoColumnMediaGridWindow(
  kind: 'myPosts' | 'linkPostPicker',
): FeedListWindowConfig {
  if (Platform.OS === 'android') {
    return { windowSize: 4, maxToRenderPerBatch: 4, initialNumToRender: 6 };
  }
  if (kind === 'linkPostPicker') {
    return { windowSize: 5, maxToRenderPerBatch: 4, initialNumToRender: 6 };
  }
  return { windowSize: 5, maxToRenderPerBatch: 6, initialNumToRender: 6 };
}
