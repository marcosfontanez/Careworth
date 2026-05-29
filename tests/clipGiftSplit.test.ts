import { describe, expect, it } from 'vitest';

import {
  computeClipGiftSplitAmounts,
  DEFAULT_CLIP_GIFT_SPLIT_CONFIG,
  parseClipGiftSplitConfig,
  resolveClipGiftLineage,
} from '@/lib/clipGiftSplit';
import type { Post } from '@/types';

const basePost: Pick<
  Post,
  'id' | 'creatorId' | 'sourcePostId' | 'sourceCreatorId' | 'sourceLiveStreamId'
> = {
  id: 'clip-1',
  creatorId: 'publisher-1',
  sourcePostId: 'source-1',
  sourceCreatorId: 'original-1',
  sourceLiveStreamId: undefined,
};

describe('resolveClipGiftLineage', () => {
  it('detects non-clip posts', () => {
    const lineage = resolveClipGiftLineage({
      id: 'p1',
      creatorId: 'c1',
      sourcePostId: undefined,
      sourceCreatorId: undefined,
      sourceLiveStreamId: undefined,
    });
    expect(lineage.isClip).toBe(false);
  });

  it('resolves source creator from post fields', () => {
    const lineage = resolveClipGiftLineage(basePost);
    expect(lineage.isClip).toBe(true);
    expect(lineage.originalCreatorId).toBe('original-1');
    expect(lineage.isOwnClip).toBe(false);
  });

  it('marks own clip when publisher is original creator', () => {
    const lineage = resolveClipGiftLineage({
      ...basePost,
      creatorId: 'original-1',
      sourceCreatorId: 'original-1',
    });
    expect(lineage.isOwnClip).toBe(true);
  });

  it('supports Live-origin clip lineage', () => {
    const lineage = resolveClipGiftLineage({
      ...basePost,
      sourceLiveStreamId: 'live-1',
    });
    expect(lineage.sourceLiveStreamId).toBe('live-1');
    expect(lineage.isClip).toBe(true);
  });

  it('falls back to source post creator when source_creator_id missing', () => {
    const lineage = resolveClipGiftLineage(
      { ...basePost, sourceCreatorId: undefined },
      'original-from-source',
    );
    expect(lineage.originalCreatorId).toBe('original-from-source');
  });

  it('handles unavailable original creator', () => {
    const lineage = resolveClipGiftLineage({
      ...basePost,
      sourceCreatorId: undefined,
    });
    expect(lineage.originalCreatorId).toBeUndefined();
  });
});

describe('computeClipGiftSplitAmounts', () => {
  const config = DEFAULT_CLIP_GIFT_SPLIT_CONFIG;

  it('gives all diamonds to publisher on normal post', () => {
    const result = computeClipGiftSplitAmounts(45, config, {
      isClip: false,
      isOwnClip: false,
      originalCreatorId: undefined,
    });
    expect(result.publisherDiamonds).toBe(45);
    expect(result.originalCreatorDiamonds).toBe(0);
  });

  it('splits someone else clip 70/30 in track_only mode', () => {
    const result = computeClipGiftSplitAmounts(45, config, {
      isClip: true,
      isOwnClip: false,
      originalCreatorId: 'original-1',
    });
    expect(result.publisherDiamonds).toBe(31);
    expect(result.originalCreatorDiamonds).toBe(13);
    expect(result.splitStatus).toBe('tracked');
  });

  it('attributes all to publisher on own clip', () => {
    const result = computeClipGiftSplitAmounts(45, config, {
      isClip: true,
      isOwnClip: true,
      originalCreatorId: 'publisher-1',
    });
    expect(result.publisherDiamonds).toBe(45);
    expect(result.originalCreatorDiamonds).toBe(0);
    expect(result.splitStatus).toBe('skipped_own_clip');
  });

  it('handles deleted source with no original creator', () => {
    const result = computeClipGiftSplitAmounts(45, config, {
      isClip: true,
      isOwnClip: false,
      originalCreatorId: undefined,
    });
    expect(result.publisherDiamonds).toBe(45);
    expect(result.originalCreatorDiamonds).toBe(0);
    expect(result.splitStatus).toBe('skipped_no_original');
  });

  it('uses pending_payout when split_diamonds mode enabled', () => {
    const result = computeClipGiftSplitAmounts(
      100,
      { ...config, payoutMode: 'split_diamonds' },
      { isClip: true, isOwnClip: false, originalCreatorId: 'original-1' },
    );
    expect(result.splitStatus).toBe('pending_payout');
    expect(result.publisherDiamonds).toBe(70);
    expect(result.originalCreatorDiamonds).toBe(30);
  });
});

describe('parseClipGiftSplitConfig', () => {
  it('parses economy_settings shape', () => {
    expect(
      parseClipGiftSplitConfig({
        publisher_bps: 6000,
        original_creator_bps: 4000,
        payout_mode: 'split_diamonds',
      }),
    ).toEqual({
      publisherBps: 6000,
      originalCreatorBps: 4000,
      payoutMode: 'split_diamonds',
    });
  });

  it('falls back to defaults', () => {
    expect(parseClipGiftSplitConfig(null)).toEqual(DEFAULT_CLIP_GIFT_SPLIT_CONFIG);
  });
});
