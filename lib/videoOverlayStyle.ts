/**
 * Shared definitions for the on-video text sticker style.
 *
 * Used by:
 *  - `app/create/video.tsx`         — composer editor (font/size/color/drag)
 *  - `components/feed/VideoFeedPost.tsx`     — feed render
 *  - `services/supabase/posts.ts`   — persist on post create
 *  - `lib/database.types.ts`        — DB row type
 *
 * The DB column is `posts.video_overlay_style jsonb` (migration 237). When
 * NULL or invalid, callers fall back to `DEFAULT_OVERLAY_STYLE` so legacy
 * posts continue to render in the centered/bottom default position.
 */

import { Platform, type TextStyle } from 'react-native';

/** Each font ID maps to a real cross-platform font family. */
export type VideoOverlayFont = 'system' | 'serif' | 'mono' | 'rounded';

/** Size buckets relative to screen width; resolved in `resolveOverlayStyle`. */
export type VideoOverlaySize = 'sm' | 'md' | 'lg' | 'xl';

/** Restricted palette — must contrast against any video. */
export type VideoOverlayColor = 'white' | 'black' | 'cyan' | 'yellow';

export interface VideoOverlayStyle {
  font: VideoOverlayFont;
  size: VideoOverlaySize;
  color: VideoOverlayColor;
  /** Horizontal anchor — 0 = left edge, 1 = right edge, 0.5 = center. */
  x_norm: number;
  /** Vertical anchor — 0 = top edge, 1 = bottom edge. Default 0.7 ≈ lower-middle. */
  y_norm: number;
}

export const DEFAULT_OVERLAY_STYLE: VideoOverlayStyle = {
  font: 'system',
  size: 'lg',
  color: 'white',
  x_norm: 0.5,
  y_norm: 0.7,
};

/** Cross-platform font family resolution. Uses platform-native fonts so we
 *  don't pay the cost of bundling custom font files. */
export function fontFamilyForOverlay(font: VideoOverlayFont): string | undefined {
  switch (font) {
    case 'serif':
      return Platform.OS === 'ios' ? 'Georgia' : 'serif';
    case 'mono':
      return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
    case 'rounded':
      return Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium';
    case 'system':
    default:
      return undefined;
  }
}

/** Resolve a size bucket to an absolute font size in pt. */
export function fontSizeForOverlay(size: VideoOverlaySize): number {
  switch (size) {
    case 'sm':
      return 18;
    case 'md':
      return 24;
    case 'lg':
      return 32;
    case 'xl':
      return 44;
    default:
      return 32;
  }
}

/** Resolve a color name to a hex/CSS string. */
export function colorForOverlay(color: VideoOverlayColor): string {
  switch (color) {
    case 'black':
      return '#0B1220';
    case 'cyan':
      return '#38BDF8';
    case 'yellow':
      return '#FACC15';
    case 'white':
    default:
      return '#FFFFFF';
  }
}

/** Compose a TextStyle from a style — used by both composer preview and feed. */
export function overlayTextStyle(style: VideoOverlayStyle): TextStyle {
  const fontFamily = fontFamilyForOverlay(style.font);
  return {
    fontSize: fontSizeForOverlay(style.size),
    color: colorForOverlay(style.color),
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    ...(fontFamily ? { fontFamily } : {}),
  };
}

/** Picker option lists for the editor UI. */
export const OVERLAY_FONT_OPTIONS: Array<{ id: VideoOverlayFont; label: string }> = [
  { id: 'system', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
  { id: 'rounded', label: 'Bold' },
];

export const OVERLAY_SIZE_OPTIONS: Array<{ id: VideoOverlaySize; label: string }> = [
  { id: 'sm', label: 'S' },
  { id: 'md', label: 'M' },
  { id: 'lg', label: 'L' },
  { id: 'xl', label: 'XL' },
];

export const OVERLAY_COLOR_OPTIONS: Array<{ id: VideoOverlayColor; label: string }> = [
  { id: 'white', label: 'White' },
  { id: 'black', label: 'Black' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'yellow', label: 'Yellow' },
];

/** Type-narrow + clamp + default-fill an unknown JSON blob from the DB. */
export function parseOverlayStyle(raw: unknown): VideoOverlayStyle | null {
  if (raw == null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const font = (['system', 'serif', 'mono', 'rounded'].includes(String(r.font))
    ? r.font
    : DEFAULT_OVERLAY_STYLE.font) as VideoOverlayFont;
  const size = (['sm', 'md', 'lg', 'xl'].includes(String(r.size))
    ? r.size
    : DEFAULT_OVERLAY_STYLE.size) as VideoOverlaySize;
  const color = (['white', 'black', 'cyan', 'yellow'].includes(String(r.color))
    ? r.color
    : DEFAULT_OVERLAY_STYLE.color) as VideoOverlayColor;
  const xRaw = Number(r.x_norm);
  const yRaw = Number(r.y_norm);
  const x_norm = Number.isFinite(xRaw)
    ? Math.max(0, Math.min(1, xRaw))
    : DEFAULT_OVERLAY_STYLE.x_norm;
  const y_norm = Number.isFinite(yRaw)
    ? Math.max(0, Math.min(1, yRaw))
    : DEFAULT_OVERLAY_STYLE.y_norm;
  return { font, size, color, x_norm, y_norm };
}

/** Serialize for the DB — same shape we accept on the read path. */
export function serializeOverlayStyle(style: VideoOverlayStyle): Record<string, unknown> {
  return {
    font: style.font,
    size: style.size,
    color: style.color,
    x_norm: Math.max(0, Math.min(1, style.x_norm)),
    y_norm: Math.max(0, Math.min(1, style.y_norm)),
  };
}

/**
 * Helper: convert a saved `(x_norm, y_norm)` anchor (which represents the
 * **visual center** of the rendered text) to the absolute `(left, top)` of
 * the wrapping `<View>` that holds the text.
 *
 * `textSize` is the actual rendered width/height, obtained via `onLayout`.
 * Returns `null` until we have a measurement so callers can hide the element
 * (e.g. opacity: 0) on first paint to avoid a single-frame flash at (0,0).
 *
 * Used by:
 *  - feed renderer (`FeedOverlayText`)
 *  - composer's draggable preview (`DraggableOverlayText`)
 *  - composer's frozen-Android preview
 *  - floating mini-preview PIP
 */
export function computeOverlayTopLeft(
  style: Pick<VideoOverlayStyle, 'x_norm' | 'y_norm'>,
  containerWidth: number,
  containerHeight: number,
  textSize: { w: number; h: number } | null,
): { left: number; top: number } | null {
  if (!textSize || containerWidth <= 0 || containerHeight <= 0) return null;
  const cx = (style.x_norm ?? 0.5) * containerWidth;
  const cy = (style.y_norm ?? 0.7) * containerHeight;
  // Clamp the text fully inside the container so it never paints off-screen.
  const halfW = textSize.w / 2;
  const halfH = textSize.h / 2;
  const left = Math.max(4, Math.min(containerWidth - textSize.w - 4, cx - halfW));
  const top = Math.max(4, Math.min(containerHeight - textSize.h - 4, cy - halfH));
  return { left, top };
}
