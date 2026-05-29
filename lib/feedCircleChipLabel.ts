import { humanizeCommunitySlug } from '@/lib/communitySlug';

/** Readable Circle label for feed chip — no extra network calls when name/slug are known. */
export function formatFeedCircleChipLabel(
  name?: string | null,
  slug?: string | null,
  fallbackId?: string | null,
): string | null {
  const trimmedName = name?.trim();
  if (trimmedName) return `Posted in ${trimmedName}`;

  const fromSlug = slug?.trim() ? humanizeCommunitySlug(slug.trim()) : '';
  if (fromSlug) return `Posted in ${fromSlug}`;

  if (fallbackId?.trim()) return 'Posted in Circle';
  return null;
}
