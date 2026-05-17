import type { Href } from 'expo-router';

/** Typed targets for the `app/live/*` stack — use instead of raw strings + `as any`. */

export function liveStreamHref(streamId: string): Href {
  return `/live/${encodeURIComponent(streamId)}` as Href;
}

export function liveGoLiveHref(): Href {
  return '/live/go-live' as Href;
}

export function liveHostControlsHref(opts?: { demo?: boolean }): Href {
  if (opts?.demo) return '/live/host-controls?demo=1' as Href;
  return '/live/host-controls' as Href;
}

export function liveHighlightsHref(streamId: string): Href {
  return `/live/highlights?streamId=${encodeURIComponent(streamId)}` as Href;
}

/** Highlights sheet without a stream context (info-only). */
export function liveHighlightsRootHref(): Href {
  return '/live/highlights' as Href;
}
