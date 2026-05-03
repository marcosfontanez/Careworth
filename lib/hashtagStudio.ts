/**
 * AI-flavored hashtag suggestions powered by a local healthcare lexicon plus
 * lightweight keyword extraction. Returns a ranked set with mock "trend" scores
 * so the UI feels alive even before we wire a real trend service.
 *
 * When the trends RPC ships, swap `mockTrendScore` for a server-side fetch.
 */

const HEALTHCARE_LEXICON: Record<string, string[]> = {
  // word -> related tags
  shift:     ['NurseLife', 'NightShift', 'DayShift', 'ShiftLife'],
  night:     ['NightShift', 'NocturnalNurse', '12HourShift'],
  day:       ['DayShift', 'NurseLife'],
  weekend:   ['WeekendShift', 'OnCall'],
  icu:       ['ICU', 'CriticalCare', 'ICUNurse'],
  er:        ['ER', 'EmergencyRoom', 'TraumaNurse'],
  ed:        ['ED', 'EmergencyDept', 'TraumaNurse'],
  or:        ['OR', 'Surgery', 'PerioperativeNurse'],
  peds:      ['PediatricNurse', 'PedsLife', 'NICU'],
  nicu:      ['NICU', 'NeonatalNurse'],
  ob:        ['OBNurse', 'L&D', 'LaborAndDelivery'],
  hospice:   ['HospiceNurse', 'PalliativeCare'],
  ortho:     ['OrthoNurse', 'OrthopedicNursing'],
  oncology:  ['OncologyNurse', 'CancerCare'],
  cardiac:   ['CardiacNurse', 'CVICU'],
  med:       ['MedSurg', 'MedicalSurgical'],
  surg:      ['MedSurg'],
  newgrad:   ['NewGradNurse', 'NurseStudent'],
  student:   ['NursingStudent', 'NCLEX'],
  nclex:     ['NCLEX', 'NursingStudent'],
  patient:   ['PatientCare', 'BedsideNursing'],
  code:      ['CodeBlue', 'CriticalCare'],
  travel:    ['TravelNurse', 'TravelNurseLife'],
  agency:    ['AgencyNurse'],
  clinic:    ['ClinicLife', 'AmbulatoryCare'],
  scrubs:    ['ScrubsLife', 'NurseFashion'],
  shoes:     ['NurseShoes', 'ScrubsLife'],
  coffee:    ['ShiftFuel', 'NurseCoffee'],
  vibes:     ['NurseVibes', 'SelfCare'],
  selfcare:  ['SelfCare', 'NurseBurnout'],
  burnout:   ['NurseBurnout', 'MentalHealth'],
  funny:     ['NurseHumor', 'NurseLife'],
  storytime: ['Storytime', 'NurseStorytime'],
  pov:       ['POV', 'NurseLife'],
  grwm:      ['GRWM', 'GRWMShift'],
  tips:      ['NurseTips', 'NewGradTips'],
  hack:      ['NurseHack', 'NurseTips'],
};

const ALWAYS_INCLUDE = ['NurseLife'];

export interface HashtagSuggestion {
  tag: string;
  trendScore: number;   // 0-100
  source: 'lexicon' | 'always' | 'caption';
}

export function suggestHashtags(input: {
  caption?: string;
  shortTitle?: string;
  overlay?: string;
  shift?: string | null;
  specialty?: string | null;
  existing?: string;
  limit?: number;
}): HashtagSuggestion[] {
  const limit = input.limit ?? 8;
  const text = [input.caption, input.shortTitle, input.overlay, input.shift, input.specialty]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const words = new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
  const taken = new Set(parseExisting(input.existing).map((t) => t.toLowerCase()));
  const out: HashtagSuggestion[] = [];

  const push = (tag: string, source: HashtagSuggestion['source']) => {
    const k = tag.toLowerCase();
    if (taken.has(k)) return;
    if (out.some((o) => o.tag.toLowerCase() === k)) return;
    out.push({ tag, trendScore: mockTrendScore(tag), source });
  };

  for (const [word, tags] of Object.entries(HEALTHCARE_LEXICON)) {
    if (words.has(word)) tags.forEach((t) => push(t, 'lexicon'));
  }
  ALWAYS_INCLUDE.forEach((t) => push(t, 'always'));
  for (const w of words) {
    if (w.length > 4 && /^[a-z]+$/.test(w)) push(capitalize(w), 'caption');
  }

  return out.sort((a, b) => b.trendScore - a.trendScore).slice(0, limit);
}

export function parseExisting(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.startsWith('#') && t.length > 1)
    .map((t) => t.slice(1));
}

export function appendHashtag(existing: string, tag: string): string {
  const tokens = parseExisting(existing);
  const has = tokens.some((t) => t.toLowerCase() === tag.toLowerCase());
  if (has) return existing;
  const next = [...tokens, tag].map((t) => `#${t}`).join(' ');
  return next;
}

export function removeHashtag(existing: string, tag: string): string {
  const tokens = parseExisting(existing).filter((t) => t.toLowerCase() !== tag.toLowerCase());
  return tokens.map((t) => `#${t}`).join(' ');
}

function mockTrendScore(tag: string): number {
  // Stable pseudo-trend so the same tag always renders with the same dot.
  let h = 0;
  for (let i = 0; i < tag.length; i += 1) h = (h * 31 + tag.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 60) + 35); // 35-95
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
