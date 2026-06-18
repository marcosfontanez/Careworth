import { describe, expect, it } from 'vitest';
import { validatePulseBoardBody } from '@/lib/pulseBoardValidation';

describe('validatePulseBoardBody', () => {
  it('accepts trimmed text within limit', () => {
    expect(validatePulseBoardBody('  Great energy!  ')).toEqual({
      ok: true,
      body: 'Great energy!',
    });
  });

  it('rejects empty', () => {
    expect(validatePulseBoardBody('   ').ok).toBe(false);
  });

  it('rejects links', () => {
    expect(validatePulseBoardBody('check https://example.com').ok).toBe(false);
    expect(validatePulseBoardBody('visit www.example.com').ok).toBe(false);
  });

  it('rejects overlong text', () => {
    expect(validatePulseBoardBody('x'.repeat(161)).ok).toBe(false);
  });
});
