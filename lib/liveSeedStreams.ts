import type { LiveStream, CreatorSummary, Role, Specialty, StreamCategory } from '@/types';

/**
 * Curated example `LiveStream` fixtures for design tools or tests only.
 * The main app no longer surfaces these in the Live tab; `seed-*` stream
 * IDs redirect to the Live hub if opened directly.
 */

const minutesAgo = (n: number): string =>
  new Date(Date.now() - n * 60 * 1000).toISOString();

type SeedHost = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  role: Role;
  specialty: Specialty;
  city: string;
  state: string;
  isVerified?: boolean;
};

const host = (h: SeedHost): CreatorSummary => ({
  id: h.id,
  displayName: h.displayName,
  username: h.displayName.toLowerCase().replace(/[^a-z0-9]+/g, ''),
  firstName: h.firstName,
  lastName: h.lastName,
  avatarUrl: h.avatarUrl,
  role: h.role,
  specialty: h.specialty,
  city: h.city,
  state: h.state,
  isVerified: !!h.isVerified,
});

/**
 * Curated, hot-linkable Unsplash photos that visually match each stream's
 * theme (ICU, ER, night shift, pharmacy, etc.). All URLs use the Unsplash
 * image CDN with a `w=` width hint so they download fast on mobile.
 */
const THUMBS = {
  icuRoom: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=900&q=80',
  emergencyER: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=900&q=80',
  nightShift: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80',
  burnoutBreak: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80',
  newGradAMA: 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=900&q=80',
  nurseQA: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=900&q=80',
  mentalHealth: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=900&q=80',
  nutrition: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80',
  pharmacy: 'https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=900&q=80',
  orMoments: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=900&q=80',
  erRealTalk: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=900&q=80',
  pharmacology: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=900&q=80',
  orBehind: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&q=80',
  shiftHumor: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=900&q=80',
  rnStudy: 'https://images.unsplash.com/photo-1606206873764-fd15e242df52?w=900&q=80',
} as const;

const AVATARS = {
  alex: 'https://i.pravatar.cc/300?img=12',
  jenna: 'https://i.pravatar.cc/300?img=47',
  sam: 'https://i.pravatar.cc/300?img=33',
  maria: 'https://i.pravatar.cc/300?img=45',
  dee: 'https://i.pravatar.cc/300?img=49',
  rachel: 'https://i.pravatar.cc/300?img=44',
  priya: 'https://i.pravatar.cc/300?img=48',
  noah: 'https://i.pravatar.cc/300?img=15',
  jordan: 'https://i.pravatar.cc/300?img=11',
  taylor: 'https://i.pravatar.cc/300?img=32',
  kevin: 'https://i.pravatar.cc/300?img=14',
  daniel: 'https://i.pravatar.cc/300?img=13',
  amelia: 'https://i.pravatar.cc/300?img=46',
  liam: 'https://i.pravatar.cc/300?img=8',
  zoey: 'https://i.pravatar.cc/300?img=24',
  marcus: 'https://i.pravatar.cc/300?img=7',
} as const;

type SeedStreamInput = {
  id: string;
  title: string;
  description: string;
  category: StreamCategory;
  thumbnailUrl: string;
  viewerCount: number;
  startedMinAgo: number;
  tags: string[];
  communityName?: string;
  host: SeedHost;
};

const make = (s: SeedStreamInput): LiveStream => ({
  id: s.id,
  hostId: s.host.id,
  host: host(s.host),
  title: s.title,
  description: s.description,
  category: s.category,
  thumbnailUrl: s.thumbnailUrl,
  status: 'live',
  viewerCount: s.viewerCount,
  peakViewerCount: Math.round(s.viewerCount * 1.18),
  startedAt: minutesAgo(s.startedMinAgo),
  tags: s.tags,
  communityName: s.communityName,
  isFollowingHost: false,
});

/** ----------- Featured Live (5 hero streams) ----------- */
const FEATURED: LiveStream[] = [
  make({
    id: 'seed-feat-01',
    title: 'ICU Check-In',
    description: "Inside today's critical moments — what we saw, what we learned, what kept us going.",
    category: 'shift-talk',
    thumbnailUrl: THUMBS.icuRoom,
    viewerCount: 1320,
    startedMinAgo: 42,
    tags: ['ICU', 'critical-care'],
    communityName: 'ICU',
    host: {
      id: 'seed-host-alex',
      displayName: 'Dr. Alex Morgan',
      firstName: 'Alex',
      lastName: 'Morgan',
      avatarUrl: AVATARS.alex,
      role: 'RN',
      specialty: 'ICU',
      city: 'Boston',
      state: 'MA',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-feat-02',
    title: 'Emergency Unfiltered',
    description: 'Real talk from the trauma bay — what triage actually looks like at 2am.',
    category: 'shift-talk',
    thumbnailUrl: THUMBS.emergencyER,
    viewerCount: 982,
    startedMinAgo: 18,
    tags: ['ER', 'trauma'],
    communityName: 'ER',
    host: {
      id: 'seed-host-jenna',
      displayName: 'Jenna Rivera, RN',
      firstName: 'Jenna',
      lastName: 'Rivera',
      avatarUrl: AVATARS.jenna,
      role: 'RN',
      specialty: 'Emergency',
      city: 'Phoenix',
      state: 'AZ',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-feat-03',
    title: 'Night Shift Confessions',
    description: 'The wild, the weird, and the ones we never forget. Shared anonymously.',
    category: 'chill',
    thumbnailUrl: THUMBS.nightShift,
    viewerCount: 814,
    startedMinAgo: 65,
    tags: ['night-shift', 'culture'],
    communityName: 'Night Shift',
    host: {
      id: 'seed-host-sam',
      displayName: 'Sam Patel, RN',
      firstName: 'Sam',
      lastName: 'Patel',
      avatarUrl: AVATARS.sam,
      role: 'RN',
      specialty: 'Med Surg',
      city: 'Chicago',
      state: 'IL',
    },
  }),
  make({
    id: 'seed-feat-04',
    title: 'Burnout to Breakthrough',
    description: 'Coming back from the wall — small habits that actually moved the needle.',
    category: 'career-advice',
    thumbnailUrl: THUMBS.burnoutBreak,
    viewerCount: 706,
    startedMinAgo: 31,
    tags: ['wellness', 'mindset'],
    communityName: 'Wellness',
    host: {
      id: 'seed-host-maria',
      displayName: 'Maria Cole, RN',
      firstName: 'Maria',
      lastName: 'Cole',
      avatarUrl: AVATARS.maria,
      role: 'Charge Nurse',
      specialty: 'Med Surg',
      city: 'Denver',
      state: 'CO',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-feat-05',
    title: 'AMA: New Grad Survival',
    description: 'First-year nurses ask the questions, third-year nurses tell the truth.',
    category: 'q-and-a',
    thumbnailUrl: THUMBS.newGradAMA,
    viewerCount: 588,
    startedMinAgo: 12,
    tags: ['new-grad', 'AMA'],
    communityName: 'Nursing',
    host: {
      id: 'seed-host-dee',
      displayName: 'Dee Thompson, RN',
      firstName: 'Dee',
      lastName: 'Thompson',
      avatarUrl: AVATARS.dee,
      role: 'RN',
      specialty: 'General',
      city: 'Atlanta',
      state: 'GA',
    },
  }),
];

/** ----------- Top Live Now (5–6 medium cards) ----------- */
const TOP_LIVE_NOW: LiveStream[] = [
  make({
    id: 'seed-top-01',
    title: 'Nurse Q&A',
    description: 'Ask Me Anything with a charge nurse',
    category: 'q-and-a',
    thumbnailUrl: THUMBS.nurseQA,
    viewerCount: 842,
    startedMinAgo: 22,
    tags: ['Q&A', 'nursing'],
    communityName: 'Nursing',
    host: {
      id: 'seed-host-rachel',
      displayName: 'Rachel Kim, RN',
      firstName: 'Rachel',
      lastName: 'Kim',
      avatarUrl: AVATARS.rachel,
      role: 'Charge Nurse',
      specialty: 'Med Surg',
      city: 'Seattle',
      state: 'WA',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-top-02',
    title: 'Mental Health Matters',
    description: 'Coping & compassion on the floor',
    category: 'chill',
    thumbnailUrl: THUMBS.mentalHealth,
    viewerCount: 623,
    startedMinAgo: 9,
    tags: ['wellness'],
    communityName: 'Wellness',
    host: {
      id: 'seed-host-priya',
      displayName: 'Priya Shah, LCSW',
      firstName: 'Priya',
      lastName: 'Shah',
      avatarUrl: AVATARS.priya,
      role: 'RN',
      specialty: 'Psych',
      city: 'Austin',
      state: 'TX',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-top-03',
    title: 'Nutrition Tips That Heal',
    description: 'Foods we underrate at the bedside',
    category: 'clinical-skills',
    thumbnailUrl: THUMBS.nutrition,
    viewerCount: 511,
    startedMinAgo: 41,
    tags: ['nutrition'],
    communityName: 'Wellness',
    host: {
      id: 'seed-host-noah',
      displayName: 'Noah Bennett, RD',
      firstName: 'Noah',
      lastName: 'Bennett',
      avatarUrl: AVATARS.noah,
      role: 'RN',
      specialty: 'General',
      city: 'Portland',
      state: 'OR',
    },
  }),
  make({
    id: 'seed-top-04',
    title: 'Pharmacy Talk',
    description: 'Drug interactions worth a second look',
    category: 'clinical-skills',
    thumbnailUrl: THUMBS.pharmacy,
    viewerCount: 487,
    startedMinAgo: 27,
    tags: ['pharmacy'],
    communityName: 'Pharmacy',
    host: {
      id: 'seed-host-jordan',
      displayName: 'Jordan Liu, PharmD',
      firstName: 'Jordan',
      lastName: 'Liu',
      avatarUrl: AVATARS.jordan,
      role: 'RN',
      specialty: 'General',
      city: 'San Diego',
      state: 'CA',
    },
  }),
  make({
    id: 'seed-top-05',
    title: 'OR Moments',
    description: 'Tiny wins from today\u2019s cases',
    category: 'day-in-the-life',
    thumbnailUrl: THUMBS.orMoments,
    viewerCount: 412,
    startedMinAgo: 14,
    tags: ['OR', 'surgery'],
    communityName: 'Operating Room',
    host: {
      id: 'seed-host-taylor',
      displayName: 'Taylor M., RN',
      firstName: 'Taylor',
      lastName: 'M.',
      avatarUrl: AVATARS.taylor,
      role: 'RN',
      specialty: 'Operating Room',
      city: 'Houston',
      state: 'TX',
      isVerified: true,
    },
  }),
];

/** ----------- Rising Lives (5–6 compact cards) ----------- */
const RISING_LIVES: LiveStream[] = [
  make({
    id: 'seed-rise-01',
    title: 'ER Real Talk',
    description: 'Night shift stories nobody warned us about',
    category: 'shift-talk',
    thumbnailUrl: THUMBS.erRealTalk,
    viewerCount: 342,
    startedMinAgo: 7,
    tags: ['ER'],
    communityName: 'ER',
    host: {
      id: 'seed-host-amelia',
      displayName: 'Amelia R., RN',
      firstName: 'Amelia',
      lastName: 'R.',
      avatarUrl: AVATARS.amelia,
      role: 'RN',
      specialty: 'Emergency',
      city: 'Miami',
      state: 'FL',
    },
  }),
  make({
    id: 'seed-rise-02',
    title: 'Pharmacology Made Simple',
    description: 'Mechanisms in plain English',
    category: 'study-session',
    thumbnailUrl: THUMBS.pharmacology,
    viewerCount: 276,
    startedMinAgo: 11,
    tags: ['study'],
    communityName: 'Pharmacy',
    host: {
      id: 'seed-host-kevin',
      displayName: 'Dr. Kevin Lin',
      firstName: 'Kevin',
      lastName: 'Lin',
      avatarUrl: AVATARS.kevin,
      role: 'RN',
      specialty: 'General',
      city: 'San Francisco',
      state: 'CA',
      isVerified: true,
    },
  }),
  make({
    id: 'seed-rise-03',
    title: 'OR Behind the Scenes',
    description: 'How the team really preps for a long case',
    category: 'day-in-the-life',
    thumbnailUrl: THUMBS.orBehind,
    viewerCount: 215,
    startedMinAgo: 19,
    tags: ['OR'],
    communityName: 'Operating Room',
    host: {
      id: 'seed-host-daniel',
      displayName: 'Daniel O., RN',
      firstName: 'Daniel',
      lastName: 'O.',
      avatarUrl: AVATARS.daniel,
      role: 'RN',
      specialty: 'Operating Room',
      city: 'Cleveland',
      state: 'OH',
    },
  }),
  make({
    id: 'seed-rise-04',
    title: 'Shift Humor Live',
    description: 'Funniest things we heard this week',
    category: 'chill',
    thumbnailUrl: THUMBS.shiftHumor,
    viewerCount: 188,
    startedMinAgo: 4,
    tags: ['humor'],
    communityName: 'Funny Medical Memes',
    host: {
      id: 'seed-host-zoey',
      displayName: 'Zoey K., RN',
      firstName: 'Zoey',
      lastName: 'K.',
      avatarUrl: AVATARS.zoey,
      role: 'RN',
      specialty: 'General',
      city: 'Brooklyn',
      state: 'NY',
    },
  }),
  make({
    id: 'seed-rise-05',
    title: 'RN Study Circle',
    description: 'NCLEX prep — chat through tough qs',
    category: 'study-session',
    thumbnailUrl: THUMBS.rnStudy,
    viewerCount: 152,
    startedMinAgo: 33,
    tags: ['NCLEX', 'study'],
    communityName: 'Nursing',
    host: {
      id: 'seed-host-marcus',
      displayName: 'Marcus B., Student RN',
      firstName: 'Marcus',
      lastName: 'B.',
      avatarUrl: AVATARS.marcus,
      role: 'Student Nurse',
      specialty: 'General',
      city: 'Nashville',
      state: 'TN',
    },
  }),
];

/**
 * Combined ordered list (Featured + Top Live Now + Rising). The Live screen
 * sorts by viewerCount and slices into sections, so individual ordering here
 * doesn't matter — but viewer counts are tuned to land each stream in its
 * intended section after sort.
 */
export const LIVE_SEED_STREAMS: LiveStream[] = [
  ...FEATURED,
  ...TOP_LIVE_NOW,
  ...RISING_LIVES,
];

/** True when a given stream came from the seed fallback (id starts with `seed-`). */
export const isSeedStream = (stream: { id: string }): boolean =>
  stream.id.startsWith('seed-');
