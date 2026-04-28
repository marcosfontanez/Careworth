import type { CreatorSummary, UserProfile } from '@/types';
import type { ExportEndCardData } from '@/types/exportEndCard';

/** Ensure @ prefix for display when handle is present */
export function formatCreatorHandle(handle?: string | null): string | undefined {
  if (!handle?.trim()) return undefined;
  const t = handle.trim();
  return t.startsWith('@') ? t : `@${t}`;
}

/**
 * Primary line prefers @handle for social recognition; falls back to display name.
 * Secondary line joins profession · specialty when present (tertiary hierarchy).
 */
export function getEndCardCreatorLines(data: ExportEndCardData): {
  primary: string;
  secondary?: string;
} {
  const handle = formatCreatorHandle(data.creatorHandle);
  const primary = handle ?? (data.creatorDisplayName?.trim() || 'Creator');
  const bits = [data.profession?.trim(), data.specialty?.trim()].filter(Boolean);
  const secondary = bits.length ? bits.join(' · ') : undefined;
  return { primary, secondary };
}

export function buildExportEndCardDataFromProfile(
  profile: Pick<UserProfile, 'displayName' | 'username' | 'role' | 'specialty' | 'avatarUrl'>
): ExportEndCardData {
  return {
    creatorDisplayName: profile.displayName,
    creatorHandle: profile.username,
    profession: profile.role,
    specialty: profile.specialty,
    avatarUrl: profile.avatarUrl,
  };
}

export function buildExportEndCardDataFromCreator(
  creator: Pick<CreatorSummary, 'displayName' | 'username' | 'role' | 'specialty' | 'avatarUrl'>
): ExportEndCardData {
  return {
    creatorDisplayName: creator.displayName,
    creatorHandle: creator.username,
    profession: creator.role,
    specialty: creator.specialty,
    avatarUrl: creator.avatarUrl,
  };
}
