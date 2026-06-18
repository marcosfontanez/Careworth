import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeCircleWeeklyPromptForRoom } from '@/lib/circleWeeklyPrompts';

const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('circleWeeklyPromptsService.getCurrent', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
  });

  it('maps an RPC row to the UI prompt shape with promptId', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'prompt-1',
          week_start_date: '2026-06-09',
          prompt_title: 'Pet chaos check-in',
          prompt_body: 'Share a clip of your pet being extra today.',
          prompt_cta: 'Post your pet',
          prompt_style: 'funny',
          generation_source: 'ai',
        },
      ],
      error: null,
    });

    const { circleWeeklyPromptsService } = await import('@/services/supabase/circleWeeklyPrompts');
    const row = await circleWeeklyPromptsService.getCurrent('petverse');

    expect(rpcMock).toHaveBeenCalledWith('get_current_circle_weekly_prompt', {
      p_circle_slug: 'petverse',
    });
    expect(row).toEqual({
      id: 'prompt-1',
      promptId: 'prompt-1',
      title: 'Pet chaos check-in',
      body: 'Share a clip of your pet being extra today.',
      cta: 'Post your pet',
      weekStartDate: '2026-06-09',
      promptStyle: 'funny',
      source: 'ai',
    });
  });

  it('returns null when RPC returns no row', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { circleWeeklyPromptsService } = await import('@/services/supabase/circleWeeklyPrompts');
    expect(await circleWeeklyPromptsService.getCurrent('petverse')).toBeNull();
  });

  it('returns null on RPC error without throwing', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { circleWeeklyPromptsService } = await import('@/services/supabase/circleWeeklyPrompts');
    await expect(circleWeeklyPromptsService.getCurrent('petverse')).resolves.toBeNull();
  });

  it('returns null for blank slug without calling RPC', async () => {
    const { circleWeeklyPromptsService } = await import('@/services/supabase/circleWeeklyPrompts');
    expect(await circleWeeklyPromptsService.getCurrent('   ')).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('mergeCircleWeeklyPromptForRoom', () => {
  it('prefers DB prompt and sets weeklyPromptId', () => {
    const merged = mergeCircleWeeklyPromptForRoom({
      dbPrompt: {
        id: 'db-1',
        promptId: 'db-1',
        title: 'DB title',
        body: 'DB body',
        cta: 'DB cta',
      },
      slug: 'petverse',
      metadataOverride: {
        title: 'Override title',
        body: 'Override body',
        cta: 'Override cta',
      },
    });

    expect(merged.weeklyPromptId).toBe('db-1');
    expect(merged.prompt.title).toBe('DB title');
    expect(merged.prompt.body).toBe('DB body');
  });

  it('uses metadata/static fallback without promptId when DB prompt is missing', () => {
    const merged = mergeCircleWeeklyPromptForRoom({
      dbPrompt: null,
      slug: 'petverse',
      metadataOverride: {
        title: 'Override title',
        body: 'Override body',
        cta: 'Override cta',
      },
    });

    expect(merged.weeklyPromptId).toBeNull();
    expect(merged.prompt.title).toBe('Override title');
    expect(merged.prompt.id).toBe('community-override');
  });

  it('uses static fallback without promptId when DB and metadata are absent', () => {
    const merged = mergeCircleWeeklyPromptForRoom({
      dbPrompt: null,
      slug: 'unknown-circle-slug',
    });

    expect(merged.weeklyPromptId).toBeNull();
    expect(merged.prompt.title.length).toBeGreaterThan(0);
    expect(merged.prompt.id).not.toBe('community-override');
  });
});
