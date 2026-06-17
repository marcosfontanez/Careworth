import type { CircleAccent } from '@/lib/circleAccents';

export type CircleWeeklyPrompt = {
  id: string;
  title: string;
  body: string;
  cta: string;
};

const DEFAULT_PROMPTS: CircleWeeklyPrompt[] = [
  {
    id: 'misunderstood-role',
    title: 'What’s one thing people misunderstand about your role?',
    body: 'Share a quick story or myth you hear on shift — help others learn what you actually do.',
    cta: 'Answer this week’s prompt',
  },
  {
    id: 'afraid-to-ask',
    title: 'What question are you afraid to ask?',
    body: 'No judgment — ask it here so someone in your Circle can help.',
    cta: 'Start a thread',
  },
  {
    id: 'shift-survival',
    title: 'What’s your best shift survival tip?',
    body: 'Hydration hacks, handoff rituals, mental reset — what actually works for you?',
    cta: 'Share your tip',
  },
  {
    id: 'caregiver-week',
    title: 'What should caregivers know this week?',
    body: 'General education only — no patient details. Lift each other up.',
    cta: 'Post your take',
  },
];

const SLUG_PROMPTS: Record<string, CircleWeeklyPrompt[]> = {
  confessions: [
    {
      id: 'confession-prompt',
      title: 'What’s weighing on you this week?',
      body: 'Share anonymously — your name stays hidden from other members.',
      cta: 'Share a confession',
    },
  ],
  'funny-medical-memes': [
    {
      id: 'meme-prompt',
      title: 'Best meme you saw on shift this week?',
      body: 'Keep it kind — healthcare humor that lands with your crew.',
      cta: 'Post a meme',
    },
  ],
  memes: [
    {
      id: 'meme-prompt',
      title: 'Best meme you saw on shift this week?',
      body: 'Keep it kind — healthcare humor that lands with your crew.',
      cta: 'Post a meme',
    },
  ],
};

function weekIndex(): number {
  const start = new Date(new Date().getFullYear(), 0, 1).getTime();
  return Math.floor((Date.now() - start) / (7 * 24 * 60 * 60 * 1000));
}

/** Deterministic weekly prompt — metadata override wins when set. */
export function getWeeklyCirclePrompt(
  slug: string,
  accent?: Pick<CircleAccent, 'composerPrompt' | 'vibe'>,
  metadataOverride?: Pick<CircleWeeklyPrompt, 'title' | 'body' | 'cta'>,
): CircleWeeklyPrompt {
  if (metadataOverride?.title && metadataOverride.body) {
    return {
      id: 'community-override',
      title: metadataOverride.title,
      body: metadataOverride.body,
      cta: metadataOverride.cta?.trim() || 'Start a thread',
    };
  }
  const key = slug.trim().toLowerCase();
  const pool = SLUG_PROMPTS[key] ?? DEFAULT_PROMPTS;
  const idx = weekIndex() % pool.length;
  const picked = pool[idx] ?? DEFAULT_PROMPTS[0]!;
  if (accent?.composerPrompt && picked.id.startsWith('misunderstood')) {
    return {
      ...picked,
      body: accent.composerPrompt,
    };
  }
  return picked;
}
