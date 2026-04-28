import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { SubscriptionPlan, SubscriptionTier } from '@/types';

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    tier: 'free',
    name: 'PulseVerse Free',
    price: 0,
    interval: 'month',
    features: [
      'Unlimited feed browsing',
      'Create posts & videos',
      'Join communities',
      'Basic job search',
    ],
  },
  {
    id: 'pro_monthly',
    tier: 'pro_monthly',
    name: 'PulseVerse Pro',
    price: 9.99,
    interval: 'month',
    revenueCatProductId: 'pulseverse_pro_monthly',
    features: [
      'Everything in Free',
      'Ad-free feed experience',
      'Advanced analytics dashboard',
      'Priority job applications',
      'Custom profile themes',
      'Exclusive Pro badge',
      'Early access to features',
      'Extended video uploads (10 min)',
    ],
  },
  {
    id: 'pro_yearly',
    tier: 'pro_yearly',
    name: 'PulseVerse Pro (Annual)',
    price: 79.99,
    interval: 'year',
    revenueCatProductId: 'pulseverse_pro_yearly',
    features: [
      'Everything in Pro Monthly',
      'Save 33% vs monthly',
      'Lifetime supporter badge',
      'Priority customer support',
    ],
  },
];

interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  expiresAt: string | null;
  isActive: boolean;
  revenueCatCustomerId?: string;
}

export const subscriptionService = {
  getPlans(): SubscriptionPlan[] {
    if (!isFeatureEnabled('pulseversePro')) return [];
    return PLANS;
  },

  async getUserSubscription(userId: string): Promise<UserSubscription> {
    if (!isFeatureEnabled('pulseversePro')) {
      return { userId, tier: 'free', expiresAt: null, isActive: true };
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return { userId, tier: 'free', expiresAt: null, isActive: true };
      }

      const isActive = data.expires_at
        ? new Date(data.expires_at) > new Date()
        : data.tier !== 'free';

      return {
        userId,
        tier: data.tier,
        expiresAt: data.expires_at,
        isActive,
        revenueCatCustomerId: data.revenuecat_customer_id,
      };
    } catch {
      return { userId, tier: 'free', expiresAt: null, isActive: true };
    }
  },

  isPro(tier: SubscriptionTier): boolean {
    return tier === 'pro_monthly' || tier === 'pro_yearly';
  },

  async activateSubscription(
    userId: string,
    tier: SubscriptionTier,
    revenueCatCustomerId?: string,
  ): Promise<boolean> {
    if (!isFeatureEnabled('pulseversePro')) return false;

    const expiresAt = new Date();
    if (tier === 'pro_monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (tier === 'pro_yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          tier,
          expires_at: tier === 'free' ? null : expiresAt.toISOString(),
          revenuecat_customer_id: revenueCatCustomerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      return !error;
    } catch {
      return false;
    }
  },

  async cancelSubscription(userId: string): Promise<boolean> {
    if (!isFeatureEnabled('pulseversePro')) return false;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ tier: 'free', expires_at: null, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return !error;
    } catch {
      return false;
    }
  },

  // Admin: get all active subscribers
  async getActiveSubscribers(): Promise<UserSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .neq('tier', 'free')
        .order('updated_at', { ascending: false });

      if (error) return [];

      return (data ?? []).map((row: any) => ({
        userId: row.user_id,
        tier: row.tier,
        expiresAt: row.expires_at,
        isActive: row.expires_at ? new Date(row.expires_at) > new Date() : true,
        revenueCatCustomerId: row.revenuecat_customer_id,
      }));
    } catch {
      return [];
    }
  },
};
