/** Per-circle last-visit timestamps for web activity badges (localStorage only). */

const VISIT_PREFIX = "pulseverse_web_circle_visit_";

export function getCircleLastVisitAt(communityId: string): string | null {
  if (typeof window === "undefined" || !communityId) return null;
  try {
    const raw = localStorage.getItem(VISIT_PREFIX + communityId);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function setCircleLastVisitAt(communityId: string, at: string = new Date().toISOString()): void {
  if (typeof window === "undefined" || !communityId) return;
  try {
    localStorage.setItem(VISIT_PREFIX + communityId, at);
  } catch {
    /* best-effort */
  }
}

/** Batch-read last visit timestamps for joined circles. */
export function getCircleLastVisitMap(communityIds: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of communityIds) {
    const at = getCircleLastVisitAt(id);
    if (at) out[id] = at;
  }
  return out;
}
