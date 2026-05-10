import { supabase } from '@/lib/supabase';
import type { PulseAvatarFrame } from '@/types';
import { mapPulseAvatarFrameEmbed } from '@/lib/pulseAvatarFrameMap';

export type ClaimBetaBorderResult = {
  ok: boolean;
  newlyGranted: boolean;
  frame: PulseAvatarFrame | null;
  reason?: string;
};

export type EarnedPulseAvatarFrame = {
  frame: PulseAvatarFrame;
  leaderboardRank: number;
  grantedAt: string;
};

/** One in-flight claim per JS runtime — avoids duplicate RPC + wrong `newly_granted` under React 18 Strict Mode remounts. */
let betaBorderClaimPromise: Promise<ClaimBetaBorderResult> | null = null;

export const pulseAvatarFramesService = {
  /**
   * Loads unlock rows and catalog separately. Nested `pulse_avatar_frames(...)`
   * embeds often come back null from PostgREST even when the FK exists, which
   * used to drop every row and show an empty border list despite valid unlocks.
   */
  async listEarned(userId: string): Promise<EarnedPulseAvatarFrame[]> {
    if (!userId) return [];
    const { data: unlocks, error: unlockErr } = await supabase
      .from('user_pulse_avatar_frames')
      .select('frame_id, leaderboard_rank, granted_at')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false });

    if (unlockErr || !unlocks?.length) {
      if (__DEV__ && unlockErr) console.warn('[listEarned pulse unlocks]', unlockErr.message);
      return [];
    }

    const frameIds = [...new Set(unlocks.map((u: { frame_id: string }) => u.frame_id).filter(Boolean))];
    if (!frameIds.length) return [];

    const { data: catalog, error: catErr } = await supabase
      .from('pulse_avatar_frames')
      .select(
        'id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption',
      )
      .in('id', frameIds);

    if (catErr || !catalog?.length) {
      if (__DEV__ && catErr) console.warn('[listEarned pulse catalog]', catErr.message);
      return [];
    }

    const byId = new Map<string, PulseAvatarFrame>();
    for (const row of catalog as Record<string, unknown>[]) {
      const mapped = mapPulseAvatarFrameEmbed(row);
      if (mapped) byId.set(mapped.id, mapped);
    }

    const out: EarnedPulseAvatarFrame[] = [];
    for (const row of unlocks as any[]) {
      const frame = byId.get(String(row.frame_id));
      if (!frame) continue;
      out.push({
        frame,
        leaderboardRank: Number(row.leaderboard_rank) || 0,
        grantedAt: String(row.granted_at ?? ''),
      });
    }
    return out;
  },

  async setSelected(frameId: string | null): Promise<void> {
    const { error } = await (supabase.rpc as any)('set_selected_pulse_avatar_frame', {
      p_frame_id: frameId,
    });
    if (error) throw error;
  },

  /** Idempotent server grant for the bundled beta-tester border (migration 105). */
  async claimBetaTesterBorder(): Promise<ClaimBetaBorderResult> {
    if (betaBorderClaimPromise) return betaBorderClaimPromise;

    betaBorderClaimPromise = (async (): Promise<ClaimBetaBorderResult> => {
      try {
        const rpc = supabase.rpc('claim_pulse_beta_border');
        const { data, error } = await Promise.race([
          rpc,
          new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(
              () => resolve({ data: null, error: { message: 'claim_pulse_beta_border_timeout' } }),
              18_000,
            ),
          ),
        ]);
        if (error) {
          if (__DEV__) console.warn('[claimBetaTesterBorder]', error.message);
          return { ok: false, newlyGranted: false, frame: null, reason: error.message };
        }
        const row = data as {
          ok?: boolean;
          newly_granted?: boolean;
          reason?: string;
          frame?: unknown;
          frame_id?: string;
        } | null;
        if (!row?.ok) {
          return {
            ok: false,
            newlyGranted: false,
            frame: null,
            reason: typeof row?.reason === 'string' ? row.reason : 'claim_failed',
          };
        }
        let frame = mapPulseAvatarFrameEmbed(row.frame) ?? null;
        const fid = row.frame_id != null && String(row.frame_id).trim() ? String(row.frame_id) : '';
        if (!frame && fid) {
          const { data: cat, error: catErr } = await supabase
            .from('pulse_avatar_frames')
            .select(
              'id, slug, label, subtitle, prize_tier, rarity_tier, acquisition_tag, month_start, ring_color, glow_color, ring_caption',
            )
            .eq('id', fid)
            .maybeSingle();
          if (!catErr && cat) frame = mapPulseAvatarFrameEmbed(cat) ?? null;
        }
        return {
          ok: true,
          newlyGranted: row.newly_granted === true,
          frame,
        };
      } finally {
        betaBorderClaimPromise = null;
      }
    })();

    return betaBorderClaimPromise;
  },
};
