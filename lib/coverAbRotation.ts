/** Deterministic A/B thumbnail rotation per post per UTC day (no server impressions yet). */
export function pickCoverForSession(postId: string, primary?: string, alt?: string): string | undefined {
  const a = primary?.trim();
  const b = alt?.trim();
  if (!a) return b;
  if (!b) return a;
  const day = Math.floor(Date.now() / 86_400_000);
  let h = 0;
  const key = `${postId}:${day}`;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2 === 0 ? a : b;
}
