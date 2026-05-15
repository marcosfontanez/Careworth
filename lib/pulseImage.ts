import type { ImageProps } from 'expo-image';

/** Grid / list thumbnails — persistent cache; lower decode priority than active feed. */
export const pulseImageListThumbProps: Pick<ImageProps, 'cachePolicy' | 'priority'> = {
  cachePolicy: 'memory-disk',
  priority: 'low',
};

/**
 * Vertical wall lists (Circles room posts) — use `normal` priority on Android so fast scroll
 * does not consistently lose decoded thumbnails when combined with list recycling.
 */
export const pulseImageCircleWallProps: Pick<ImageProps, 'cachePolicy' | 'priority'> = {
  cachePolicy: 'memory-disk',
  priority: 'normal',
};

/** Full-bleed feed / carousel / poster frames — same cache tier; higher decode priority. */
export const pulseImageFeedHeroProps: Pick<ImageProps, 'cachePolicy' | 'priority'> = {
  cachePolicy: 'memory-disk',
  priority: 'high',
};
