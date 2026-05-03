import type { PulseAvatarFrame } from '@/types';

export function mapPulseAvatarFrameEmbed(raw: unknown): PulseAvatarFrame | null | undefined {
  if (raw == null) return raw === null ? null : undefined;
  // PostgREST sometimes returns one-to-one embeds as a single-element array.
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return mapPulseAvatarFrameEmbed(raw[0]);
  }
  if (typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  if (!id) return undefined;
  const tier = String(o.prize_tier ?? '');
  const prizeTier =
    tier === 'gold' ||
    tier === 'silver' ||
    tier === 'bronze' ||
    tier === 'exclusive' ||
    tier === 'legacy' ||
    tier === 'campaign'
      ? tier
      : 'gold';
  return {
    id,
    slug: String(o.slug ?? ''),
    label: String(o.label ?? ''),
    subtitle: o.subtitle != null ? String(o.subtitle) : null,
    ringCaption:
      o.ring_caption != null && String(o.ring_caption).trim()
        ? String(o.ring_caption).trim()
        : null,
    prizeTier,
    monthStart: String(o.month_start ?? ''),
    ringColor: String(o.ring_color ?? '#FFFFFF'),
    glowColor: String(o.glow_color ?? '#FFFFFF'),
  };
}
