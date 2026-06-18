import { supabase } from '@/lib/supabase';
import type { CircleWeeklyPrompt } from '@/lib/circleWeeklyPrompts';

/**
 * DB-backed weekly prompt for a Circle. Extends the local UI shape with the
 * persisted prompt id (so posts created from the card can be attributed) and a
 * couple of provenance fields for analytics/debugging.
 */
export interface CircleWeeklyPromptRecord extends CircleWeeklyPrompt {
  /** circle_weekly_prompts.id — passed to the composer + saved on the post. */
  promptId: string;
  weekStartDate: string;
  promptStyle: string | null;
  source: 'ai' | 'fallback' | string;
}

interface WeeklyPromptRow {
  id: string;
  week_start_date: string;
  prompt_title: string;
  prompt_body: string;
  prompt_cta: string | null;
  prompt_style: string | null;
  generation_source: string | null;
}

/**
 * Polished local fallback used when no DB prompt exists yet (or loading fails).
 * Mirrors Part 11 of the spec. Has no promptId so the composer won't attribute
 * a post to a non-existent prompt row.
 */
export const CIRCLE_WEEKLY_PROMPT_FALLBACK: CircleWeeklyPrompt = {
  id: 'weekly-fallback',
  title: 'Start the week',
  body: 'Share a post, story, photo, or video that gets this Circle talking.',
  cta: 'Be the first to start the conversation.',
};

export const circleWeeklyPromptsService = {
  /**
   * Returns the current week's active prompt for a Circle, falling back to the
   * most recent active prompt. Returns null when the Circle has no DB prompt at
   * all (caller substitutes a local fallback). Never throws to the caller's
   * render path — read errors resolve to null.
   */
  async getCurrent(circleSlug: string): Promise<CircleWeeklyPromptRecord | null> {
    const slug = (circleSlug ?? '').trim().toLowerCase();
    if (!slug) return null;

    // Cast the RPC name: lib/database.types.ts is regenerated separately
    // (npm run db:types) after migration 274 adds this function.
    const { data, error } = await supabase.rpc(
      'get_current_circle_weekly_prompt' as never,
      { p_circle_slug: slug } as never,
    );

    if (error) {
      if (__DEV__) console.warn('[circleWeeklyPrompts] getCurrent failed', error.message);
      return null;
    }

    const row = (Array.isArray(data) ? data[0] : data) as WeeklyPromptRow | undefined;
    if (!row?.id || !row.prompt_title || !row.prompt_body) return null;

    return {
      id: row.id,
      promptId: row.id,
      title: row.prompt_title,
      body: row.prompt_body,
      cta: row.prompt_cta?.trim() || 'Start a thread',
      weekStartDate: row.week_start_date,
      promptStyle: row.prompt_style ?? null,
      source: row.generation_source ?? 'ai',
    };
  },
};
