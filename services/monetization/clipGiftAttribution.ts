import { supabase } from '@/lib/supabase';

export type ClipGiftEarningsSnapshot = {
  asClipPublisher: { giftCount: number; diamondsAttributed: number };
  asOriginalCreator: { giftCount: number; diamondsAttributed: number };
};

/** Creator rollup for clip gift attribution (MVP — no UI yet). */
export async function fetchClipGiftEarningsSnapshot(
  creatorId: string,
): Promise<ClipGiftEarningsSnapshot | null> {
  const { data, error } = await supabase.rpc('get_clip_gift_earnings_snapshot', {
    p_creator_id: creatorId,
  });

  if (error || !data || typeof data !== 'object') return null;

  const raw = data as Record<string, unknown>;
  const pub = (raw.as_clip_publisher ?? {}) as Record<string, unknown>;
  const orig = (raw.as_original_creator ?? {}) as Record<string, unknown>;

  return {
    asClipPublisher: {
      giftCount: Number(pub.gift_count ?? 0),
      diamondsAttributed: Number(pub.diamonds_attributed ?? 0),
    },
    asOriginalCreator: {
      giftCount: Number(orig.gift_count ?? 0),
      diamondsAttributed: Number(orig.diamonds_attributed ?? 0),
    },
  };
}
