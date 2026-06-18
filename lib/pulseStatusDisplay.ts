import type { UserProfile } from '@/types';

/** Resolve intro line: Today's Pulse fields, with legacy bio fallback for display only. */
export function resolveMyPulseIntroLine(user: Pick<UserProfile, 'pulseStatusText' | 'pulseStatusEmoji' | 'pulseStatusUpdatedAt' | 'bio'>): {
  text: string;
  emoji: string;
  updatedAt: string | null;
} {
  const text = user.pulseStatusText?.trim() || user.bio?.trim() || '';
  const emoji = user.pulseStatusEmoji?.trim() || '';
  const updatedAt = user.pulseStatusUpdatedAt ?? null;
  return { text, emoji, updatedAt };
}
