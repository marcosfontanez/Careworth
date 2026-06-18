import { describe, expect, it } from 'vitest';
import {
  filterThreadsByFlair,
  flairLabelForKind,
  flairLabelForThread,
  getComposerFlairOptions,
  resolveThreadCreateFlair,
  resolveThreadFlairUpdate,
  safetyNoteForKind,
  safetyNoteForFlairTag,
  visibleFlairOptionsForThreads,
} from '@/lib/circleFlairs';
import {
  resolveCircleRules,
  resolveWelcomeCopy,
  CONFESSIONS_WELCOME_COPY,
  DEFAULT_WELCOME_COPY,
} from '@/lib/circleIdentity';
import { getWeeklyCirclePrompt } from '@/lib/circleWeeklyPrompts';
import type { CircleFlairTag, CircleThreadKind } from '@/types';

describe('circleFlairs', () => {
  const threads = [
    { id: '1', kind: 'question' as CircleThreadKind, replyCount: 0 },
    { id: '2', kind: 'meme' as CircleThreadKind, replyCount: 3 },
    { id: '3', kind: 'advice' as CircleThreadKind, replyCount: 0, flairTag: 'caregiver_support' as CircleFlairTag },
  ];

  it('filters unanswered threads', () => {
    const out = filterThreadsByFlair(threads, 'unanswered');
    expect(out.map((t) => t.id)).toEqual(['1', '3']);
  });

  it('filters by expanded flair tag', () => {
    expect(filterThreadsByFlair(threads, 'caregiver_support')).toHaveLength(1);
    expect(filterThreadsByFlair(threads, 'humor')).toHaveLength(1);
  });

  it('shows chips only for kinds/tags with content', () => {
    const opts = visibleFlairOptionsForThreads(threads);
    expect(opts.some((o) => o.id === 'all')).toBe(true);
    expect(opts.some((o) => o.id === 'humor')).toBe(true);
    expect(opts.some((o) => o.id === 'caregiver_support')).toBe(true);
    expect(opts.some((o) => o.id === 'story')).toBe(false);
  });

  it('exposes education safety copy for advice flairs', () => {
    expect(safetyNoteForKind('advice')).toContain('medical advice');
    expect(flairLabelForKind('meme')).toBe('Humor');
    expect(flairLabelForThread({ kind: 'advice', flairTag: 'mythbuster' })).toBe('Mythbuster');
  });
});

describe('circleIdentity', () => {
  it('uses confessions welcome copy by default', () => {
    expect(resolveWelcomeCopy('confessions')).toBe(CONFESSIONS_WELCOME_COPY);
    expect(resolveWelcomeCopy('nurses')).toBe(DEFAULT_WELCOME_COPY);
  });

  it('adds medical disclaimer for education circles', () => {
    const rules = resolveCircleRules('simple-medical-questions', ['education'], undefined);
    expect(rules.some((r) => r.includes('medical advice'))).toBe(true);
  });
});

describe('circleWeeklyPrompts', () => {
  it('returns a stable prompt for a slug', () => {
    const a = getWeeklyCirclePrompt('memes');
    const b = getWeeklyCirclePrompt('memes');
    expect(a.title.length).toBeGreaterThan(5);
    expect(a.id).toBe(b.id);
  });

  it('prefers metadata override', () => {
    const p = getWeeklyCirclePrompt('nurses', undefined, {
      title: 'Custom title',
      body: 'Custom body',
      cta: 'Go',
    });
    expect(p.title).toBe('Custom title');
    expect(p.id).toBe('community-override');
  });
});

describe('composer flair helpers', () => {
  it('resolves kind from flair tag', () => {
    expect(resolveThreadCreateFlair({ postType: 'thread', flairTag: 'humor' })).toEqual({
      kind: 'meme',
      flairTag: 'humor',
    });
  });

  it('falls back to post type when no flair', () => {
    expect(resolveThreadCreateFlair({ postType: 'question', flairTag: null }).kind).toBe('question');
    expect(resolveThreadCreateFlair({ postType: 'thread', flairTag: null }).kind).toBe('story');
  });

  it('prioritizes student flairs for student-nurses slug', () => {
    const opts = getComposerFlairOptions('student-nurses');
    expect(opts[0]?.flairTag).toBe('question');
    expect(opts.some((o) => o.flairTag === 'student_help')).toBe(true);
  });

  it('exposes safety copy for education flairs', () => {
    expect(safetyNoteForFlairTag('education')).toContain('medical advice');
    expect(safetyNoteForFlairTag('caregiver_support')).toContain('professional care');
  });

  it('keeps kind when clearing flair on edit', () => {
    expect(resolveThreadFlairUpdate(null, 'meme')).toEqual({ flairTag: null, kind: 'meme' });
  });

  it('updates kind when setting flair on edit', () => {
    expect(resolveThreadFlairUpdate('question', 'story')).toEqual({
      flairTag: 'question',
      kind: 'question',
    });
  });
});
