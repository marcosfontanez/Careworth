import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/featureFlags';
import type { JobListingPricing, JobListingTier } from '@/types';

export const JOB_PRICING_TIERS: JobListingPricing[] = [
  {
    tier: 'basic',
    name: 'Basic Listing',
    price: 0,
    durationDays: 30,
    features: [
      'Standard job listing',
      'Appears in search results',
      'Basic analytics',
    ],
  },
  {
    tier: 'standard',
    name: 'Standard Listing',
    price: 99,
    durationDays: 30,
    features: [
      'Everything in Basic',
      'Highlighted in search results',
      'Role-targeted distribution',
      'Applicant tracking',
      'Email notifications',
    ],
    badge: 'Standard',
  },
  {
    tier: 'premium',
    name: 'Premium Listing',
    price: 249,
    durationDays: 60,
    features: [
      'Everything in Standard',
      'Top placement in search',
      'Push notification to matching users',
      'Social media promotion',
      'Detailed applicant analytics',
      'Unlimited applicants',
    ],
    badge: 'Premium',
  },
  {
    tier: 'featured',
    name: 'Featured Listing',
    price: 499,
    durationDays: 90,
    features: [
      'Everything in Premium',
      'Featured badge on listing',
      'Homepage spotlight',
      'Feed ad integration',
      'Dedicated account manager',
      'Priority support',
      'Custom branded page',
    ],
    maxApplicants: undefined,
    badge: 'Featured',
  },
];

interface JobPosting {
  id: string;
  jobId: string;
  employerId: string;
  tier: JobListingTier;
  paidAmount: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'paused';
}

export const jobPricingService = {
  getTiers(): JobListingPricing[] {
    if (!isFeatureEnabled('jobPricingTiers')) return [];
    return JOB_PRICING_TIERS;
  },

  getTierByName(tier: JobListingTier): JobListingPricing | undefined {
    return JOB_PRICING_TIERS.find((t) => t.tier === tier);
  },

  async createPaidListing(
    jobId: string,
    employerId: string,
    tier: JobListingTier,
  ): Promise<boolean> {
    if (!isFeatureEnabled('jobPricingTiers')) return false;

    const pricingTier = this.getTierByName(tier);
    if (!pricingTier) return false;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pricingTier.durationDays);

    try {
      const { error } = await supabase
        .from('job_postings')
        .insert({
          job_id: jobId,
          employer_id: employerId,
          tier,
          paid_amount: pricingTier.price,
          expires_at: expiresAt.toISOString(),
          status: 'active',
        });

      if (error) return false;

      if (tier === 'featured' || tier === 'premium') {
        await supabase
          .from('jobs')
          .update({ is_featured: true })
          .eq('id', jobId);
      }

      return true;
    } catch {
      return false;
    }
  },

  async getEmployerPostings(employerId: string): Promise<JobPosting[]> {
    if (!isFeatureEnabled('jobPricingTiers')) return [];

    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data ?? []).map((row: any) => ({
        id: row.id,
        jobId: row.job_id,
        employerId: row.employer_id,
        tier: row.tier,
        paidAmount: row.paid_amount,
        expiresAt: row.expires_at,
        status: row.status,
      }));
    } catch {
      return [];
    }
  },

  async getRevenueStats(): Promise<{ totalRevenue: number; activeListings: number; byTier: Record<string, number> }> {
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('tier, paid_amount, status');

      if (error || !data) {
        return { totalRevenue: 0, activeListings: 0, byTier: {} };
      }

      const totalRevenue = data.reduce((sum: number, r: any) => sum + (r.paid_amount ?? 0), 0);
      const activeListings = data.filter((r: any) => r.status === 'active').length;
      const byTier: Record<string, number> = {};
      for (const row of data) {
        byTier[row.tier] = (byTier[row.tier] ?? 0) + (row.paid_amount ?? 0);
      }

      return { totalRevenue, activeListings, byTier };
    } catch {
      return { totalRevenue: 0, activeListings: 0, byTier: {} };
    }
  },
};
