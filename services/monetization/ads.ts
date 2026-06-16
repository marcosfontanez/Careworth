import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/featureFlags';
import {
  payloadToSponsorInfo,
  toSafeDeliveryPayload,
  createSessionDeduper,
  type SponsoredPlacementPayload,
} from '@/lib/sponsoredPlacementDelivery';
import type { AdCampaign, Post, SponsorInfo } from '@/types';

const impressionDeduper = createSessionDeduper();

function rowToCampaign(row: any): AdCampaign {
  return {
    id: row.id,
    advertiserName: row.advertiser_name,
    advertiserLogo: row.advertiser_logo,
    title: row.title,
    description: row.description,
    mediaUrl: row.media_url,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    targetRoles: row.target_roles ?? [],
    targetSpecialties: row.target_specialties ?? [],
    targetStates: row.target_states ?? [],
    budgetTotal: row.budget_total,
    budgetSpent: row.budget_spent ?? 0,
    cpmRate: row.cpm_rate,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
  };
}

function isDeliveryEnabled(): boolean {
  return isFeatureEnabled('sponsoredPosts') && isFeatureEnabled('sponsoredPlacementDelivery');
}

function payloadToPost(payload: SponsoredPlacementPayload): Post {
  const sponsorInfo: SponsorInfo = payloadToSponsorInfo(payload);
  const mediaUrl = payload.mediaUrl;
  const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl);

  return {
    id: `sponsored-${payload.campaignId}`,
    creatorId: 'system',
    creator: {
      id: 'system',
      displayName: payload.advertiserName,
      avatarUrl: payload.advertiserLogo ?? '',
      role: '',
      specialty: '',
      city: '',
      state: '',
      isVerified: true,
    },
    type: isVideo ? 'video' : 'image',
    caption: payload.description,
    mediaUrl,
    hashtags: [],
    communities: [],
    isAnonymous: false,
    privacyMode: 'public',
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    viewCount: 0,
    saveCount: 0,
    createdAt: new Date().toISOString(),
    rankingScore: 0,
    feedTypeEligible: ['forYou'],
    roleContext: '',
    specialtyContext: '',
    locationContext: '',
    isSponsored: true,
    sponsorInfo,
  };
}

export const adsService = {
  async fetchEligiblePlacement(args?: {
    surface?: string;
    device?: string;
    slotKey?: string;
  }): Promise<SponsoredPlacementPayload | null> {
    if (!isDeliveryEnabled()) return null;

    const { data, error } = await supabase.rpc('fetch_eligible_sponsored_placement', {
      p_surface: args?.surface ?? 'feed',
      p_device: args?.device ?? 'mobile',
      p_slot_key: args?.slotKey ?? 'in_feed_sponsored',
    });

    if (error || !data || typeof data !== 'object') return null;
    return toSafeDeliveryPayload(data as Record<string, unknown>);
  },

  async getActiveCampaigns(): Promise<AdCampaign[]> {
    if (!isFeatureEnabled('sponsoredPosts')) return [];

    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('cpm_rate', { ascending: false });

    if (error) return [];
    return (data ?? []).map(rowToCampaign);
  },

  /** Booked in-feed placement — requires both delivery flags and eligible campaign/booking. */
  async getSponsoredPostForFeed(): Promise<Post | null> {
    const payload = await this.fetchEligiblePlacement({
      surface: 'feed',
      device: 'mobile',
      slotKey: 'in_feed_sponsored',
    });
    if (!payload) return null;
    return payloadToPost(payload);
  },

  /** Track once per app session per campaign. Requires signed-in session. */
  async trackImpression(campaignId: string): Promise<void> {
    if (!isDeliveryEnabled()) return;
    if (!impressionDeduper.once(campaignId)) return;

    try {
      await supabase.rpc('increment_ad_impression', { campaign_id: campaignId });
    } catch {}
  },

  /** Requires a signed-in Supabase session (RPC is authenticated-only post–migration 180). */
  async trackClick(campaignId: string): Promise<void> {
    if (!isDeliveryEnabled()) return;

    try {
      await supabase.rpc('increment_ad_click', { campaign_id: campaignId });
    } catch {}
  },

  /** Admin methods */
  async getAllCampaigns(): Promise<AdCampaign[]> {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map(rowToCampaign);
  },

  async createCampaign(campaign: Omit<AdCampaign, 'id' | 'impressions' | 'clicks' | 'budgetSpent'>): Promise<AdCampaign | null> {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert({
        advertiser_name: campaign.advertiserName,
        advertiser_logo: campaign.advertiserLogo,
        title: campaign.title,
        description: campaign.description,
        media_url: campaign.mediaUrl,
        cta_label: campaign.ctaLabel,
        cta_url: campaign.ctaUrl,
        target_roles: campaign.targetRoles,
        target_specialties: campaign.targetSpecialties,
        target_states: campaign.targetStates,
        budget_total: campaign.budgetTotal,
        cpm_rate: campaign.cpmRate,
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        status: campaign.status,
      })
      .select()
      .single();

    if (error) return null;
    return rowToCampaign(data);
  },

  async updateCampaignStatus(id: string, status: AdCampaign['status']): Promise<void> {
    await supabase.from('ad_campaigns').update({ status }).eq('id', id);
  },

  /** Test helper — clears session impression dedupe. */
  _resetImpressionSessionForTests() {
    impressionDeduper.reset();
  },
};
