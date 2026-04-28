/** Direct audio URLs we can play in-app with expo-audio (Spotify/Apple web links need to open externally). */
export function isLikelyDirectAudioUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u.startsWith('http')) return false;
  if (/\.(mp3|m4a|aac|wav|ogg|opus)(\?|#|$)/i.test(u)) return true;
  /* Supabase Storage or similar hosting an audio object */
  if (u.includes('/storage/v') && /\.(mp3|m4a|aac|wav)(\?|$)/i.test(u)) return true;
  return false;
}
