import type { LiveGift, LiveGiftTier } from '@/types';

export const LIVE_GIFTS: LiveGift[] = [
  { id: 'heart', name: 'Heart', emoji: '❤️', coinCost: 0, tier: 'free', animation: 'float', color: '#EF4444' },
  { id: 'clap', name: 'Clap', emoji: '👏', coinCost: 0, tier: 'free', animation: 'float', color: '#F59E0B' },
  { id: 'fire', name: 'Fire', emoji: '🔥', coinCost: 0, tier: 'free', animation: 'float', color: '#F97316' },
  { id: 'coffee', name: 'Night Shift Coffee', emoji: '☕', coinCost: 10, tier: 'standard', animation: 'float', color: '#92400E' },
  { id: 'bandaid', name: 'Band-Aid', emoji: '🩹', coinCost: 25, tier: 'standard', animation: 'float', color: '#F59E0B' },
  { id: 'syringe', name: 'Syringe', emoji: '💉', coinCost: 50, tier: 'standard', animation: 'burst', color: '#3B82F6' },
  { id: 'pill', name: 'Pill', emoji: '💊', coinCost: 50, tier: 'standard', animation: 'burst', color: '#8B5CF6' },
  { id: 'mask', name: 'Surgical Mask', emoji: '😷', coinCost: 75, tier: 'standard', animation: 'burst', color: '#14B8A6' },
  { id: 'stethoscope', name: 'Stethoscope', emoji: '🩺', coinCost: 100, tier: 'premium', animation: 'burst', color: '#1E4ED8' },
  { id: 'ambulance', name: 'Ambulance', emoji: '🚑', coinCost: 200, tier: 'premium', animation: 'rain', color: '#EF4444' },
  { id: 'dna', name: 'DNA Helix', emoji: '🧬', coinCost: 300, tier: 'premium', animation: 'rain', color: '#6366F1' },
  { id: 'microscope', name: 'Microscope', emoji: '🔬', coinCost: 500, tier: 'premium', animation: 'rain', color: '#0EA5E9' },
  { id: 'hospital', name: 'Hospital', emoji: '🏥', coinCost: 1000, tier: 'legendary', animation: 'fullscreen', color: '#D4A63A' },
  { id: 'angel', name: 'Guardian Angel', emoji: '👼', coinCost: 2500, tier: 'legendary', animation: 'fullscreen', color: '#F59E0B' },
  { id: 'crown', name: 'Chief of Staff', emoji: '👑', coinCost: 5000, tier: 'legendary', animation: 'fullscreen', color: '#D4A63A' },
];

export function getGiftsByTier(tier: LiveGiftTier): LiveGift[] {
  return LIVE_GIFTS.filter((g) => g.tier === tier);
}
