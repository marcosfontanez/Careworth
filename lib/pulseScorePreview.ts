/**
 * Pulse Score preview — predicts where this post is likely to land on the
 * Pulse leaderboard before publishing. Heuristic only; the real Pulse score
 * is computed server-side post-engagement. The preview is calibrated to
 * match the dimensions the ranker rewards (per `services/supabase/pulseScores.ts`).
 *
 * Output is stable across renders for the same inputs so the UI doesn't flicker.
 */

export type PulseScorePulse = 'low' | 'medium' | 'high' | 'elite';

export interface PulseScorePreview {
  score: number;          // 0-100
  pulse: PulseScorePulse;
  reasons: string[];
  tips: string[];
}

export interface PulseScorePreviewInput {
  hasMedia: boolean;
  isVideo: boolean;
  hasCover: boolean;
  hasSound: boolean;
  hashtagCount: number;
  shortTitleLen: number;
  captionLen: number;
  overlayLen: number;
  filterApplied: boolean;
  isEducation: boolean;
  hasShiftContext: boolean;
  hasSeries: boolean;
  hookScore: number;       // 0-100 from coachHook
  brandKitApplied: boolean;
}

export function previewPulseScore(input: PulseScorePreviewInput): PulseScorePreview {
  let score = 30;
  const reasons: string[] = [];
  const tips: string[] = [];

  if (input.hasMedia) {
    score += 15;
    reasons.push('Has media (+15)');
  } else {
    tips.push('Add a video or photo — text-only posts rank lower.');
  }
  if (input.isVideo) {
    score += 10;
    reasons.push('Video posts get a boost (+10)');
  }
  if (input.hasCover) {
    score += 6;
    reasons.push('Custom cover (+6)');
  } else if (input.isVideo) {
    tips.push('Pick a custom cover — auto-frame thumbnails are forgettable.');
  }
  if (input.hasSound) {
    score += 8;
    reasons.push('Sound attached (+8)');
  } else if (input.isVideo) {
    tips.push('Pair a sound — sound-on videos get more replays.');
  }
  if (input.filterApplied) {
    score += 3;
    reasons.push('Color grade applied (+3)');
  }

  if (input.hashtagCount === 0) {
    tips.push('Add 3-5 relevant hashtags to enter discovery.');
  } else if (input.hashtagCount > 8) {
    score -= 4;
    tips.push('Too many hashtags. Keep it to 5-8.');
  } else {
    score += 6;
    reasons.push(`${input.hashtagCount} hashtag${input.hashtagCount === 1 ? '' : 's'} (+6)`);
  }

  if (input.shortTitleLen > 0 && input.shortTitleLen <= 60) {
    score += 5;
    reasons.push('Has a headline (+5)');
  } else if (input.shortTitleLen === 0) {
    tips.push('Add a punchy headline.');
  }
  if (input.overlayLen > 0 && input.overlayLen <= 80) {
    score += 4;
    reasons.push('On-video text (+4)');
  }
  if (input.captionLen > 12) {
    score += 3;
    reasons.push('Caption tells a story (+3)');
  }

  if (input.hookScore >= 75) {
    score += 10;
    reasons.push('Strong hook (+10)');
  } else if (input.hookScore < 55) {
    tips.push('Hook coach rates this hook as weak — tighten the opening line.');
  }

  if (input.isEducation) {
    score += 4;
    reasons.push('Educator content (+4)');
  }
  if (input.hasShiftContext) {
    score += 2;
    reasons.push('Shift context tagged (+2)');
  }
  if (input.hasSeries) {
    score += 3;
    reasons.push('Part of a series (+3)');
  }
  if (input.brandKitApplied) {
    score += 2;
    reasons.push('Brand kit applied (+2)');
  }

  score = Math.max(0, Math.min(100, score));
  const pulse: PulseScorePulse =
    score >= 85 ? 'elite' : score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';

  return { score, pulse, reasons, tips };
}
