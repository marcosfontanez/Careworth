/**
 * Mood presets — one-tap "vibe" combos that set filter + sticker overlay +
 * suggested sound title in the composer. Saves the chosen preset key to
 * `posts.mood_preset` so the feed can later badge or shelf by mood.
 */

import type { VideoLookId } from '@/lib/videoFilters';
import type { SpecialtyStickerId } from '@/lib/specialtyStickers';

export type MoodPresetId =
  | 'late_shift_coffee'
  | 'code_white'
  | 'peds_bright'
  | 'quiet_er'
  | 'or_focus'
  | 'travel_glow'
  | 'newgrad_first_week'
  | 'storytime_warmth'
  | 'after_shift_unwind';

export interface MoodPreset {
  id: MoodPresetId;
  label: string;
  emoji: string;
  description: string;
  look: VideoLookId;
  sticker?: SpecialtyStickerId;
  suggestedHashtags: string[];
  suggestedSoundTitle?: string;
  accent: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'late_shift_coffee',
    label: 'Late-shift coffee',
    emoji: '☕',
    description: 'Warm + sleepy + caffeinated.',
    look: 'warm',
    sticker: 'shiftpulse',
    suggestedHashtags: ['NightShift', 'NurseCoffee', 'NurseLife'],
    suggestedSoundTitle: 'Late shift cafe vibes',
    accent: '#F59E0B',
  },
  {
    id: 'code_white',
    label: 'Code white',
    emoji: '⚪',
    description: 'High-contrast, clinical.',
    look: 'bw',
    sticker: 'codeblue',
    suggestedHashtags: ['ICU', 'CriticalCare', 'CodeBlue'],
    accent: '#9CA3AF',
  },
  {
    id: 'peds_bright',
    label: 'Peds bright',
    emoji: '🧸',
    description: 'Sunny, pop, cheerful.',
    look: 'glow',
    sticker: 'peds',
    suggestedHashtags: ['PedsLife', 'PediatricNurse'],
    accent: '#F59E0B',
  },
  {
    id: 'quiet_er',
    label: 'Quiet ER',
    emoji: '🌃',
    description: 'Cool, low-light, eerie quiet.',
    look: 'cool',
    sticker: 'er',
    suggestedHashtags: ['ER', 'NightShift', 'NurseLife'],
    suggestedSoundTitle: 'Quiet ER — 3am mood',
    accent: '#3B82F6',
  },
  {
    id: 'or_focus',
    label: 'OR focus',
    emoji: '🩺',
    description: 'Crisp, sterile, focused.',
    look: 'noir',
    sticker: 'or',
    suggestedHashtags: ['OR', 'PerioperativeNurse'],
    accent: '#10B981',
  },
  {
    id: 'travel_glow',
    label: 'Travel glow',
    emoji: '🧳',
    description: 'Sunset-warm wandering.',
    look: 'sepia',
    sticker: 'travel',
    suggestedHashtags: ['TravelNurse', 'TravelNurseLife'],
    accent: '#F97316',
  },
  {
    id: 'newgrad_first_week',
    label: 'New grad week 1',
    emoji: '🎓',
    description: 'Bright, hopeful, first-day energy.',
    look: 'glow',
    sticker: 'newgrad',
    suggestedHashtags: ['NewGradNurse', 'NurseLife', 'NewGradTips'],
    accent: '#8B5CF6',
  },
  {
    id: 'storytime_warmth',
    label: 'Storytime',
    emoji: '📖',
    description: 'Vintage, intimate, slow.',
    look: 'vintage',
    suggestedHashtags: ['Storytime', 'NurseStorytime'],
    accent: '#C19A6B',
  },
  {
    id: 'after_shift_unwind',
    label: 'After-shift unwind',
    emoji: '🌙',
    description: 'Vignette + chill.',
    look: 'vignette',
    suggestedHashtags: ['SelfCare', 'NurseBurnout', 'NurseLife'],
    accent: '#0F172A',
  },
];

export function getMoodPreset(id: MoodPresetId | string | null | undefined): MoodPreset | null {
  if (!id) return null;
  return MOOD_PRESETS.find((m) => m.id === id) ?? null;
}
