import type { LiveGift, LiveGiftTier } from '@/types';

/** Canonical ids + Spark prices — keep aligned with `live_stream_gift_catalog` (Supabase migration). */
export const LIVE_GIFTS: LiveGift[] = [
  { id: 'heart', name: 'Heart', emoji: '❤️', sparkCost: 0, tier: 'free', animation: 'float', color: '#EF4444' },
  { id: 'clap', name: 'Clap', emoji: '👏', sparkCost: 0, tier: 'free', animation: 'float', color: '#F59E0B' },
  { id: 'fire', name: 'Fire', emoji: '🔥', sparkCost: 0, tier: 'free', animation: 'float', color: '#F97316' },
  { id: 'coffee', name: 'Night Shift Coffee', emoji: '☕', sparkCost: 10, tier: 'standard', animation: 'float', color: '#92400E' },
  { id: 'bandaid', name: 'Band-Aid', emoji: '🩹', sparkCost: 25, tier: 'standard', animation: 'float', color: '#F59E0B' },
  { id: 'syringe', name: 'Syringe', emoji: '💉', sparkCost: 50, tier: 'standard', animation: 'burst', color: '#3B82F6' },
  { id: 'pill', name: 'Pill', emoji: '💊', sparkCost: 50, tier: 'standard', animation: 'burst', color: '#8B5CF6' },
  { id: 'mask', name: 'Surgical Mask', emoji: '😷', sparkCost: 75, tier: 'standard', animation: 'burst', color: '#14B8A6' },
  { id: 'stethoscope', name: 'Stethoscope', emoji: '🩺', sparkCost: 100, tier: 'premium', animation: 'burst', color: '#1E4ED8' },
  { id: 'ambulance', name: 'Ambulance', emoji: '🚑', sparkCost: 200, tier: 'premium', animation: 'rain', color: '#EF4444' },
  { id: 'dna', name: 'DNA Helix', emoji: '🧬', sparkCost: 300, tier: 'premium', animation: 'rain', color: '#6366F1' },
  { id: 'microscope', name: 'Microscope', emoji: '🔬', sparkCost: 500, tier: 'premium', animation: 'rain', color: '#0EA5E9' },
  {
    id: 'hospital',
    name: 'Hospital',
    emoji: '🏥',
    sparkCost: 1000,
    tier: 'legendary',
    animation: 'fullscreen',
    color: '#D4A63A',
  },
  { id: 'angel', name: 'Guardian Angel', emoji: '👼', sparkCost: 2500, tier: 'legendary', animation: 'fullscreen', color: '#F59E0B' },
  {
    id: 'crown',
    name: 'Chief of Staff',
    emoji: '👑',
    sparkCost: 5000,
    tier: 'legendary',
    animation: 'fullscreen',
    color: '#D4A63A',
  },
];

export function getGiftsByTier(tier: LiveGiftTier): LiveGift[] {
  return LIVE_GIFTS.filter((g) => g.tier === tier);
}
