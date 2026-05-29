import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/liveKitConfig', () => ({
  isProductionReleaseBuild: vi.fn(() => false),
  liveKitConfigured: vi.fn(() => false),
}));

describe('defaultFeedCreatorGifting', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_FEED_CREATOR_GIFTING;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_FEED_CREATOR_GIFTING;
  });

  it('defaults off in production release builds', async () => {
    const liveKitConfig = await import('@/lib/liveKitConfig');
    vi.mocked(liveKitConfig.isProductionReleaseBuild).mockReturnValue(true);

    const { defaultFeedCreatorGifting } = await import('@/lib/featureFlags');
    expect(defaultFeedCreatorGifting()).toBe(false);
  });

  it('enables in production when EXPO_PUBLIC_FEED_CREATOR_GIFTING=1', async () => {
    const liveKitConfig = await import('@/lib/liveKitConfig');
    vi.mocked(liveKitConfig.isProductionReleaseBuild).mockReturnValue(true);
    process.env.EXPO_PUBLIC_FEED_CREATOR_GIFTING = '1';

    const { defaultFeedCreatorGifting } = await import('@/lib/featureFlags');
    expect(defaultFeedCreatorGifting()).toBe(true);
  });

  it('respects explicit off override', async () => {
    process.env.EXPO_PUBLIC_FEED_CREATOR_GIFTING = '0';

    const { defaultFeedCreatorGifting } = await import('@/lib/featureFlags');
    expect(defaultFeedCreatorGifting()).toBe(false);
  });
});

describe('defaultFeedClipping', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.EXPO_PUBLIC_FEED_CLIPPING;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_FEED_CLIPPING;
  });

  it('defaults off in production release builds', async () => {
    const liveKitConfig = await import('@/lib/liveKitConfig');
    vi.mocked(liveKitConfig.isProductionReleaseBuild).mockReturnValue(true);

    const { defaultFeedClipping } = await import('@/lib/featureFlags');
    expect(defaultFeedClipping()).toBe(false);
  });

  it('enables in production only when EXPO_PUBLIC_FEED_CLIPPING=1', async () => {
    const liveKitConfig = await import('@/lib/liveKitConfig');
    vi.mocked(liveKitConfig.isProductionReleaseBuild).mockReturnValue(true);
    process.env.EXPO_PUBLIC_FEED_CLIPPING = '1';

    const { defaultFeedClipping } = await import('@/lib/featureFlags');
    expect(defaultFeedClipping()).toBe(true);
  });
});
