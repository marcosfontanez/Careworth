/** Client-safe My Pulse update helpers (no server-only imports). */

export function isWebPulsePicsUpdate(update: {
  type: string;
  linkedUrl?: string | null;
  picsUrls?: string[];
  mediaThumb?: string | null;
}): boolean {
  const type = update.type.toLowerCase();
  if (type === "pics") return true;
  if (type === "media_note" && !update.linkedUrl?.trim()) {
    return (update.picsUrls?.length ?? 0) > 0 || Boolean(update.mediaThumb?.trim());
  }
  return false;
}

export function resolveWebPicsUrls(update: {
  picsUrls?: string[];
  mediaThumb?: string | null;
}): string[] {
  if (update.picsUrls?.length) return update.picsUrls;
  const thumb = update.mediaThumb?.trim();
  return thumb ? [thumb] : [];
}
