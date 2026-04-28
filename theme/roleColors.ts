import { colors } from './colors';
import type { Role } from '@/types';

/**
 * Single source of truth for healthcare role → accent color.
 *
 * Previously there were two drift-prone maps:
 *   - `components/ui/RoleBadge.tsx` (solid badge on cards)
 *   - `components/live/LiveChat.tsx` (tinted role badge in chat)
 * They assigned different hexes to the same roles (e.g. RN as royal vs
 * teal, CNA as teal vs amber), which made the Live surface feel like a
 * different product. Both now read from here.
 *
 * When choosing a color for a new role:
 *   - pull from the `colors` palette first
 *   - use a Tailwind-500-ish hex only when the palette doesn't have a
 *     fitting brand accent
 *   - avoid introducing a second "same color different hex" drift
 */
export const ROLE_COLORS: Record<Role, string> = {
  RN: colors.primary.royal,
  CNA: colors.primary.teal,
  PCT: '#10B981',
  LPN: '#8B5CF6',
  LVN: '#8B5CF6',
  'Student Nurse': '#6366F1',
  'Travel Nurse': colors.primary.gold,
  'Charge Nurse': '#F97316',
  'Nurse Leader': colors.primary.navy,
};

/**
 * Safe accessor used by downstream components. Defaulting to
 * `primary.royal` matches the RoleBadge fallback and keeps visual
 * identity stable when a new role rolls out before we've added an
 * entry here.
 */
export function roleColor(role?: Role | null): string {
  if (!role) return colors.primary.royal;
  return ROLE_COLORS[role] ?? colors.primary.royal;
}
