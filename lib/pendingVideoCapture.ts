import type { MediaAsset } from '@/lib/media';
import type { VideoLookId } from '@/lib/videoFilters';

/**
 * In-memory handoff from the full-screen camera into `create/video.tsx`.
 *
 * We carry the captured `MediaAsset` plus optional creator-tools selections
 * (filter / effect look + attached sound) so the editor opens already
 * tinted and with the right "Filming with sound from X" banner instead of
 * making the user re-pick everything.
 */

export interface PendingVideoCapture {
  asset: MediaAsset;
  lookId?: VideoLookId;
  soundPostId?: string;
  soundTitle?: string;
}

let pending: PendingVideoCapture | null = null;

export function setPendingVideoCapture(
  assetOrPayload: MediaAsset | PendingVideoCapture,
): void {
  if ('asset' in assetOrPayload) {
    pending = assetOrPayload;
  } else {
    pending = { asset: assetOrPayload };
  }
}

export function consumePendingVideoCapture(): PendingVideoCapture | null {
  const next = pending;
  pending = null;
  return next;
}

/**
 * Back-compat helper for callers that only need the underlying asset.
 * Kept so existing call sites don't have to know about the wrapper shape.
 */
export function consumePendingVideoCaptureAsset(): MediaAsset | null {
  const p = consumePendingVideoCapture();
  return p?.asset ?? null;
}
