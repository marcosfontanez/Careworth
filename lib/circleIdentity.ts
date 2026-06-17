/** Circle identity metadata stored on `communities.metadata` — mirrors web `circles/identity.ts`. */

export type CircleIdentityMetadata = {
  welcomeCopy?: string;
  rules?: string[];
  weeklyPrompt?: {
    title: string;
    body: string;
    cta: string;
  };
  welcomeThreadId?: string;
};

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
