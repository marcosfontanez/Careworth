import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/borders/premiumBorderConfig', () => ({
  PULSE_CLASS_OF_2026_FRAME_SLUG: 'class-of-2026-border',
  isClassOf2026FrameSlug: (slug: string | null | undefined) =>
    String(slug ?? '').trim().toLowerCase() === 'class-of-2026-border',
}));

vi.mock('@/lib/pulseRingRasterAssets', () => ({
  shopItemIsClassOf2026: () => false,
  shopItemIsEmeraldRenewalMay2026: () => false,
}));

vi.mock('@/lib/borders/frameSlug', () => ({
  resolveShopBorderFrameSlug: (item: { metadata?: { pulse_frame_slug?: string }; slug?: string }) =>
    String(item?.metadata?.pulse_frame_slug ?? item?.slug ?? '').trim(),
}));

describe('premiumBorderPreview', () => {
  it('detects Class of 2026 slugs', async () => {
    const { isPremiumAnimatedBorderSlug } = await import('@/lib/borders/premiumBorderPreview');
    expect(isPremiumAnimatedBorderSlug('class-of-2026-border')).toBe(true);
    expect(isPremiumAnimatedBorderSlug('beta-tester-border')).toBe(false);
  });

  it('enables full preview on hero surfaces only', async () => {
    const { shouldUsePremiumOverlayFullPreview } = await import('@/lib/borders/premiumBorderPreview');
    expect(
      shouldUsePremiumOverlayFullPreview({
        slug: 'class-of-2026-border',
        priority: 'profile-header',
        visualMode: 'full',
      }),
    ).toBe(true);
    expect(
      shouldUsePremiumOverlayFullPreview({
        slug: 'class-of-2026-border',
        priority: 'shop-grid',
        visualMode: 'full',
      }),
    ).toBe(false);
  });

  it('maps shop metadata slug to premium overlay', async () => {
    const { shopItemUsesPremiumAnimatedOverlay } = await import('@/lib/borders/premiumBorderPreview');
    expect(
      shopItemUsesPremiumAnimatedOverlay({
        type: 'border',
        slug: 'border-class-of-2026',
        metadata: { pulse_frame_slug: 'class-of-2026-border' },
      } as never),
    ).toBe(true);
  });

  it('treats shop-preview as hero priority', async () => {
    const { isPremiumHeroRenderPriority } = await import('@/lib/borders/premiumBorderPreview');
    expect(isPremiumHeroRenderPriority('shop-preview')).toBe(true);
    expect(isPremiumHeroRenderPriority('customize-border')).toBe(true);
    expect(isPremiumHeroRenderPriority('leaderboard-podium')).toBe(true);
    expect(isPremiumHeroRenderPriority('shop-grid')).toBe(false);
  });

  it('flags animated inventory for customize full preview', async () => {
    const { shopBorderDeservesCustomizeFullPreview, borderDeservesCustomizeFullPreview } =
      await import('@/lib/borders/premiumBorderPreview');
    expect(
      shopBorderDeservesCustomizeFullPreview({
        type: 'border',
        slug: 'border-class-of-2026',
        metadata: { pulse_frame_slug: 'class-of-2026-border' },
        visual_tier: 'animated',
      } as never),
    ).toBe(true);
    expect(
      borderDeservesCustomizeFullPreview({
        slug: 'beta-tester-border',
        visualTier: 'static',
        isAnimated: false,
      }),
    ).toBe(false);
    expect(
      borderDeservesCustomizeFullPreview({
        slug: 'some-prize',
        prizeTier: 'gold',
      }),
    ).toBe(true);
  });
});
