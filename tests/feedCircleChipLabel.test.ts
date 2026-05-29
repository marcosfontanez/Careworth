import { describe, expect, it } from 'vitest';
import { formatFeedCircleChipLabel } from '@/lib/feedCircleChipLabel';

describe('formatFeedCircleChipLabel', () => {
  it('prefers community name', () => {
    expect(formatFeedCircleChipLabel('Nursing', 'nursing')).toBe('Posted in Nursing');
  });

  it('humanizes slug when name is missing', () => {
    expect(formatFeedCircleChipLabel(null, 'icu-nursing')).toBe('Posted in ICU Nursing');
  });

  it('falls back to generic label when only id is known', () => {
    expect(formatFeedCircleChipLabel(null, null, 'uuid-123')).toBe('Posted in Circle');
  });

  it('returns null when nothing is available', () => {
    expect(formatFeedCircleChipLabel(null, null, null)).toBeNull();
  });
});
