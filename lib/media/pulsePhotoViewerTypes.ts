import type { Post } from '@/types';

export type PulsePhotoSourceType = 'feed' | 'circle' | 'my-pulse';

/** What to like when the viewer taps Pulse in the lightbox. */
export type PulsePhotoLikeTarget =
  | { kind: 'post'; id: string }
  | { kind: 'pulse-update'; id: string };

/** One browsable still in the Pulse Page photo lightbox. */
export type PulsePhotoViewerItem = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  sourceType: PulsePhotoSourceType;
  sourceLabel: string;
  sourcePostId?: string;
  pulseUpdateId?: string;
  linkedCircleSlug?: string;
  linkedThreadId?: string;
  commentCount?: number;
  /** Engagement target for the floating Pulse control (post or My Pulse update). */
  likeTarget?: PulsePhotoLikeTarget;
  liked?: boolean;
  likeCount?: number;
  /** Hydrated post when the source is a feed/circle image post. */
  post?: Post;
  showViewPost: boolean;
  showComment: boolean;
  isAnonymous: boolean;
};

export type PulsePhotoViewerCreator = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type OpenPulsePhotoViewerInput = {
  items: PulsePhotoViewerItem[];
  initialIndex?: number;
  creator?: PulsePhotoViewerCreator;
  /** Called after the modal finishes closing — restore Media Hub scroll, etc. */
  onClosed?: () => void;
};
