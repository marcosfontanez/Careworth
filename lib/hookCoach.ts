/**
 * Hook coach — rates the strength of a video / post hook (the first line a
 * scroller sees). Heuristic, not a model. Grades A / B / C with a single
 * actionable suggestion so creators can learn over time.
 *
 * Inputs we care about:
 *  - shortTitle (the headline)
 *  - overlayLine (on-video sticker text)
 *  - first sentence of the caption
 */

export type HookGrade = 'A' | 'B' | 'C';

export interface HookCoachResult {
  grade: HookGrade;
  score: number;           // 0-100
  positives: string[];
  suggestions: string[];
}

const POWER_WORDS = [
  'never', 'always', 'shocking', 'wait', 'before', 'after', 'how to', 'why',
  'truth', 'mistake', 'secret', 'finally', 'stop', 'don\'t', 'i wish', 'nobody tells',
  'pov', 'storytime',
];

const QUESTION_HINTS = ['?', 'what', 'how', 'why', 'when', 'who'];

export function coachHook(input: {
  shortTitle?: string;
  overlay?: string;
  caption?: string;
}): HookCoachResult {
  const headline = (input.shortTitle ?? input.overlay ?? firstSentence(input.caption ?? ''))
    .trim();
  if (!headline) {
    return {
      grade: 'C',
      score: 25,
      positives: [],
      suggestions: ['Add a short headline so scrollers know what they\'re about to see.'],
    };
  }

  const lower = headline.toLowerCase();
  let score = 50;
  const positives: string[] = [];
  const suggestions: string[] = [];

  if (headline.length <= 8) {
    suggestions.push('Hook reads short — try 3-7 punchy words.');
  } else if (headline.length <= 60) {
    score += 10;
    positives.push('Length is in the sweet spot (≤ 60 chars).');
  } else {
    score -= 15;
    suggestions.push('Trim to ≤ 60 characters so the hook fits on one line.');
  }

  if (POWER_WORDS.some((w) => lower.includes(w))) {
    score += 15;
    positives.push('Uses a power word that catches the eye.');
  } else {
    suggestions.push('Try a power word like "POV", "Wait…", "Never", or "How I…".');
  }

  if (QUESTION_HINTS.some((q) => lower.includes(q))) {
    score += 8;
    positives.push('Frames the hook as a question — great for replies.');
  }

  if (/\d/.test(headline)) {
    score += 6;
    positives.push('Has a number — listicle / countdown vibe.');
  }

  if (/[A-Z]{2,}/.test(headline)) {
    score += 4;
    positives.push('Strong capitalization for emphasis.');
  } else if (headline === headline.toLowerCase()) {
    suggestions.push('Capitalize Each Important Word for more presence.');
  }

  if (headline.endsWith('.')) {
    score -= 4;
    suggestions.push('Drop the period — punchy hooks don\'t need it.');
  }

  score = Math.max(0, Math.min(100, score));
  const grade: HookGrade = score >= 75 ? 'A' : score >= 55 ? 'B' : 'C';
  return { grade, score, positives, suggestions };
}

function firstSentence(s: string): string {
  const m = s.split(/[.!?\n]/)[0]?.trim() ?? '';
  return m.length > 80 ? m.slice(0, 80) : m;
}
