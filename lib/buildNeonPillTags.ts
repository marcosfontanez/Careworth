import { MY_PULSE_MAX_IDENTITY_TAGS, MY_PULSE_TAGS_CHAR_BUDGET } from '@/constants';

/** Match {@link components/mypage/MyPageContent.tsx} pill truncation. */
const NEON_PILL_MAX_LEN = 14;

export type NeonPillTagSource = {
  identityTags?: string[] | null | undefined;
};

/**
 * Neon pills from `profiles.identity_tags` only.
 * Legacy clinician `role` / `specialty` columns are not shown as pills.
 */
export function buildNeonPillTags(src: NeonPillTagSource): string[] {
  const identityTags = src.identityTags ?? [];
  const kept: string[] = [];
  let used = 0;
  for (const t of identityTags) {
    if (kept.length >= MY_PULSE_MAX_IDENTITY_TAGS) break;
    const s = String(t).trim();
    if (!s) continue;
    const trimmed =
      s.length > NEON_PILL_MAX_LEN ? `${s.slice(0, NEON_PILL_MAX_LEN - 1)}…` : s;
    if (used + trimmed.length > MY_PULSE_TAGS_CHAR_BUDGET) break;
    kept.push(trimmed);
    used += trimmed.length;
  }
  return kept;
}
