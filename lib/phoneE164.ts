/**
 * Normalize user input to E.164 for Supabase phone OTP.
 * - Keeps existing `+…` (minimally trimmed).
 * - 10-digit US numbers get `+1`.
 * - 11-digit numbers starting with country code `1` get `+` prefix.
 * - Other digit-only input gets a single leading `+` (caller should include country code).
 */
export function normalizePhoneE164(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith('+')) return t.replace(/\s/g, '');
  const digits = t.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return t;
}
