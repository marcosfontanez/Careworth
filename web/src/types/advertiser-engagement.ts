/** Serializable payload for admin Insights → Engagement (advertiser / brand planner view). */

export type AdvertiserDailyPoint = {
  date: string;
  /** Total analytics events recorded */
  events: number;
  /** Distinct user_ids with ≥1 event (sample-limited) */
  estReachUsers: number;
  newPosts: number;
  newComments: number;
  newLikes: number;
  newShares: number;
  /** Rows in saved_posts (bookmarks) */
  newBookmarks: number;
  newProfiles: number;
};

export type AdvertiserNamedCount = { name: string; count: number };

export type AdvertiserTopPost = {
  id: string;
  captionPreview: string;
  type: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  score: number;
  creatorName: string;
  createdAt: string;
};

export type AdvertiserCampaignRollup = {
  campaignsTracked: number;
  totalImpressions: number;
  totalClicks: number;
  overallCtrPct: string;
  byStatus: { status: string; count: number }[];
};

/** First half vs second half of the analytics window (e.g. days 1–15 vs 16–30). */
export type AdvertiserPeriodComparison = {
  priorLabel: string;
  currentLabel: string;
  rows: { label: string; current: number; prior: number; changePct: string }[];
};

export type AdvertiserCampaignLeaderboardRow = {
  title: string;
  advertiserName: string;
  impressions: number;
  clicks: number;
  ctrPct: string;
  status: string;
};

export type AdvertiserContentHealth = {
  engagementPerPost: string;
  commentToLikeRatio: string;
  shareOfEngagementPct: string;
};

export type AdvertiserEngagementPayload = {
  windowDays: number;
  generatedAt: string;
  /** Sampling caps applied (for footnotes) */
  caps: { analyticsRows: number; postsSample: number; profilesGeoSample: number };
  kpis: { label: string; value: string; hint?: string }[];
  daily: AdvertiserDailyPoint[];
  topEventNames: AdvertiserNamedCount[];
  topScreens: AdvertiserNamedCount[];
  hourOfDayUtc: { hour: number; events: number }[];
  topPosts: AdvertiserTopPost[];
  topStates: AdvertiserNamedCount[];
  topSpecialties: AdvertiserNamedCount[];
  circlesInventory: { name: string; members: number; posts: number }[];
  campaignRollup: AdvertiserCampaignRollup;
  /** Content type mix (post.type) in window */
  postTypes: AdvertiserNamedCount[];
  periodComparison: AdvertiserPeriodComparison;
  campaignLeaderboard: AdvertiserCampaignLeaderboardRow[];
  contentHealth: AdvertiserContentHealth;
};
