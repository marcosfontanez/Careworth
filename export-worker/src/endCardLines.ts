import type { ExportEndCardData } from './types.js';

export function formatCreatorHandle(handle?: string | null): string | undefined {
  if (!handle?.trim()) return undefined;
  const t = handle.trim();
  return t.startsWith('@') ? t : `@${t}`;
}

export function getEndCardCreatorLines(data: ExportEndCardData): {
  primary: string;
  secondary?: string;
  showNameUnderHandle: boolean;
  display?: string;
} {
  const handle = formatCreatorHandle(data.creatorHandle);
  const primary = handle ?? (data.creatorDisplayName?.trim() || 'Creator');
  const display = data.creatorDisplayName?.trim();
  const showNameUnderHandle = Boolean(display && primary.startsWith('@') && display !== primary);
  const bits = [data.profession?.trim(), data.specialty?.trim()].filter(Boolean);
  const secondary = bits.length ? bits.join(' · ') : undefined;
  return { primary, secondary, showNameUnderHandle, display };
}
