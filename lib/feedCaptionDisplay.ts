const LEGACY_HEADLINE_MAX_LEN = 120;

/**
 * Feed overlay caption — strips a legacy prepended headline block
 * (`shortTitle` / photo `headline` joined with `\n\n` before post).
 */
export function feedCaptionForOverlay(caption: string | null | undefined): string {
  const raw = (caption ?? '').trim();
  if (!raw) return '';

  const parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (
    parts.length >= 2 &&
    parts[0]!.length > 0 &&
    parts[0]!.length <= LEGACY_HEADLINE_MAX_LEN
  ) {
    return parts.slice(1).join('\n\n').trim();
  }

  return raw;
}
