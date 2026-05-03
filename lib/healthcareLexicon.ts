/**
 * Healthcare terms for future on-device captions / ASR biasing. Surfaced in the
 * composer as a reference so clinical abbreviations stay recognizable in captions.
 */

export const HEALTHCARE_LEXICON_TERMS: string[] = [
  'BiPAP',
  'CPAP',
  'HFNC',
  'NSAIDs',
  'q4h',
  'q6h',
  'BID',
  'TID',
  'PRN',
  'NPO',
  'STAT',
  'D/C',
  'DNR',
  'POLST',
  'KUB',
  'L&D',
  'NICU',
  'PICU',
  'ICU',
  'ED',
  'OR',
  'PACU',
  'STEMI',
  'AKI',
  'CHF',
  'DKA',
  'HHS',
  'PE',
  'DVT',
  'VTE',
  'ESRD',
  'COPD',
  'ARF',
];

export function lexiconSnippetForCopy(): string {
  return HEALTHCARE_LEXICON_TERMS.join(', ');
}
