/** Public marketing copy — separate from admin mock data. */

export const homeProductOverview = {
  eyebrow: "Product overview",
  title: "Built for healthcare life — not another corporate graph.",
  description:
    "PulseVerse stitches together what clinicians use after the pager stops: short-form Feed culture, premium Circles, discovery-first Live, and Pulse Page identity with Current Vibe, My Pulse, and Media Hub.",
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
    body: "Short-form healthcare culture and creator content — video, images, and threads that respect specialty, shift, and credibility.",
    href: "/features/feed",
  },
  {
    tag: "Circles",
    title: "Premium topic spaces — healthcare-native, not forum chaos.",
    body: "Specialty and culture communities with high-signal threads — connected to Pulse Page and easy to share back into My Pulse.",
    href: "/features/circles",
  },
  {
    tag: "Live",
    title: "Real-time healthcare culture — discover what’s live now.",
    body: "Featured streams, top rooms, rising creators, and browse by topic — social, active, and creator-led (not a webinar grid).",
    href: "/features/live",
  },
  {
    tag: "Pulse Page",
    title: "Your identity home — expressive, creator-style, clinically grounded.",
    body: "Profile presence, Current Vibe, My Pulse, and Media Hub in one premium surface — music, moments, and momentum together.",
    href: "/features/pulse-page",
  },
  {
    tag: "My Pulse",
    title: "Keep your Pulse fresh — five updates, always current.",
    body: "A rolling strip of your latest five posts: Thought, Clip, Link, or Pics. Add a sixth and the oldest rolls off — never cluttered.",
    href: "/features/my-pulse",
  },
] as const;

export const homePulseDuo = {
  eyebrow: "Pulse Page · My Pulse",
  title: "One identity home — many ways to show up.",
  pulsePage:
    "Pulse Page is your professional and personal hub: verification, creator-style layout, Current Vibe (a premium mini music player), Media Hub, and the social energy of a living profile.",
  myPulse:
    "My Pulse sits on your Pulse Page as a rolling feed of your latest five updates — Thought, Clip, Link, or Pics — newest first, designed to stay fresh instead of turning into a stale wall.",
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
    "Feed, Circles, Live, Pulse Page, and My Pulse — one account, one trust model, and surfaces tuned to how healthcare culture actually moves (with Media Hub living right on your Pulse Page).",
};

export const featuresHubGrid = [
  {
    href: "/features/feed",
    title: "Feed",
    desc: "Short-form healthcare culture and creator content — discovery that respects how you work.",
  },
  {
    href: "/features/circles",
    title: "Circles",
    desc: "Healthcare communities and topic spaces — premium rooms, not generic forums.",
  },
  {
    href: "/features/live",
    title: "Live",
    desc: "Real-time healthcare conversations and discovery — Featured, Top Live Now, Rising Lives, browse by topic.",
  },
  {
    href: "/features/pulse-page",
    title: "Pulse Page",
    desc: "Your identity home — profile, Current Vibe, My Pulse, and Media Hub in one creator-grade surface.",
  },
  {
    href: "/features/my-pulse",
    title: "My Pulse",
    desc: "Rolling five-item update feed on your Pulse Page — Thought, Clip, Link, Pics — always current.",
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
        title: "Find your topic",
        body: "Healthcare-specific circles — specialty, shift, wellness, and culture — with depth that feels premium, not old-school forum energy.",
      },
      {
        title: "Talk with signal",
        body: "Threads and reactions tuned for clinicians; moderators who understand tone, slang, and clinical context.",
      },
      {
        title: "Bring it back to your Pulse",
        body: "Repost highlights into My Pulse so your identity page reflects the communities you care about.",
      },
    ],
  },
  live: {
    eyebrow: "Live",
    steps: [
      {
        title: "Discover what’s happening now",
        body: "Featured Live, Top Live Now, Rising Lives, and browse by topic — built for active discovery, not a schedule-first webinar grid.",
      },
      {
        title: "Go live with purpose",
        body: "Creator-led conversations, AMAs, and teaching moments — with moderation tooling meant for licensed audiences.",
      },
      {
        title: "Chat that scales",
        body: "Fast clinical Q&A, escalation paths, and post-live signals that feed the same trust systems as the Feed.",
      },
    ],
  },
  "pulse-page": {
    eyebrow: "Pulse Page",
    steps: [
      {
        title: "Own your identity surface",
        body: "Premium profile presence — verification, headline, and creator-grade layout that feels alive, not like a PDF.",
      },
      {
        title: "Set the atmosphere",
        body: "Current Vibe is a mini music player on your page — what you’re listening to becomes part of how people experience your Pulse.",
      },
      {
        title: "Media Hub + My Pulse",
        body: "Recent videos, favorites, and photos in one compact library — alongside a rolling five-item My Pulse strip (Thought, Clip, Link, Pics).",
      },
    ],
  },
  "my-pulse": {
    eyebrow: "My Pulse",
    steps: [
      {
        title: "Five updates, always fresh",
        body: "Only your latest five items are visible. Newest on top; adding a sixth pushes the oldest off — intentional, not cluttered.",
      },
      {
        title: "Four ways to post",
        body: "Thought, Clip, Link, Pics — clips are always from inside PulseVerse (yours or saved from the Feed); links go outward; pics capture day-to-day moments.",
      },
      {
        title: "Identity, not a metrics wall",
        body: "My Pulse is how people read your rhythm at a glance. Supporting stats can exist elsewhere — this strip is about what you’re sharing now.",
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
  "Topic-first rooms — high-signal, healthcare-native",
  "Moderation tuned for clinical context",
  "No ads cluttering your threads",
  "Repost into My Pulse when something resonates",
] as const;

/** Live marketing landing */
export const liveFeaturedSessions = [
  { title: "ICU check-in", host: "Dr. Arjun Patel", status: "live" as const, viewers: "1.2K", specialty: "Critical care" },
  {
    title: "New grad residency prep",
    host: "Jordan Lee, RN",
    status: "live" as const,
    viewers: "420",
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

export const liveRisingLives = [
  { title: "Pharmacy counter stories", host: "Sam Okonkwo", viewers: "up 3.1×" },
  { title: "Night shift debrief", host: "Anonymous RN", viewers: "up 2.4×" },
  { title: "Ask a cards attending", host: "Dr. Arjun Patel", viewers: "up 1.9×" },
  { title: "OR teamwork wins", host: "Maya Chen", viewers: "up 1.6×" },
  { title: "Med school AMA", host: "Faculty panel", viewers: "up 1.4×" },
] as const;

export const liveTopNow = [
  { rank: 1, title: "Ask a cards attending", host: "Dr. Arjun Patel", viewers: "1.2K" },
  { rank: 2, title: "Night shift debrief", host: "Anonymous RN", viewers: "880" },
  { rank: 3, title: "Pharmacy pearls", host: "Sam Okonkwo", viewers: "410" },
  { rank: 4, title: "Burnout circle drop-in", host: "Maya Chen", viewers: "320" },
  { rank: 5, title: "Med school AMA", host: "Faculty panel", viewers: "290" },
] as const;

/** Browse-by-topic tiles (Live tab) */
export const liveTopicBrowse = [
  { title: "Critical care", desc: "Teaching, check-ins, acuity talk" },
  { title: "Nursing", desc: "Shift culture, mentorship, humor" },
  { title: "Wellness", desc: "Sustainability on and off shift" },
  { title: "Education", desc: "Boards, training, new grads" },
] as const;

export const liveWhyGoLive = [
  { title: "Clinician trust", body: "Labels, verification, and rooms built for licensed audiences." },
  { title: "Discovery-first", body: "Featured, top, rising, and topic browse — built for what’s live right now." },
  { title: "Interactive Q&A", body: "Queues and moderation that keep fast clinical chat respectful." },
  { title: "Creator-led", body: "Hosts educate and entertain with tools for citations, disclaimers, and context." },
  { title: "Co-hosts", body: "Bring moderators and guests without friction." },
  { title: "Safety workflows", body: "Live incidents route to trained reviewers with clinical context." },
] as const;

/** Pulse Page marketing — five capability cards */
export const pulsePageShareWays = [
  { title: "Your premium profile", body: "Headline, role, verification, and following — creator-friendly and healthcare-specific.", emoji: "👤" },
  { title: "Current Vibe", body: "A premium mini music player — your now-playing track shapes the atmosphere of your Pulse Page.", emoji: "🎵" },
  { title: "My Pulse", body: "Only your latest five updates, newest first — Thought, Clip, Link, or Pics — designed to stay fresh.", emoji: "📣" },
  { title: "Four update types", body: "Thought, Clip, Link, Pics — clips stay inside PulseVerse; links point outward; pics capture everyday moments.", emoji: "✨" },
  { title: "Media Hub", body: "Your compact library — Recent Videos, Favorites, and My Photos — all on Pulse Page.", emoji: "🖼️" },
] as const;

export const pulsePageShowcase = [
  { title: "Recent Videos", kicker: "Media Hub", cta: "Open Media Hub" },
  { title: "Favorites", kicker: "Media Hub", cta: "View favorites" },
  { title: "My Photos", kicker: "Media Hub", cta: "View gallery" },
] as const;

export const pulsePageWhyProfessionals = [
  { title: "Build trust", body: "Show how you practice — not just where you trained." },
  { title: "Stay current", body: "Music, Media Hub, and a five-item My Pulse strip keep your page alive between visits." },
  { title: "Own your narrative", body: "Creator-style layout and content types YOU control." },
  { title: "Grow thoughtfully", body: "Credibility-forward presence — not vanity spam." },
  { title: "Portable presence", body: "Links, media, and story — export-friendly by design." },
] as const;

export const pulsePageAudienceSegments = [
  { title: "Healthcare professionals", body: "Physicians, APPs, nurses, and teams on the floor." },
  { title: "Educators & coaches", body: "Program leaders and mentors building the next cohort." },
  { title: "Creators & hosts", body: "Live AMAs, short clips, and threaded explainers." },
  { title: "Founders & operators", body: "Health innovators with a human front door." },
  { title: "Organizations", body: "Programs and societies with a verified home base." },
] as const;

/** My Pulse — rolling feed (illustrative slots for marketing mocks) */
export const myPulseFeedSlots = [
  { type: "Thought" as const, preview: "Grateful for the team that stayed late." },
  { type: "Clip" as const, preview: "From Feed · cath lab teaching moment" },
  { type: "Link" as const, preview: "New guideline + why it matters on our floor" },
  { type: "Pics" as const, preview: "Coffee before rounds (de-identified)" },
  { type: "Thought" as const, preview: "Oldest visible slot — adding one more drops this item" },
] as const;

export const myPulseCoreIdeas = [
  {
    title: "Five updates, by design",
    body: "Only your latest five items show on Pulse Page. Newest at the top; a sixth post pushes the oldest off — intentional freshness, not an endless history wall.",
  },
  {
    title: "Thought · Clip · Link · Pics",
    body: "Four formats for how healthcare life actually looks: quick notes, in-app clips, outbound links with context, and photo moments you want to share.",
  },
  {
    title: "Clips stay inside PulseVerse",
    body: "A Clip is from your content or something you saved from the Feed — native to our culture layer, not random external embeds.",
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
  { label: "Verified healthcare community", us: "full" as const, them: "limited" as const },
  { label: "Purpose-driven conversations", us: "full" as const, them: "partial" as const },
  { label: "Ad-free experience", us: "full" as const, them: "limited" as const },
] as const;

