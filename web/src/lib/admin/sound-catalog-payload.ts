const POST_MEDIA_PUBLIC_MARKER = "/storage/v1/object/public/post-media/";

/** Only expose HTTPS public post-media URLs for staff preview (never signed paths). */
export function sanitizeSoundPreviewUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("https://")) return null;
  if (trimmed.includes("/object/sign/")) return null;
  if (!trimmed.includes(POST_MEDIA_PUBLIC_MARKER)) return null;
  return trimmed;
}
