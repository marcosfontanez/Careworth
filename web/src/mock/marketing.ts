/** Public marketing copy — separate from admin mock data. */

export const homeProductOverview = {
  eyebrow: "Product overview",
  title: "Built for healthcare life — not another corporate graph.",
  description:
    "PulseVerse stitches together the surfaces clinicians actually use after the pager stops: discovery, specialty rooms, live credibility, and identity that feels human.",
  pillars: [
    {
      title: "Culture-first",
      body: "Humor, grief, education, and night-shift solidarity — moderated with clinical context in mind.",
    },
    {
      title: "Creator-ready",
      body: "Hosts and storytellers get formats people already love — short video, live AMA, threaded Circles.",
    },
    {
      title: "Trust by design",
      body: "Reports, appeals, and live tooling built for a licensed audience — not an anything-goes feed.",
    },
  ],
};

export const homeFeatureSpotlights = [
  {
    tag: "Feed",
    title: "Culture-forward discovery — tuned for who you are in medicine.",
    body: "Short-form video, images, and threads that respect specialty, shift, and credibility — not generic endless scroll.",
    href: "/features/feed",
  },
  {
    tag: "Circles",
    title: "Rooms that feel like your floor — not generic forums.",
    body: "Memes to mentorship, night shift to subspecialty. Threads, reactions, and moderators who speak your abbreviations.",
    href: "/features/circles",
  },
  {
    tag: "Live",
    title: "AMAs and teaching moments with a safety lens.",
    body: "Go live for Q&A, boards prep, or cath lab stories — with incident workflows when chat goes clinical.",
    href: "/features/live",
  },
  {
    tag: "Pulse Page",
    title: "A profile surface beyond the résumé.",
    body: "Pins, remixes, and links that show how you show up in medicine — polished, expressive, yours.",
    href: "/features/pulse-page",
  },
] as const;

export const homePulseDuo = {
  eyebrow: "Pulse Page · My Pulse",
  title: "Public presence + private rhythm.",
  pulsePage:
    "Pulse Page is how the community sees you — clips you’re proud of, pins that matter, and a vibe that matches your practice.",
  myPulse:
    "My Pulse is yours between shifts: saves, revisits, and connections without turning into a second inbox.",
  links: [
    { label: "Pulse Page", href: "/features/pulse-page" },
    { label: "My Pulse", href: "/features/my-pulse" },
  ],
};

export const homeWhyCards = [
  {
    title: "Moderation you can trust",
    body: "Queues, severity, and appeals mapped to how real clinical communities argue and learn.",
  },
  {
    title: "Premium dark-native UX",
    body: "Readable at 2 a.m. on night shift — contrast, hierarchy, and motion that doesn’t shout.",
  },
  {
    title: "Room to grow",
    body: "Feed, Circles, Live, Pulse — one platform that scales toward partners and creators without brittle bolt-ons.",
  },
];

export const homeAudience = {
  title: "Who it’s for",
  description:
    "Clinicians in training and practice, allied health, pharmacy, lab, imaging — anyone building healthcare culture online.",
  roles: [
    "Physicians & APPs",
    "RNs & CNAs / PCTs",
    "Pharmacists",
    "RT & radiology",
    "Lab professionals",
    "Students & new grads",
  ],
};

export const homeTestimonials = [
  {
    quote: "Finally somewhere that feels like our unit chat — but with room to breathe.",
    role: "ICU RN · anonymized beta",
  },
  {
    quote: "Live AMAs hit different when the audience actually speaks the same language.",
    role: "Cards fellow · pilot cohort",
  },
  {
    quote: "We needed culture infrastructure, not another wellness PDF.",
    role: "PharmD · early access",
  },
];

/** Features hub — hero + grid copy (routes under /features). */
export const featuresHubIntro = {
  eyebrow: "Features overview",
  title: "Explore everything PulseVerse can do.",
  description:
    "Feed, Circles, Live, Pulse Page, and My Pulse — one account, one trust model, and surfaces that match how healthcare culture actually moves.",
};

export const featuresHubGrid = [
  {
    href: "/features/feed",
    title: "Feed",
    desc: "Short-form culture tuned for healthcare context — discovery that respects how you work.",
  },
  {
    href: "/features/circles",
    title: "Circles",
    desc: "Specialty and culture rooms that feel alive — threads, reactions, moderators who speak your abbreviations.",
  },
  {
    href: "/features/live",
    title: "Live",
    desc: "AMAs and teaching moments with live moderation built for clinical Q&A.",
  },
  {
    href: "/features/pulse-page",
    title: "Pulse Page",
    desc: "Your public presence beyond a resume — pins, remixes, and expressive layout.",
  },
  {
    href: "/features/my-pulse",
    title: "My Pulse",
    desc: "Private hub for saves, activity, and connections — rhythm between shifts.",
  },
] as const;

export type FeatureSlug = "feed" | "circles" | "live" | "pulse-page" | "my-pulse";

export const featureDetailExtras: Record<
  FeatureSlug,
  { eyebrow: string; steps: { title: string; body: string }[] }
> = {
  feed: {
    eyebrow: "Feed",
    steps: [
      {
        title: "Scroll with context",
        body: "Role, specialty, and shift-aware signals tune what surfaces — without losing serendipity.",
      },
      {
        title: "Create fast",
        body: "Clip, caption, remix — native to short-form workflows clinicians already use off-shift.",
      },
      {
        title: "Stay credible",
        body: "Safety rails for misinformation and PHI-shaped mistakes — paired with human review when needed.",
      },
    ],
  },
  circles: {
    eyebrow: "Circles",
    steps: [
      {
        title: "Pick your room",
        body: "Join culture-first spaces from memes to morbidity & mortality vibes — your call.",
      },
      {
        title: "Thread it out",
        body: "Reactions, replies, and mods who understand healthcare tone and slang.",
      },
      {
        title: "Spotlight growth",
        body: "Featured rooms can be curated without suffocating organic momentum.",
      },
    ],
  },
  live: {
    eyebrow: "Live",
    steps: [
      {
        title: "Go live with purpose",
        body: "AMAs, teaching, ward stories — structured for hosts who educate, not just entertain.",
      },
      {
        title: "Chat that scales",
        body: "Moderation tooling built for fast-moving clinical Q&A and escalation.",
      },
      {
        title: "Review after stream",
        body: "Summaries and flags feed the same trust console as posts and comments.",
      },
    ],
  },
  "pulse-page": {
    eyebrow: "Pulse Page",
    steps: [
      {
        title: "Curate your surface",
        body: "Pins, highlights, and media-forward layout — leaving stiff templates behind.",
      },
      {
        title: "Link with intent",
        body: "Articles, foundations, causes — credibility without corporate chrome.",
      },
      {
        title: "Grow revisits",
        body: "Designed so colleagues come back when they want your lens — not a one-off profile stamp.",
      },
    ],
  },
  "my-pulse": {
    eyebrow: "My Pulse",
    steps: [
      {
        title: "Save what matters",
        body: "Clips, threads, references — organized for recall between long stretches.",
      },
      {
        title: "Track your activity",
        body: "Your private ledger of engagement — with privacy modes respected.",
      },
      {
        title: "Nurture connections",
        body: "People you actually talk shop with — not vanity follower graphs.",
      },
    ],
  },
};

/** Circles marketing landing — featured row + discovery chrome */
export const circlesFeaturedShowcase = [
  { name: "Funny Medical Memes", members: "24.3K", emoji: "😂", tint: "from-amber-400/25 to-yellow-500/10" },
  { name: "Nursing", members: "78.6K", emoji: "🩺", tint: "from-sky-500/25 to-blue-600/10" },
  { name: "ICU", members: "31.2K", emoji: "📟", tint: "from-teal-400/25 to-cyan-600/10" },
  { name: "ER", members: "29.8K", emoji: "🚑", tint: "from-red-500/25 to-rose-600/10" },
  { name: "Pharmacy", members: "18.4K", emoji: "💊", tint: "from-emerald-400/25 to-green-600/10" },
  { name: "Night Shift", members: "22.1K", emoji: "🌙", tint: "from-violet-400/25 to-purple-600/10" },
] as const;

export const circlesTrendingTopics = [
  "Burnout is real",
  "New grad tips",
  "Boards prep threads",
  "Wellness after nights",
  "Scope & ethics chatter",
] as const;

export const circlesDiscoverTags = [
  "Nursing",
  "ICU",
  "ER",
  "Pharmacy",
  "Night shift",
  "Students",
  "Leadership",
  "Cards",
  "Mental health",
  "Med-surg",
  "OR",
  "Radiology",
] as const;

export const circlesWhyBetter = [
  "Verified healthcare professionals",
  "Topic-first rooms — not generic noise",
  "Moderation tuned for clinical context",
  "No ads cluttering your threads",
  "Share back to My Pulse in one tap",
] as const;

/** Live marketing landing */
export const liveFeaturedSessions = [
  { title: "ICU check-in", host: "Dr. Arjun Patel", status: "live" as const, viewers: "1.2K", specialty: "Critical care" },
  {
    title: "New grad residency prep",
    host: "Jordan Lee, RN",
    status: "scheduled" as const,
    viewers: "—",
    specialty: "Education",
  },
  {
    title: "Wellness after 12s",
    host: "Priya Patel",
    status: "live" as const,
    viewers: "640",
    specialty: "Wellness",
  },
] as const;

export const liveTopNow = [
  { rank: 1, title: "Ask a cards attending", host: "Dr. Arjun Patel", viewers: "1.2K" },
  { rank: 2, title: "Night shift debrief", host: "Anonymous RN", viewers: "880" },
  { rank: 3, title: "Pharmacy pearls", host: "Sam Okonkwo", viewers: "410" },
  { rank: 4, title: "Burnout circle drop-in", host: "Maya Chen", viewers: "320" },
  { rank: 5, title: "Med school AMA", host: "Faculty panel", viewers: "290" },
] as const;

export const liveDiscoverCategories = [
  { title: "All live sessions", desc: "Everything broadcasting now" },
  { title: "Specialties", desc: "Cards, neuro, surg, and more" },
  { title: "Wellness", desc: "Sustainability on and off shift" },
  { title: "Patient & caregiver", desc: "Lived experience voices" },
] as const;

export const liveWhyGoLive = [
  { title: "Clinician trust", body: "Labels, verification, and rooms built for licensed audiences." },
  { title: "Interactive Q&A", body: "Upvotes, queues, and moderation that keeps chat respectful." },
  { title: "Credibility", body: "Host tools for citations, disclaimers, and context." },
  { title: "Co-hosts", body: "Bring moderators and guests without friction." },
  { title: "Safety workflows", body: "Live incidents route to trained reviewers." },
  { title: "Replay-ready", body: "Sessions become teaching artifacts for Circles." },
] as const;

export const supportFaqItems = [
  {
    q: "What is PulseVerse?",
    a: "A social platform for healthcare professionals — feed, Circles, Live, and Pulse Page — with moderation built for clinical culture.",
  },
  {
    q: "How do I verify my account?",
    a: "Verification paths vary by region and credential type. Start from Settings → Verification and follow the guided checklist.",
  },
  {
    q: "How do I report content?",
    a: "Use the overflow menu on posts, comments, or profiles. For live streams, flag from the player — live incidents are prioritized.",
  },
  {
    q: "Is PulseVerse HIPAA-ready?",
    a: "PulseVerse is not a system of record for PHI. Do not post identifiable patient information; violations may be removed or escalated.",
  },
] as const;

/** Pulse Page marketing — five capability cards */
export const pulsePageShareWays = [
  { title: "Your premium profile", body: "Headline, role, verification, and following — built for clinicians.", emoji: "👤" },
  { title: "Current vibe", body: "Optional status — study mode, off-shift, or on service.", emoji: "🎵" },
  { title: "My Pulse (5 posts)", body: "A rolling window of your best public posts.", emoji: "📣" },
  { title: "Post types", body: "Thought, clip, link, pics — pick the format that fits.", emoji: "✨" },
  { title: "Media hub", body: "Photos, clips, and collections in one glanceable grid.", emoji: "🖼️" },
] as const;

export const pulsePageShowcase = [
  { title: "Recent videos", kicker: "Teaching · clips", cta: "View all videos" },
  { title: "Favorites", kicker: "Books · threads · resources", cta: "View favorites" },
  { title: "Photos", kicker: "Cases & moments (de-identified)", cta: "View gallery" },
] as const;

export const pulsePageWhyProfessionals = [
  { title: "Build trust", body: "Show how you practice — not just where you trained." },
  { title: "Stay top of mind", body: "A pulse people revisit between shifts." },
  { title: "Own your narrative", body: "Pins, highlights, and order that YOU control." },
  { title: "Grow thoughtfully", body: "Signals for credibility — not vanity spam." },
  { title: "Portable presence", body: "Links, media, and story — export-friendly by design.", },
] as const;

export const pulsePageAudienceSegments = [
  { title: "Healthcare professionals", body: "Physicians, APPs, nurses, and teams on the floor." },
  { title: "Educators & coaches", body: "Program leaders and mentors building the next cohort." },
  { title: "Creators & hosts", body: "Live AMAs, short clips, and threaded explainers." },
  { title: "Founders & operators", body: "Health innovators with a human front door." },
  { title: "Organizations", body: "Programs and societies with a verified home base." },
] as const;

/** My Pulse — personal dashboard marketing */
export const myPulseHighlights = [
  { label: "Profile views (7d)", value: "+18%", trend: "up" as const, sub: "vs prior week" },
  { label: "Engagement", value: "4.2K", trend: "up" as const, sub: "reactions & replies" },
  { label: "Connections", value: "612", trend: "neutral" as const, sub: "meaningful mutuals" },
  { label: "Live watched", value: "12h", trend: "up" as const, sub: "last 30 days" },
] as const;

export const myPulsePrivateFeatures = [
  {
    title: "Saved & collections",
    body: "Clip what you need between rounds — organized without turning into a second inbox.",
  },
  {
    title: "Activity you control",
    body: "See what you engaged with — with privacy modes that respect night-shift life.",
  },
  {
    title: "Connection map",
    body: "People you actually talk shop with — not generic follower graphs.",
  },
] as const;

/** Feed marketing landing */
export const feedMockPosts = [
  { name: "Dr. Aylin Patel", excerpt: "Night shift rule #7: the coffee is never optional.", hearts: "2.4K" },
  { name: "Jordan Lee, RN", excerpt: "Boards tip that actually stuck — spaced repetition isn’t just for med students.", hearts: "1.1K" },
  { name: "Cards Fellow Amir", excerpt: "Cath lab storytime (de-identified) — what I wish I’d known as an intern.", hearts: "892" },
] as const;

export const feedForYouTags = ["For you", "Following", "Cards", "Night shift", "New grad", "Wellness", "Humor"] as const;

export const feedFormatPills = [
  { title: "Video & clips", body: "Teaching moments, humor, and on-shift stories that load fast." },
  { title: "Images & carousels", body: "Cases and teaching stacks — with PHI-safe norms." },
  { title: "Threads & quotes", body: "Long-form context when 15 seconds isn’t enough." },
] as const;

export const feedTrustPoints = [
  "Role and specialty context for discovery",
  "Safety signals for misinformation & PHI-shaped mistakes",
  "Human review queues aligned to clinical culture",
  "Creators get credit — remix and attribution built in",
] as const;

/** Features hub — stats + comparison */
export const featuresHubStatsBar = [
  { value: "850K+", label: "Healthcare professionals" },
  { value: "190+", label: "Countries" },
  { value: "25K+", label: "Active Circles" },
  { value: "3.7K+", label: "Live sessions hosted" },
] as const;

export const featuresComparisonRows = [
  { label: "Built for healthcare professionals", us: "full" as const, them: "no" as const },
  { label: "Ad-light / professional context", us: "full" as const, them: "limited" as const },
  { label: "Live & interactive teaching", us: "full" as const, them: "partial" as const },
  { label: "Topic rooms (Circles)", us: "full" as const, them: "no" as const },
  { label: "Trust & safety for clinical UGC", us: "full" as const, them: "partial" as const },
  { label: "Public identity (Pulse Page)", us: "full" as const, them: "no" as const },
] as const;

