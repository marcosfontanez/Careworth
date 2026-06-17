import type { CircleAccent } from '@/lib/circleAccents';
import { isAnonymousConfessionCircle } from '@/lib/anonymousCircle';

/** Parsed subset of `communities.metadata`. */
export type CircleIdentityMetadata = {
  welcomeCopy?: string;
  rules?: string[];
  weeklyPrompt?: {
    title: string;
    body: string;
    cta: string;
  };
  /** Legacy fallback when no `community_thread_pins` welcome row exists. */
  welcomeThreadId?: string;
};

export type CircleTopHelper = {
  userId: string;
  helpfulCount: number;
  displayName: string;
};

export const DEFAULT_WELCOME_COPY =
  'Welcome to this Circle. Read the vibe, join the conversation, and keep it respectful.';

export const CONFESSIONS_WELCOME_COPY =
  'Welcome. Share anonymously — your name stays hidden from other members. Be kind, stay general, and protect privacy.';

export const MEDICAL_EDUCATION_RULE =
  'General education only. PulseVerse does not replace medical advice, diagnosis, treatment, or emergency care.';

const BASE_RULES = [
  'Be respectful and supportive of fellow healthcare workers',
  'No patient information — protect HIPAA at all times',
  'Stay on topic — keep discussions relevant to this Circle',
  'No spam, self-promotion, or recruiting without approval',
];

const CONFESSIONS_RULES = [
  'Share anonymously — your display name is hidden from other members',
  'Keep details general — no names, dates, or identifying info',
  'Be kind — everyone is carrying something heavy',
  'This is peer support, not clinical care or crisis counseling',
];

const PUBLIC_HEALTH_SLUGS = new Set(['simple-medical-questions']);
const STUDENT_SLUGS = new Set(['student-nurses', 'pre-med', 'medical-students']);

function shouldShowPublicHealthGuardrail(slug: string | undefined): boolean {
  if (!slug) return false;
  return PUBLIC_HEALTH_SLUGS.has(slug.trim().toLowerCase());
}

const CAREGIVER_CATEGORIES = new Set(['caregivers', 'family', 'caregiver']);

export function parseCircleMetadata(raw: unknown): CircleIdentityMetadata {
  if (!raw || typeof raw !== 'object') return {};
  const m = raw as Record<string, unknown>;
  const weeklyRaw = m.weekly_prompt ?? m.weeklyPrompt;
  let weeklyPrompt: CircleIdentityMetadata['weeklyPrompt'];
  if (weeklyRaw && typeof weeklyRaw === 'object') {
    const w = weeklyRaw as Record<string, unknown>;
    const title = typeof w.title === 'string' ? w.title.trim() : '';
    const body = typeof w.body === 'string' ? w.body.trim() : '';
    const cta = typeof w.cta === 'string' ? w.cta.trim() : '';
    if (title && body) {
      weeklyPrompt = { title, body, cta: cta || 'Start a thread' };
    }
  }
  const rulesRaw = m.rules;
  const rules = Array.isArray(rulesRaw)
    ? rulesRaw.map((r) => String(r).trim()).filter(Boolean).slice(0, 8)
    : undefined;
  const welcomeCopy =
    typeof m.welcome_copy === 'string'
      ? m.welcome_copy.trim()
      : typeof m.welcomeCopy === 'string'
        ? m.welcomeCopy.trim()
        : undefined;
  const welcomeThreadId =
    typeof m.welcome_thread_id === 'string'
      ? m.welcome_thread_id.trim()
      : typeof m.welcomeThreadId === 'string'
        ? m.welcomeThreadId.trim()
        : undefined;
  return {
    welcomeCopy: welcomeCopy || undefined,
    rules: rules?.length ? rules : undefined,
    weeklyPrompt,
    welcomeThreadId: welcomeThreadId || undefined,
  };
}

export function getDefaultWelcomeCopy(slug: string | undefined): string {
  if (isAnonymousConfessionCircle(slug)) return CONFESSIONS_WELCOME_COPY;
  return DEFAULT_WELCOME_COPY;
}

export function resolveWelcomeCopy(
  slug: string | undefined,
  metadata?: CircleIdentityMetadata,
): string {
  const custom = metadata?.welcomeCopy?.trim();
  if (custom) return custom;
  return getDefaultWelcomeCopy(slug);
}

function isStudentCircle(slug: string | undefined, categories: string[]): boolean {
  const key = (slug ?? '').trim().toLowerCase();
  if (STUDENT_SLUGS.has(key)) return true;
  return categories.some((c) => /student|pre-med|nursing school/i.test(c));
}

function isCaregiverCircle(slug: string | undefined, categories: string[]): boolean {
  const key = (slug ?? '').trim().toLowerCase();
  if (/caregiver|family/.test(key)) return true;
  return categories.some((c) => CAREGIVER_CATEGORIES.has(c.trim().toLowerCase()));
}

/** 3–5 brief room rules with safe medical disclaimer when appropriate. */
export function resolveCircleRules(
  slug: string | undefined,
  categories: string[],
  metadata?: CircleIdentityMetadata,
  accent?: Pick<CircleAccent, 'etiquette'>,
): string[] {
  if (metadata?.rules?.length) return metadata.rules.slice(0, 5);

  if (isAnonymousConfessionCircle(slug)) return CONFESSIONS_RULES.slice(0, 5);

  const rules = [...BASE_RULES];
  if (accent?.etiquette?.trim()) {
    rules[0] = accent.etiquette.trim();
  }

  const showMedical =
    shouldShowPublicHealthGuardrail(slug) ||
    isStudentCircle(slug, categories) ||
    isCaregiverCircle(slug, categories) ||
    categories.some((c) => /education|clinical|medical|nursing|pharmacy|therapy/i.test(c));

  if (showMedical && !rules.some((r) => r.includes('medical advice'))) {
    rules.push(MEDICAL_EDUCATION_RULE);
  }

  return rules.slice(0, 5);
}

export function resolveWeeklyPromptOverride(
  metadata?: CircleIdentityMetadata,
): CircleIdentityMetadata['weeklyPrompt'] | undefined {
  return metadata?.weeklyPrompt;
}
