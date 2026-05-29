/** Sheet covers ~68% — leaves top ~32% of video visible (within 60–75% spec). */
export const FEED_COMMENTS_SHEET_HEIGHT_RATIO = 0.68;

export const FEED_COMMENTS_SHEET_DISMISS_DRAG_PX = 72;
export const FEED_COMMENTS_SHEET_DISMISS_VELOCITY = 900;

export function feedCommentsSheetHeight(
  screenHeight: number,
  ratio = FEED_COMMENTS_SHEET_HEIGHT_RATIO,
): number {
  return Math.round(screenHeight * ratio);
}

export function formatCommentsSheetTitle(commentCount: number | null | undefined): string {
  const count = commentCount ?? 0;
  return `Comments${count > 0 ? ` (${count})` : ''}`;
}

export function shouldDismissFeedCommentsSheet(
  translationY: number,
  velocityY: number,
  dragPx = FEED_COMMENTS_SHEET_DISMISS_DRAG_PX,
  velocityThreshold = FEED_COMMENTS_SHEET_DISMISS_VELOCITY,
): boolean {
  return translationY > dragPx || velocityY > velocityThreshold;
}
