import type { ImageProps } from 'expo-image';

/** Grid / list thumbnails — persistent cache; lower decode priority than active feed. */
export const pulseImageListThumbProps: Pick<ImageProps, 'cachePolicy' | 'priority'> = {
  cachePolicy: 'memory-disk',
  priority: 'low',
};

/** Full-bleed feed / carousel / poster frames — same cache tier; higher decode priority. */
export const pulseImageFeedHeroProps: Pick<ImageProps, 'cachePolicy' | 'priority'> = {
  cachePolicy: 'memory-disk',
  priority: 'high',
};
