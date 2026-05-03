/**
 * Brand kit — the creator's visual identity (color, scrubs color, logo url, font key)
 * applied to overlays, frames, and the end card. Loaded from the user's profile and
 * cached in-memory so composer screens don't refetch on every keystroke.
 *
 * Shape is jsonb on profiles.brand_kit so additive fields (gradient direction,
 * second accent, sticker_pack) can land later without migrations.
 */

import { supabase } from '@/lib/supabase';

export interface BrandKit {
  primary?: string;
  accent?: string;
  scrubs?: string;
  logoUrl?: string | null;
  fontKey?: string;
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  primary: '#14B8A6',
  accent: '#A855F7',
  scrubs: '#0EA5E9',
  logoUrl: null,
  fontKey: 'system',
};

const cache = new Map<string, BrandKit>();

export async function loadBrandKit(userId: string | null | undefined): Promise<BrandKit> {
  if (!userId) return DEFAULT_BRAND_KIT;
  const hit = cache.get(userId);
  if (hit) return hit;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('brand_kit')
      .eq('id', userId)
      .single();
    if (error || !data) return DEFAULT_BRAND_KIT;
    const raw = (data.brand_kit ?? {}) as Record<string, unknown>;
    const kit: BrandKit = {
      primary: typeof raw.primary === 'string' ? raw.primary : DEFAULT_BRAND_KIT.primary,
      accent: typeof raw.accent === 'string' ? raw.accent : DEFAULT_BRAND_KIT.accent,
      scrubs: typeof raw.scrubs === 'string' ? raw.scrubs : DEFAULT_BRAND_KIT.scrubs,
      logoUrl: typeof raw.logoUrl === 'string' ? raw.logoUrl : null,
      fontKey: typeof raw.fontKey === 'string' ? raw.fontKey : DEFAULT_BRAND_KIT.fontKey,
    };
    cache.set(userId, kit);
    return kit;
  } catch {
    return DEFAULT_BRAND_KIT;
  }
}

export async function saveBrandKit(userId: string, next: BrandKit): Promise<BrandKit> {
  const merged = { ...DEFAULT_BRAND_KIT, ...next };
  cache.set(userId, merged);
  try {
    await supabase
      .from('profiles')
      .update({ brand_kit: merged as never })
      .eq('id', userId);
  } catch {
    // brand kit is best-effort persistence; in-memory cache still serves the session
  }
  return merged;
}

/** Hex/HSL helpers for dark-mode safe overlays. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (hex.startsWith('rgb')) return hex;
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
