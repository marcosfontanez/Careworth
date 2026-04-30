import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { CreatorTip, CreatorEarnings, TipAmount } from '@/types';

export const TIP_OPTIONS: { amount: TipAmount; label: string; emoji: string }[] = [
  { amount: 1, label: '$1', emoji: '☕' },
  { amount: 5, label: '$5', emoji: '🌟' },
  { amount: 10, label: '$10', emoji: '💎' },
  { amount: 25, label: '$25', emoji: '🏆' },
  { amount: 50, label: '$50', emoji: '🔥' },
  { amount: 100, label: '$100', emoji: '👑' },
];

export const creatorTipsService = {
  getTipOptions(): typeof TIP_OPTIONS {
    if (!isFeatureEnabled('creatorTips')) return [];
    return TIP_OPTIONS;
  },

  async sendTip(
    fromUserId: string,
    toCreatorId: string,
    amount: TipAmount,
    message?: string,
    postId?: string,
  ): Promise<boolean> {
    if (!isFeatureEnabled('creatorTips')) return false;

    try {
      const { error } = await supabase
        .from('creator_tips')
        .insert({
          from_user_id: fromUserId,
          to_creator_id: toCreatorId,
          amount,
          message: message ?? null,
          post_id: postId ?? null,
        });

      if (error) return false;

      await supabase.rpc('increment_creator_earnings', {
        creator_id: toCreatorId,
        tip_amount: amount,
      });

      return true;
    } catch {
      return false;
    }
  },

  async getCreatorEarnings(creatorId: string): Promise<CreatorEarnings> {
    if (!isFeatureEnabled('creatorTips')) {
      return {
        creatorId,
        totalTips: 0,
        totalViews: 0,
        totalLikes: 0,
        monthlyEarnings: 0,
        lifetimeEarnings: 0,
        pendingPayout: 0,
      };
    }

    try {
      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (error || !data) {
        return {
          creatorId,
          totalTips: 0,
          totalViews: 0,
          totalLikes: 0,
          monthlyEarnings: 0,
          lifetimeEarnings: 0,
          pendingPayout: 0,
        };
      }

      return {
        creatorId,
        totalTips: data.total_tips ?? 0,
        totalViews: data.total_views ?? 0,
        totalLikes: data.total_likes ?? 0,
        monthlyEarnings: data.monthly_earnings ?? 0,
        lifetimeEarnings: data.lifetime_earnings ?? 0,
        pendingPayout: data.pending_payout ?? 0,
        lastPayoutAt: data.last_payout_at ?? undefined,
      };
    } catch {
      return {
        creatorId,
        totalTips: 0,
        totalViews: 0,
        totalLikes: 0,
        monthlyEarnings: 0,
        lifetimeEarnings: 0,
        pendingPayout: 0,
      };
    }
  },

  async getRecentTips(creatorId: string, limit = 20): Promise<CreatorTip[]> {
    if (!isFeatureEnabled('creatorTips')) return [];

    try {
      const { data, error } = await supabase
        .from('creator_tips')
        .select('*')
        .eq('to_creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return [];

      return (data ?? []).map((row: any) => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toCreatorId: row.to_creator_id,
        amount: row.amount,
        message: row.message,
        postId: row.post_id,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async requestPayout(creatorId: string): Promise<boolean> {
    if (!isFeatureEnabled('creatorTips')) return false;

    try {
      const { error } = await supabase
        .from('payout_requests')
        .insert({
          creator_id: creatorId,
          status: 'pending',
        });

      return !error;
    } catch {
      return false;
    }
  },

  // Admin: total platform tips revenue
  async getPlatformTipStats(): Promise<{ totalTips: number; totalAmount: number; uniqueTippers: number }> {
    try {
      const { data, error } = await supabase
        .from('creator_tips')
        .select('amount, from_user_id');

      if (error || !data) {
        return { totalTips: 0, totalAmount: 0, uniqueTippers: 0 };
      }

      const totalAmount = data.reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
      const uniqueTippers = new Set(data.map((r: any) => r.from_user_id)).size;

      return { totalTips: data.length, totalAmount, uniqueTippers };
    } catch {
      return { totalTips: 0, totalAmount: 0, uniqueTippers: 0 };
    }
  },
};
