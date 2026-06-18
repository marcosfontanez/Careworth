import { describe, expect, it } from 'vitest';
import {
  canVisitorViewPulseBoard,
  isPulseBoardEnabled,
  shouldShowPulseBoardSection,
} from '@/lib/pulseBoardVisibility';

describe('pulseBoardVisibility', () => {
  it('treats board as enabled unless explicitly false', () => {
    expect(isPulseBoardEnabled({ pulseBoardEnabled: true })).toBe(true);
    expect(isPulseBoardEnabled({ pulseBoardEnabled: undefined })).toBe(true);
    expect(isPulseBoardEnabled({ pulseBoardEnabled: false })).toBe(false);
  });

  it('lets visitors view board on private profiles when enabled', () => {
    expect(
      canVisitorViewPulseBoard({ pulseBoardEnabled: true }, false, {
        blockRelationship: 'none',
      }),
    ).toBe(true);
  });

  it('hides board for visitors when owner disabled it', () => {
    expect(
      canVisitorViewPulseBoard({ pulseBoardEnabled: false }, false, {
        blockRelationship: 'none',
      }),
    ).toBe(false);
  });

  it('hides board when viewer is blocked', () => {
    expect(
      canVisitorViewPulseBoard({ pulseBoardEnabled: true }, false, {
        blockRelationship: 'viewer_blocked',
      }),
    ).toBe(false);
  });

  it('shows section for owner even when board disabled', () => {
    expect(
      shouldShowPulseBoardSection({ pulseBoardEnabled: false }, true),
    ).toBe(true);
  });

  it('hides section for visitors when board disabled', () => {
    expect(
      shouldShowPulseBoardSection({ pulseBoardEnabled: false }, false, {
        blockRelationship: 'none',
      }),
    ).toBe(false);
  });
});
