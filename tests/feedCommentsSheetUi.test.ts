import { describe, expect, it } from 'vitest';
import {
  FEED_COMMENTS_SHEET_DISMISS_DRAG_PX,
  FEED_COMMENTS_SHEET_HEIGHT_RATIO,
  feedCommentsSheetHeight,
  formatCommentsSheetTitle,
  shouldDismissFeedCommentsSheet,
} from '@/lib/feedCommentsSheetUi';

describe('feedCommentsSheetUi', () => {
  it('computes sheet height from screen height', () => {
    expect(feedCommentsSheetHeight(800)).toBe(Math.round(800 * FEED_COMMENTS_SHEET_HEIGHT_RATIO));
  });

  it('formats title with and without count', () => {
    expect(formatCommentsSheetTitle(0)).toBe('Comments');
    expect(formatCommentsSheetTitle(undefined)).toBe('Comments');
    expect(formatCommentsSheetTitle(12)).toBe('Comments (12)');
  });

  it('dismisses on drag distance threshold', () => {
    expect(shouldDismissFeedCommentsSheet(FEED_COMMENTS_SHEET_DISMISS_DRAG_PX + 1, 0)).toBe(true);
    expect(shouldDismissFeedCommentsSheet(FEED_COMMENTS_SHEET_DISMISS_DRAG_PX, 0)).toBe(false);
  });

  it('dismisses on fast downward velocity', () => {
    expect(shouldDismissFeedCommentsSheet(10, 901)).toBe(true);
    expect(shouldDismissFeedCommentsSheet(10, 500)).toBe(false);
  });
});
