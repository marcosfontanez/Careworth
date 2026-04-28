import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { AdCampaign, Post, SponsorInfo } from '@/types';

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

export const adsService = {
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

  async getSponsoredPostForFeed(
    viewerRole?: string,
    viewerSpecialty?: string,
    viewerState?: string,
  ): Promise<Post | null> {
    if (!isFeatureEnabled('sponsoredPosts')) return null;

    const campaigns = await this.getActiveCampaigns();
    if (campaigns.length === 0) return null;

    const matched = campaigns.find((c) => {
      if (c.budgetSpent >= c.budgetTotal) return false;
      const roleMatch = c.targetRoles.length === 0 || (viewerRole && c.targetRoles.includes(viewerRole as any));
      const specMatch = c.targetSpecialties.length === 0 || (viewerSpecialty && c.targetSpecialties.includes(viewerSpecialty as any));
      const stateMatch = c.targetStates.length === 0 || (viewerState && c.targetStates.includes(viewerState));
      return roleMatch && specMatch && stateMatch;
    }) ?? campaigns[0];

    if (!matched) return null;

    const sponsorInfo: SponsorInfo = {
      advertiserName: matched.advertiserName,
      advertiserLogo: matched.advertiserLogo,
      ctaLabel: matched.ctaLabel,
      ctaUrl: matched.ctaUrl,
      campaignId: matched.id,
    };

    return {
      id: `sponsored-${matched.id}`,
      creatorId: 'system',
      creator: {
        id: 'system',
        displayName: matched.advertiserName,
        avatarUrl: matched.advertiserLogo ?? '',
        role: 'RN',
        specialty: 'General',
        city: '',
        state: '',
        isVerified: true,
      },
      type: matched.mediaUrl?.includes('.mp4') ? 'video' : 'image',
      caption: matched.description,
      mediaUrl: matched.mediaUrl,
      hashtags: [],
      communities: [],
      isAnonymous: false,
      privacyMode: 'public',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      viewCount: matched.impressions,
      saveCount: 0,
      createdAt: matched.startDate,
      rankingScore: 0,
      feedTypeEligible: ['forYou'],
      roleContext: 'RN',
      specialtyContext: 'General',
      locationContext: '',
      isSponsored: true,
      sponsorInfo,
    };
  },

  async trackImpression(campaignId: string): Promise<void> {
    if (!isFeatureEnabled('sponsoredPosts')) return;

    try {
      await supabase.rpc('increment_ad_impression', { campaign_id: campaignId });
    } catch {}
  },

  async trackClick(campaignId: string): Promise<void> {
    if (!isFeatureEnabled('sponsoredPosts')) return;

    try {
      await supabase.rpc('increment_ad_click', { campaign_id: campaignId });
    } catch {}
  },

  // Admin methods
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
};
