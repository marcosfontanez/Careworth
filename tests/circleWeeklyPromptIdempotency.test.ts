import { describe, expect, it } from 'vitest';

/**
 * Mirrors the generator's same-week skip guard:
 * if a prompt row exists for week_start_date and force !== true, skip write.
 */
function shouldSkipExistingWeekPrompt(
  existingPromptId: string | null | undefined,
  force: boolean,
): boolean {
  return !!existingPromptId && !force;
}

describe('weekly prompt same-week idempotency', () => {
  it('skips write when a prompt already exists for the week', () => {
    expect(shouldSkipExistingWeekPrompt('prompt-abc', false)).toBe(true);
  });

  it('allows write when force is true even if a prompt exists', () => {
    expect(shouldSkipExistingWeekPrompt('prompt-abc', true)).toBe(false);
  });

  it('allows write when no prompt exists for the week', () => {
    expect(shouldSkipExistingWeekPrompt(null, false)).toBe(false);
    expect(shouldSkipExistingWeekPrompt(undefined, false)).toBe(false);
  });
});
