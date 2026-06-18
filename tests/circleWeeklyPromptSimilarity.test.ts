import { describe, expect, it } from 'vitest';
import {
  normalizePromptText,
  jaccardSimilarity,
  isTooSimilarToRecent,
} from '@/lib/circles/weeklyPromptSimilarity';

describe('normalizePromptText', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizePromptText("What's  your PET's   toxic trait?!")).toBe(
      'what s your pet s toxic trait',
    );
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical text and lower for different text', () => {
    expect(jaccardSimilarity('a b c', 'a b c')).toBe(1);
    expect(jaccardSimilarity('a b c', 'x y z')).toBe(0);
    expect(jaccardSimilarity('a b c d', 'a b x y')).toBeCloseTo(2 / 6, 5);
  });
});

describe('isTooSimilarToRecent', () => {
  const recent = [
    {
      prompt_title: "Show us your pet's toxic trait",
      prompt_body: 'Drop a clip of your pet being chaotic and lovable.',
    },
    {
      prompt_title: 'Best thing you ate this week',
      prompt_body: 'Share a photo and tell us why it slapped.',
    },
  ];

  it('rejects exact duplicates (ignoring case/punctuation)', () => {
    const res = isTooSimilarToRecent(
      {
        title: "Show us your pet's toxic trait!",
        body: 'Drop a clip of your pet being chaotic and lovable.',
      },
      recent,
    );
    expect(res.tooSimilar).toBe(true);
    expect(res.reason).toBe('exact_duplicate');
    expect(res.maxScore).toBe(1);
  });

  it('rejects highly overlapping concepts above threshold', () => {
    const res = isTooSimilarToRecent(
      {
        title: "Show us your pet's toxic trait today",
        body: 'Drop a clip of your pet being chaotic and very lovable.',
      },
      recent,
    );
    expect(res.tooSimilar).toBe(true);
    expect(res.reason).toBe('high_overlap');
  });

  it('accepts a clearly different prompt', () => {
    const res = isTooSimilarToRecent(
      {
        title: 'Which fictional character would adopt your dog?',
        body: 'Cast the movie of your pet life and tell us who plays the lead.',
      },
      recent,
    );
    expect(res.tooSimilar).toBe(false);
    expect(res.reason).toBe(null);
  });

  it('accepts anything when there is no history', () => {
    const res = isTooSimilarToRecent({ title: 'Anything', body: 'goes here' }, []);
    expect(res.tooSimilar).toBe(false);
  });
});
