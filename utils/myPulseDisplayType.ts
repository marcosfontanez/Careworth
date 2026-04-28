import type {
  ProfileUpdate,
  ProfileUpdateDisplayType,
  ProfileUpdateType,
} from '@/types';

/**
 * Collapse the legacy DB types into the UI card types used by PulseVerse.
 * Rules:
 *   - `thought`, `status` → **thought** (plain personal text)
 *   - `link_post`, `link_live` → **clip** (internal feed / live video content)
 *   - `link_circle` → **circle** (pinned Circles discussion — its own type with
 *     a distinct color and "Circle Discussion" tag so visitors don't mistake
 *     a text conversation for a video clip)
 *   - `media_note` with `linkedUrl` → **link** (external web)
 *   - `media_note` without `linkedUrl` → **pics** (photo-first legacy row)
 *   - `pics` → **pics**
 *
 * Cross-cutting rule: **origin beats type** for Circles. Any update that
 * carries a `linkedCircleSlug` came from a Circle — either a threaded
 * discussion pinned via ShareToMyPulseButton (stored as `link_circle`) OR
 * a feed-style Circle-room post shared via the communities composer
 * (stored as `link_post` with a slug attached). Both should read as the
 * rose-pink "Circle Discussion" card on My Pulse so visitors see one
 * consistent "this came from Circles" signal regardless of whether the
 * underlying row is a thread or a post. `link_live` is deliberately
 * excluded — those stay Clips because they're videos, not conversations.
 */
export function getMyPulseDisplayType(update: ProfileUpdate): ProfileUpdateDisplayType {
  if (
    update.linkedCircleSlug?.trim() &&
    update.type !== 'link_live' &&
    update.type !== 'pics'
  ) {
    return 'circle';
  }
  return mapTypeToDisplay(update.type, {
    hasExternalUrl: !!update.linkedUrl,
    hasMedia: !!update.mediaThumb || (update.picsUrls?.length ?? 0) > 0,
  });
}

export function mapTypeToDisplay(
  type: ProfileUpdateType,
  signals: { hasExternalUrl?: boolean; hasMedia?: boolean } = {},
): ProfileUpdateDisplayType {
  switch (type) {
    case 'thought':
    case 'status':
      return 'thought';
    case 'link_post':
    case 'link_live':
      return 'clip';
    case 'link_circle':
      return 'circle';
    case 'pics':
      return 'pics';
    case 'media_note':
      if (signals.hasExternalUrl) return 'link';
      if (signals.hasMedia) return 'pics';
      return 'link';
    default:
      return 'thought';
  }
}

/** Resolve the best photo URLs for a pics-typed update (with legacy fallback). */
export function resolvePicsUrls(update: ProfileUpdate): string[] {
  if (update.picsUrls && update.picsUrls.length > 0) return update.picsUrls;
  if (update.mediaThumb) return [update.mediaThumb];
  return [];
}
