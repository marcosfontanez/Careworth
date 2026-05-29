import { describe, expect, it } from 'vitest';

import { validateFeedClipRange, FEED_CLIP_MIN_SECONDS, FEED_CLIP_MAX_SECONDS } from '@/lib/feedClipValidation';

describe('validateFeedClipRange', () => {
  it('accepts valid range', () => {
    const r = validateFeedClipRange(0, FEED_CLIP_MIN_SECONDS, 120);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.durationSec).toBe(FEED_CLIP_MIN_SECONDS);
  });

  it('rejects too short', () => {
    const r = validateFeedClipRange(0, 1, 120);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_short');
  });

  it('rejects too long', () => {
    const r = validateFeedClipRange(0, FEED_CLIP_MAX_SECONDS + 5, 120);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too_long');
  });

  it('rejects range beyond source duration', () => {
    const r = validateFeedClipRange(0, 10, 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('exceeds_source');
  });
});
