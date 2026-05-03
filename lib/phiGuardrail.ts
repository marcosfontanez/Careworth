/**
 * Lightweight pre-publish PHI / privacy guardrail. Heuristic only — this is
 * advisory, not a substitute for HIPAA training. We surface warnings so a
 * sleep-deprived nurse doesn't accidentally post an MRN, room number, or
 * full patient name in their caption.
 *
 * Intentionally false-positive friendly: it's better to nag than to leak.
 */

export type PhiSeverity = 'high' | 'medium' | 'low';

export interface PhiFinding {
  severity: PhiSeverity;
  reason: string;
  match: string;
}

const HIGH_RULES: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(MRN|MR#|MR ID)\s*[:#]?\s*\d{4,}\b/i, reason: 'Looks like a medical record number (MRN).' },
  { re: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Looks like a Social Security number.' },
  { re: /\bDOB\s*[:#]?\s*(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)?\d{2}\b/i, reason: 'Date of birth detected.' },
  { re: /\b(patient|pt)\s*(named|name)\s+([A-Z][a-z]+)/i, reason: 'Possible patient name reference.' },
  { re: /\bpatient\s+[A-Z]\b/i, reason: '“Patient X” pattern — avoid identifiable vignettes.' },
  { re: /\bRoom\s*204\b/i, reason: 'Specific room number called out — high re-identification risk.' },
];

const MEDIUM_RULES: Array<{ re: RegExp; reason: string }> = [
  { re: /\bRoom\s*\d{2,4}\b/i, reason: 'Specific room number — could identify a patient.' },
  { re: /\b(Unit|Floor)\s*[A-Z]?\d{1,2}\b/i, reason: 'Unit/floor combo can narrow location.' },
  { re: /\bbed\s*\d{1,3}\b/i, reason: 'Specific bed number.' },
  { re: /\b\d{3}[\.\-\s]\d{3}[\.\-\s]\d{4}\b/, reason: 'Possible phone number.' },
  { re: /\b(diagnosed with|admitted for|came in for)\b.*\b(today|this morning|tonight|last night)\b/i, reason: 'Diagnosis + recent timeframe combo.' },
];

const LOW_RULES: Array<{ re: RegExp; reason: string }> = [
  { re: /\b(my patient|the patient|this patient)\b/i, reason: 'Talking about a specific patient — make sure no detail identifies them.' },
  { re: /\b(family|husband|wife|son|daughter|mom|dad)\s+(was|came|said|asked|cried)/i, reason: 'Patient family detail mentioned.' },
];

export function scanForPhi(...inputs: Array<string | null | undefined>): PhiFinding[] {
  const text = inputs.filter(Boolean).join(' \n ').trim();
  if (!text) return [];
  const findings: PhiFinding[] = [];

  for (const { re, reason } of HIGH_RULES) {
    const m = text.match(re);
    if (m) findings.push({ severity: 'high', reason, match: m[0] });
  }
  for (const { re, reason } of MEDIUM_RULES) {
    const m = text.match(re);
    if (m && !findings.some((f) => f.match === m[0])) {
      findings.push({ severity: 'medium', reason, match: m[0] });
    }
  }
  for (const { re, reason } of LOW_RULES) {
    const m = text.match(re);
    if (m && !findings.some((f) => f.match === m[0])) {
      findings.push({ severity: 'low', reason, match: m[0] });
    }
  }

  return findings;
}

export function highestSeverity(findings: PhiFinding[]): PhiSeverity | null {
  if (findings.some((f) => f.severity === 'high')) return 'high';
  if (findings.some((f) => f.severity === 'medium')) return 'medium';
  if (findings.some((f) => f.severity === 'low')) return 'low';
  return null;
}

/**
 * Visual-element heuristics. Without on-device vision we can't actually
 * detect badges/whiteboards in a video — but we can at least encourage the
 * creator to think about it.
 */
export const VISUAL_PHI_REMINDERS: string[] = [
  'Cover monitors, charts, and whiteboards.',
  'Blur or remove patient names from badges and labels.',
  'Avoid filming through doorways into patient rooms.',
  'Double-check headline, on-video text, caption, and hashtags — the privacy banner scans those before you post.',
];
