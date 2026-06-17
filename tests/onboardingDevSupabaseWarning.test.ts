import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { warnOnboardingWipProductionSupabaseTarget } from '@/lib/onboarding/devSupabaseTargetWarning';

describe('warnOnboardingWipProductionSupabaseTarget', () => {
  beforeEach(() => {
    vi.stubGlobal('__DEV__', true);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('warns in dev when a hosted Supabase URL is configured', () => {
    warnOnboardingWipProductionSupabaseTarget('https://example.supabase.co');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('286–303'));
  });

  it('does not warn for local Supabase URLs', () => {
    warnOnboardingWipProductionSupabaseTarget('http://127.0.0.1:54321');
    expect(console.warn).not.toHaveBeenCalled();
  });
});
