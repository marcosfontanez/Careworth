/** Matches DB constraint `posts_video_overlay_text_length_ck` (migration 153). */
export const VIDEO_OVERLAY_TEXT_MAX_LEN = 80;

/** Trim + cap length for `posts.video_overlay_text` / `Post.videoOverlayText`. */
export function clampVideoOverlayText(raw: string): string {
  return raw.trim().slice(0, VIDEO_OVERLAY_TEXT_MAX_LEN);
}
