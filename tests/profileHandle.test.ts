import { describe, expect, it } from 'vitest';
import {
  fallbackHandle,
  profileHandleDisplay,
  profileHandleLineForCreator,
} from '@/utils/profileHandle';

describe('profileHandle fallbacks', () => {
  it('does not throw when displayName and username are missing', () => {
    expect(() =>
      profileHandleDisplay({
        id: 'abc123def456',
        displayName: '',
        username: undefined,
        firstName: '',
        lastName: '',
      }),
    ).not.toThrow();
    expect(
      profileHandleDisplay({
        id: 'abc123def456',
        displayName: '',
        username: undefined,
        firstName: '',
        lastName: '',
      }),
    ).toMatch(/^@/);
  });

  it('returns pulseverse.user when no identifiable fields exist', () => {
    expect(
      fallbackHandle({
        id: '',
        displayName: '',
        firstName: '',
        lastName: '',
      }),
    ).toBe('pulseverse.user');
  });

  it('profileHandleLineForCreator accepts partial creator summary', () => {
    expect(
      profileHandleLineForCreator({
        id: '07d4196d-4f5f-47bb-bdc3-dbc7b1d7b848',
        displayName: 'PulseVerse user',
        username: 'marco.rn',
      }),
    ).toBe('@marco.rn');
  });

  it('never passes a raw username string into profileHandleDisplay (regression)', () => {
    const wrongArg = 'marco.rn' as unknown as Parameters<typeof profileHandleDisplay>[0];
    expect(() => profileHandleDisplay(wrongArg)).not.toThrow();
  });
});
