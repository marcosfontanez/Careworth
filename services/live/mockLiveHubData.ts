import type { CreatorSummary, LiveStream, StreamCategory } from '@/types';
import type {
  LiveComment,
  LiveHubStream,
  LiveModeType,
  LiveProduct,
  LiveScheduledEvent,
  LiveSessionQuestion,
} from '@/types/liveHub';

const THUMB = {
  ward: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&q=80',
  hallway: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=80',
  gaming: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900&q=80',
  lecture: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&q=80',
  skincare: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&q=80',
  scrubs: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=80',
  serum: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=80',
  erCircle: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=900&q=80',
} as const;

const avatar = (n: number) => `https://i.pravatar.cc/200?img=${n}`;

function host(p: {
  id: string;
  name: string;
  img: number;
  verified?: boolean;
  role?: CreatorSummary['role'];
  specialty?: CreatorSummary['specialty'];
}): CreatorSummary {
  return {
    id: p.id,
    displayName: p.name,
    username: p.name.toLowerCase().replace(/\s+/g, ''),
    firstName: p.name.split(' ')[0],
    lastName: p.name.split(' ').slice(1).join(' ') || '',
    avatarUrl: avatar(p.img),
    role: p.role ?? 'RN',
    specialty: p.specialty ?? 'Med Surg',
    city: 'Phoenix',
    state: 'AZ',
    isVerified: !!p.verified,
  };
}

function baseStream(p: {
  id: string;
  title: string;
  description: string;
  category: StreamCategory;
  thumb: string;
  viewers: number;
  tags: string[];
  h: CreatorSummary;
  liveType: LiveModeType;
  extra?: Partial<LiveHubStream>;
}): LiveHubStream {
  const following = Boolean((p.extra as LiveHubStream | undefined)?.isFollowingHost);
  const core: LiveStream = {
    id: p.id,
    hostId: p.h.id,
    host: p.h,
    title: p.title,
    description: p.description,
    category: p.category,
    thumbnailUrl: p.thumb,
    status: 'live',
    viewerCount: p.viewers,
    peakViewerCount: Math.round(p.viewers * 1.12),
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    broadcastStartedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    hostLastSeenAt: new Date().toISOString(),
    tags: p.tags,
    isFollowingHost: following,
    communityName: p.extra?.communityName,
    communityId: p.extra?.communityId,
  };
  return {
    ...core,
    liveType: p.liveType,
    isFeatured: p.extra?.isFeatured ?? false,
    promoTag: p.extra?.promoTag,
    gameTitle: p.extra?.gameTitle,
    hasProducts: p.extra?.hasProducts ?? false,
    pinnedProductId: p.extra?.pinnedProductId ?? null,
    products: p.extra?.products,
    disclosureType: p.extra?.disclosureType ?? null,
    sellerVerified: p.extra?.sellerVerified ?? false,
    flashDealEndsAt: p.extra?.flashDealEndsAt ?? null,
  };
}

export const DEMO_PRODUCT_HYDRA: LiveProduct = {
  id: 'demo-prod-hydraglow',
  title: 'HydraGlow Serum',
  image: THUMB.serum,
  price: '$39.99',
  originalPrice: '$52.00',
  liveDealPrice: '$39.99',
  sellerName: 'PulseVerse Approved Seller',
  isPinned: true,
  isApproved: true,
  stock: 120,
};

export const DEMO_PRODUCT_SCRUB_SET: LiveProduct = {
  id: 'demo-prod-scrub-set',
  title: 'PulseFlex Scrub Set — Navy',
  image: THUMB.scrubs,
  price: '$48.00',
  sellerName: 'Circle Scrubs Co.',
  isApproved: true,
  stock: 40,
};

export const DEMO_PRODUCT_BADGE_REEL: LiveProduct = {
  id: 'demo-prod-badge-reel',
  title: 'Antimicrobial Badge Reel Duo',
  image: THUMB.ward,
  price: '$14.50',
  sellerName: 'Shift Essentials',
  isApproved: true,
  stock: 200,
};

/** Curated demo streams for hub + `demo-live-*` viewer. */
export const DEMO_LIVE_STREAMS: LiveHubStream[] = [
  baseStream({
    id: 'demo-live-casual-wellness',
    title: 'Post-shift reset — questions open',
    description: 'Wind down, ask anything clinical or life.',
    category: 'chill',
    thumb: THUMB.skincare,
    viewers: 842,
    tags: ['wellness', 'chat'],
    h: host({ id: 'demo-host-sophie', name: 'Sophie Nguyen, RN', img: 45, verified: true }),
    liveType: 'casual',
    extra: { isFeatured: true },
  }),
  baseStream({
    id: 'demo-live-irl-hospital',
    title: 'Unit walkthrough — slow Sunday',
    description: 'Quiet halls, real charting breaks.',
    category: 'day-in-the-life',
    thumb: THUMB.hallway,
    viewers: 1204,
    tags: ['IRL', 'day-in-the-life'],
    h: host({ id: 'demo-host-jordan', name: 'Jordan Lee, RN', img: 33 }),
    liveType: 'irl',
    extra: { isFeatured: true },
  }),
  baseStream({
    id: 'demo-live-gaming-ranked',
    title: 'Night Shift Ranked Grind',
    description: 'Healthcare creator unwinds — respectful chat only.',
    category: 'chill',
    thumb: THUMB.gaming,
    viewers: 2310,
    tags: ['gaming', 'community'],
    h: host({ id: 'demo-host-pulsegamer', name: 'PulseGamer', img: 14, verified: true }),
    liveType: 'gaming',
    extra: { gameTitle: 'Rogue Squadron Elite', isFeatured: true },
  }),
  baseStream({
    id: 'demo-live-learn-communication',
    title: 'Three Habits That Improve Clinical Communication',
    description: 'Structured micro-class + live Q&A.',
    category: 'clinical-skills',
    thumb: THUMB.lecture,
    viewers: 1623,
    tags: ['learn', 'communication'],
    h: host({ id: 'demo-host-prof-alex', name: 'Prof. Alex Chen', img: 12, verified: true }),
    liveType: 'learn',
    extra: { isFeatured: true },
  }),
  baseStream({
    id: 'demo-live-shop-maya',
    title: 'Derm picks for 12h shifts',
    description: 'Trusted skincare routine — transparent pricing.',
    category: 'career-advice',
    thumb: THUMB.serum,
    viewers: 623,
    tags: ['shop', 'skincare'],
    h: host({ id: 'demo-host-dr-maya', name: 'Dr. Maya Ortiz', img: 46, verified: true }),
    liveType: 'shop',
    extra: {
      hasProducts: true,
      pinnedProductId: DEMO_PRODUCT_HYDRA.id,
      products: [DEMO_PRODUCT_HYDRA, DEMO_PRODUCT_BADGE_REEL],
      disclosureType: 'affiliate',
      sellerVerified: true,
      promoTag: 'Live Deal',
      flashDealEndsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
  }),
  baseStream({
    id: 'demo-live-shop-scrubs',
    title: 'Scrub drop + badge reels',
    description: 'Community pricing while live.',
    category: 'shift-talk',
    thumb: THUMB.scrubs,
    viewers: 411,
    tags: ['shop', 'scrubs'],
    h: host({ id: 'demo-host-elena', name: 'Elena Marks, RN', img: 47 }),
    liveType: 'shop',
    extra: {
      hasProducts: true,
      pinnedProductId: DEMO_PRODUCT_SCRUB_SET.id,
      products: [DEMO_PRODUCT_SCRUB_SET, DEMO_PRODUCT_BADGE_REEL],
      disclosureType: 'sponsored',
      sellerVerified: true,
      promoTag: 'Shop Live',
    },
  }),
  baseStream({
    id: 'demo-live-friend-shift',
    title: 'Coffee charting — ask me triage tips',
    description: 'Following-only energy (demo).',
    category: 'shift-talk',
    thumb: THUMB.ward,
    viewers: 128,
    tags: ['friends', 'shift-talk'],
    h: host({ id: 'demo-host-river', name: 'River Patel, RN', img: 49 }),
    liveType: 'casual',
    extra: { isFollowingHost: true },
  }),
  baseStream({
    id: 'demo-live-circle-er',
    title: 'Emergency Nursing Circle — Rapid Fire Cases',
    description: 'Hosted circle discussion (preview).',
    category: 'clinical-skills',
    thumb: THUMB.erCircle,
    viewers: 356,
    tags: ['circles', 'ER'],
    h: host({
      id: 'demo-host-circle-mod',
      name: 'ER Circle Host',
      img: 11,
      verified: true,
      specialty: 'Emergency',
    }),
    liveType: 'learn',
    extra: {
      communityId: 'demo-circle-er',
      communityName: 'Emergency Nursing Circle',
    },
  }),
];

export const DEMO_UPCOMING_SESSIONS: LiveScheduledEvent[] = [
  {
    id: 'demo-up-1',
    hostName: 'Alex Chen, MSN',
    hostTitle: 'Critical Care Educator',
    title: 'New Grad ICU Q&A',
    startsAt: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    category: 'learn',
    rsvpState: 'none',
  },
  {
    id: 'demo-up-2',
    hostName: 'Taylor Brooks',
    hostTitle: 'Nurse Career Coach',
    title: 'Resume Review for Nurses',
    startsAt: new Date(Date.now() + 52 * 60 * 60 * 1000).toISOString(),
    category: 'learn',
    rsvpState: 'none',
  },
  {
    id: 'demo-up-3',
    hostName: 'Priya Shah, PA-C',
    title: 'Skin Care for Long Shift Workers',
    startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    category: 'learn',
    rsvpState: 'none',
  },
  {
    id: 'demo-up-4',
    hostName: 'Marcus Webb',
    hostTitle: 'Creator Economy · Healthcare',
    title: 'How to Build a Healthcare Brand',
    startsAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
    category: 'panel',
    rsvpState: 'none',
  },
];

const DEMO_COMMENTS: Record<string, LiveComment[]> = {
  'demo-live-shop-maya': [
    {
      id: 'c1',
      streamId: 'demo-live-shop-maya',
      userId: 'u1',
      userName: 'mira_rn',
      message: 'Does this layer under sunscreen?',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'c2',
      streamId: 'demo-live-shop-maya',
      userId: 'u2',
      userName: 'Sam ICU',
      avatar: avatar(22),
      message: 'Obsessed with the disclosure badge — feels trustworthy.',
      timestamp: new Date().toISOString(),
    },
  ],
  'demo-live-gaming-ranked': [
    {
      id: 'g1',
      streamId: 'demo-live-gaming-ranked',
      userId: 'u3',
      userName: 'night_shift_npc',
      message: 'Rank up before census hits 😅',
      timestamp: new Date().toISOString(),
    },
  ],
};

const DEFAULT_COMMENTS: LiveComment[] = [
  {
    id: 'cd1',
    streamId: '',
    userId: 'sys',
    userName: 'PulseVerse',
    message: 'Welcome — keep it kind and professional.',
    timestamp: new Date().toISOString(),
    isModerator: true,
  },
];

export function getDemoComments(streamId: string): LiveComment[] {
  return DEMO_COMMENTS[streamId] ?? DEFAULT_COMMENTS.map((c) => ({ ...c, streamId }));
}

export const DEMO_LEARN_QUESTIONS: Record<string, LiveSessionQuestion[]> = {
  'demo-live-learn-communication': [
    {
      id: 'q1',
      streamId: 'demo-live-learn-communication',
      userName: 'jay_rn',
      question: 'How do you debrief after a tough family conversation?',
      upvotes: 42,
      answered: false,
    },
    {
      id: 'q2',
      streamId: 'demo-live-learn-communication',
      userName: 'nicu_nova',
      question: 'Best phrase when refusing to gossip at the desk?',
      upvotes: 31,
      answered: true,
    },
  ],
};

export function getDemoQuestions(streamId: string): LiveSessionQuestion[] {
  return DEMO_LEARN_QUESTIONS[streamId] ?? [];
}

export function getDemoProducts(streamId: string): LiveProduct[] {
  const s = DEMO_LIVE_STREAMS.find((x) => x.id === streamId);
  return s?.products ?? [];
}
