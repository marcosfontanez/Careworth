import type { Post } from '@/types';

/** Configurable clip gift revenue split (mirrors economy_settings.clip_gift_split). */
export type ClipGiftSplitConfig = {
  publisherBps: number;
  originalCreatorBps: number;
  payoutMode: 'track_only' | 'split_diamonds';
};

export type ClipGiftLineage = {
  clippedPostId: string;
  clipPublisherId: string;
  sourcePostId?: string;
  originalCreatorId?: string;
  sourceLiveStreamId?: string;
  isClip: boolean;
  /** Clip publisher is also the original creator (e.g. clipped own Live replay). */
  isOwnClip: boolean;
};

export type ClipGiftSplitAmounts = {
  publisherDiamonds: number;
  originalCreatorDiamonds: number;
};

export type ClipGiftSplitStatus =
  | 'tracked'
  | 'pending_payout'
  | 'paid'
  | 'skipped_no_original'
  | 'skipped_own_clip';

export const DEFAULT_CLIP_GIFT_SPLIT_CONFIG: ClipGiftSplitConfig = {
  publisherBps: 7000,
  originalCreatorBps: 3000,
  payoutMode: 'track_only',
};

/** Parse economy_settings JSON into typed config with sane bounds. */
export function parseClipGiftSplitConfig(raw: unknown): ClipGiftSplitConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_CLIP_GIFT_SPLIT_CONFIG;
  const o = raw as Record<string, unknown>;
  const publisherBps = clampBps(Number(o.publisher_bps ?? o.publisherBps ?? 7000));
  const originalCreatorBps = clampBps(Number(o.original_creator_bps ?? o.originalCreatorBps ?? 3000));
  const modeRaw = String(o.payout_mode ?? o.payoutMode ?? 'track_only').trim();
  const payoutMode = modeRaw === 'split_diamonds' ? 'split_diamonds' : 'track_only';
  return { publisherBps, originalCreatorBps, payoutMode };
}

function clampBps(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10000, Math.floor(n)));
}

/** Resolve clip lineage from a post being gifted (context post). */
export function resolveClipGiftLineage(
  post: Pick<
    Post,
    'id' | 'creatorId' | 'sourcePostId' | 'sourceCreatorId' | 'sourceLiveStreamId'
  >,
  sourcePostCreatorId?: string | null,
): ClipGiftLineage {
  const sourcePostId = post.sourcePostId?.trim() || undefined;
  const sourceCreatorId = post.sourceCreatorId?.trim() || undefined;
  const sourceLiveStreamId = post.sourceLiveStreamId?.trim() || undefined;
  const isClip = Boolean(sourcePostId || sourceCreatorId || sourceLiveStreamId);
  const originalCreatorId =
    sourceCreatorId?.trim() ||
    sourcePostCreatorId?.trim() ||
    undefined;
  const isOwnClip = Boolean(
    originalCreatorId && originalCreatorId === post.creatorId.trim(),
  );

  return {
    clippedPostId: post.id,
    clipPublisherId: post.creatorId,
    sourcePostId,
    originalCreatorId,
    sourceLiveStreamId,
    isClip,
    isOwnClip,
  };
}

/** Compute attributed diamond shares (tracking; payout may remain track_only). */
export function computeClipGiftSplitAmounts(
  diamondsEarned: number,
  config: ClipGiftSplitConfig,
  lineage: Pick<ClipGiftLineage, 'isClip' | 'isOwnClip' | 'originalCreatorId'>,
): ClipGiftSplitAmounts & { splitStatus: ClipGiftSplitStatus } {
  const total = Math.max(0, Math.floor(diamondsEarned));
  if (!lineage.isClip) {
    return {
      publisherDiamonds: total,
      originalCreatorDiamonds: 0,
      splitStatus: 'tracked',
    };
  }
  if (!lineage.originalCreatorId) {
    return {
      publisherDiamonds: total,
      originalCreatorDiamonds: 0,
      splitStatus: 'skipped_no_original',
    };
  }
  if (lineage.isOwnClip) {
    return {
      publisherDiamonds: total,
      originalCreatorDiamonds: 0,
      splitStatus: 'skipped_own_clip',
    };
  }

  const publisherDiamonds = Math.floor((total * config.publisherBps) / 10000);
  const originalCreatorDiamonds = Math.floor((total * config.originalCreatorBps) / 10000);
  const splitStatus: ClipGiftSplitStatus =
    config.payoutMode === 'split_diamonds' ? 'pending_payout' : 'tracked';

  return { publisherDiamonds, originalCreatorDiamonds, splitStatus };
}
