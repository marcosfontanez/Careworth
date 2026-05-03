/**
 * Specialty stickers — overlay icons + label combos themed for nursing /
 * healthcare specialties. Renders as Text + emoji over the photo or video
 * preview today; later we can swap to animated SVG / Lottie.
 *
 * The sticker text is appended to the on-video text line (`overlayLine`)
 * so it gets carried into the post caption automatically.
 */

import type { Ionicons } from '@expo/vector-icons';

export type SpecialtyStickerId =
  | 'icu' | 'er' | 'or' | 'peds' | 'nicu' | 'ob' | 'ortho'
  | 'oncology' | 'hospice' | 'cardiac' | 'medsurg' | 'travel'
  | 'newgrad' | 'student' | 'codeblue' | 'shiftpulse';

export interface SpecialtySticker {
  id: SpecialtyStickerId;
  label: string;
  emoji: string;
  /** Suggested overlay line text (shows on-photo / on-video). */
  overlay: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SPECIALTY_STICKERS: SpecialtySticker[] = [
  { id: 'icu',       label: 'ICU',          emoji: '🫁', overlay: 'ICU 🫁',         color: '#3B82F6', icon: 'pulse' },
  { id: 'er',        label: 'ER',           emoji: '🚑', overlay: 'ER 🚑',          color: '#EF4444', icon: 'medkit' },
  { id: 'or',        label: 'OR',           emoji: '🩺', overlay: 'OR 🩺',          color: '#10B981', icon: 'cut' },
  { id: 'peds',      label: 'Peds',         emoji: '🧸', overlay: 'Peds 🧸',        color: '#F59E0B', icon: 'happy' },
  { id: 'nicu',      label: 'NICU',         emoji: '🍼', overlay: 'NICU 🍼',        color: '#EC4899', icon: 'happy' },
  { id: 'ob',        label: 'L&D',          emoji: '👶', overlay: 'L&D 👶',         color: '#A855F7', icon: 'heart' },
  { id: 'ortho',     label: 'Ortho',        emoji: '🦴', overlay: 'Ortho 🦴',       color: '#9CA3AF', icon: 'fitness' },
  { id: 'oncology',  label: 'Oncology',     emoji: '🎗️', overlay: 'Oncology 🎗️',    color: '#06B6D4', icon: 'ribbon' },
  { id: 'hospice',   label: 'Hospice',      emoji: '🌿', overlay: 'Hospice 🌿',     color: '#22C55E', icon: 'leaf' },
  { id: 'cardiac',   label: 'Cardiac',      emoji: '❤️', overlay: 'Cardiac ❤️',     color: '#DC2626', icon: 'heart' },
  { id: 'medsurg',   label: 'Med-Surg',     emoji: '🛏️', overlay: 'Med-Surg 🛏️',    color: '#0EA5E9', icon: 'bed' },
  { id: 'travel',    label: 'Travel',       emoji: '🧳', overlay: 'Travel Nurse 🧳', color: '#F97316', icon: 'airplane' },
  { id: 'newgrad',   label: 'New Grad',     emoji: '🎓', overlay: 'New Grad 🎓',    color: '#8B5CF6', icon: 'school' },
  { id: 'student',   label: 'Student',      emoji: '📚', overlay: 'Nursing Student 📚', color: '#14B8A6', icon: 'book' },
  { id: 'codeblue',  label: 'Code Blue',    emoji: '🔵', overlay: 'CODE BLUE 🔵',   color: '#1D4ED8', icon: 'flash' },
  { id: 'shiftpulse',label: 'Shift Pulse',  emoji: '💓', overlay: 'Shift Pulse 💓', color: '#F43F5E', icon: 'heart-circle' },
];

export function getSticker(id: SpecialtyStickerId): SpecialtySticker | null {
  return SPECIALTY_STICKERS.find((s) => s.id === id) ?? null;
}
