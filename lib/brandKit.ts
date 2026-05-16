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

/**
 * Maps `profiles.brand_kit` jsonb to a {@link BrandKit}, or `undefined` when the column is unset / empty.
 * Used by profile joins so feed/composer can render watermarks without an extra round-trip.
 */
export function brandKitFromProfileColumn(raw: unknown): BrandKit | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).length === 0) return undefined;
  return {
    primary: typeof r.primary === 'string' ? r.primary : DEFAULT_BRAND_KIT.primary,
    accent: typeof r.accent === 'string' ? r.accent : DEFAULT_BRAND_KIT.accent,
    scrubs: typeof r.scrubs === 'string' ? r.scrubs : DEFAULT_BRAND_KIT.scrubs,
    logoUrl: typeof r.logoUrl === 'string' ? r.logoUrl : null,
    fontKey: typeof r.fontKey === 'string' ? r.fontKey : DEFAULT_BRAND_KIT.fontKey,
  };
}

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
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ brand_kit: merged as never })
      .eq('id', userId);
    if (error) {
      cache.delete(userId);
      if (__DEV__) console.warn('[saveBrandKit]', error.message);
      return loadBrandKit(userId);
    }
    cache.set(userId, merged);
    return merged;
  } catch (e) {
    cache.delete(userId);
    if (__DEV__) console.warn('[saveBrandKit]', e);
    return loadBrandKit(userId);
  }
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
