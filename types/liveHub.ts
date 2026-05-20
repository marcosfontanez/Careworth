import type { LiveStream, StreamCategory } from '@/types';

/** Primary modes surfaced in discovery + viewer routing. */
export type LiveModeType = 'casual' | 'irl' | 'gaming' | 'learn' | 'shop';

/** Discovery horizontal chips on the Live hub. */
export type LiveHubCategoryTab =
  | 'for-you'
  | 'following'
  | 'casual'
  | 'gaming'
  | 'irl'
  | 'learn'
  | 'shop';

export type LiveDisclosureType = 'affiliate' | 'sponsored' | null;

/**
 * Rich stream row for discovery + demo viewer — extends persisted {@link LiveStream}
 * with commerce / mode metadata (mock-friendly until `live_streams` grows columns).
 */
export type LiveHubStream = LiveStream & {
  liveType: LiveModeType;
  /** editorial / hero placement */
  isFeatured?: boolean;
  promoTag?: string;
  gameTitle?: string;
  hasProducts?: boolean;
  pinnedProductId?: string | null;
  products?: LiveProduct[];
  disclosureType?: LiveDisclosureType;
  sellerVerified?: boolean;
  flashDealEndsAt?: string | null;
};

export interface LiveProduct {
  id: string;
  title: string;
  image: string;
  price: string;
  originalPrice?: string;
  liveDealPrice?: string;
  sellerName: string;
  isPinned?: boolean;
  isApproved?: boolean;
  stock?: number;
  checkoutUrl?: string;
}

export interface LiveComment {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  avatar?: string;
  message: string;
  timestamp: string;
  isHost?: boolean;
  isModerator?: boolean;
}

export interface LiveSessionQuestion {
  id: string;
  streamId: string;
  userName: string;
  question: string;
  upvotes: number;
  answered: boolean;
}

export interface LiveScheduledEvent {
  id: string;
  hostName: string;
  hostTitle?: string;
  title: string;
  startsAt: string;
  category: LiveModeType | 'panel';
  circleLabel?: string;
  /** mock RSVP */
  rsvpState?: 'none' | 'going' | 'reminder';
}

export interface LiveHubHomePayload {
  tab: LiveHubCategoryTab;
  featured: LiveHubStream[];
  trending: LiveHubStream[];
  shopLiveDeals: LiveHubStream[];
  upcoming: LiveScheduledEvent[];
  circleLives: LiveHubStream[];
  /** Streams backing “Following” empty states etc. */
  allFiltered: LiveHubStream[];
}

export interface LiveSetupState {
  selectedMode: LiveModeType | null;
  title: string;
  description: string;
  tags: string[];
  giftsEnabled: boolean;
  scheduled: boolean;
  scheduleAt?: Date | null;
  learnTopic: string;
  learnQna: boolean;
  learnPolls: boolean;
  learnResourcesNote: string;
  sellProductIds: string[];
  pinnedProductId: string | null;
  liveDealEnabled: boolean;
  giveawayEnabled: boolean;
  disclosuresAccepted: boolean;
}

/** Maps DB category → hub mode (best-effort until stream rows store `live_type`). */
export function inferLiveModeType(category: StreamCategory): LiveModeType {
  switch (category) {
    case 'study-session':
    case 'clinical-skills':
      return 'learn';
    case 'day-in-the-life':
      return 'irl';
    case 'q-and-a':
    case 'career-advice':
      return 'learn';
    default:
      return 'casual';
  }
}

/**
 * Persisted on `live_streams.tags` by {@link GoLiveWizard} so hub/viewer filters stay accurate
 * when category alone is ambiguous (e.g. gaming vs casual both mapping to `chill`).
 */
export const PV_LIVE_MODE_TAG_PREFIX = 'pvLiveMode:' as const;

export function parseLiveModeFromTags(tags: string[]): LiveModeType | null {
  const raw = tags.find((t) => t.startsWith(PV_LIVE_MODE_TAG_PREFIX));
  if (!raw) return null;
  const rest = raw.slice(PV_LIVE_MODE_TAG_PREFIX.length);
  if (
    rest === 'casual' ||
    rest === 'irl' ||
    rest === 'gaming' ||
    rest === 'learn' ||
    rest === 'shop'
  ) {
    return rest;
  }
  return null;
}

export function liveStreamToHub(stream: LiveStream, overrides?: Partial<LiveHubStream>): LiveHubStream {
  return {
    ...stream,
    isFeatured: false,
    hasProducts: false,
    pinnedProductId: null,
    products: undefined,
    disclosureType: null,
    sellerVerified: false,
    ...overrides,
    liveType:
      overrides?.liveType ??
      parseLiveModeFromTags(stream.tags) ??
      inferLiveModeType(stream.category),
  };
}
