import type { Metadata } from "next";

import { site } from "@/lib/design-tokens";
import { getPublicSiteUrl } from "@/lib/site-url";

function og(path: string, title: string, description: string): Metadata["openGraph"] {
  const base = getPublicSiteUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return {
    title: `${title} · ${site.name}`,
    description,
    siteName: site.name,
    type: "website",
    locale: "en_US",
    url,
  };
}

/** Canonical marketing page metadata. Use on each public `page.tsx` via `export const metadata = m.*`. */
export const m = {
  home: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    keywords: [
      "healthcare social network",
      "clinician community",
      "medical professional networking",
      "PulseVerse",
      "Circles",
      "healthcare live streaming",
    ],
    openGraph: og("/", `${site.name}`, site.description),
  },
  about: {
    title: "About",
    description: `Learn why ${site.name} exists and how we build healthcare culture with trust and clarity.`,
    openGraph: og("/about", "About", `Why ${site.name} exists — mission and values.`),
  },
  contact: {
    title: "Contact",
    description: `Reach ${site.name} for partnerships, press, trust and safety, and early access.`,
    openGraph: og("/contact", "Contact", `Contact ${site.name} for partnerships and support.`),
  },
  download: {
    title: "Download",
    description: `Request access to ${site.name} on iOS and Android as availability expands.`,
    openGraph: og("/download", "Download", `Get ${site.name} on mobile when your region opens.`),
  },
  faq: {
    title: "FAQ",
    description: `Common questions about ${site.name} for healthcare professionals and teams.`,
    openGraph: og("/faq", "FAQ", `Answers about ${site.name}, safety, and eligibility.`),
  },
  features: {
    title: "Features",
    description: `Feed, Circles, Live, Pulse Page (with My Pulse and Media Hub) — how ${site.name} fits professional healthcare life.`,
    openGraph: og("/features", "Features", `Explore ${site.name} capabilities.`),
  },
  featuresCircles: {
    title: "Circles",
    description: `Healthcare topic communities and premium rooms — high-signal culture, not generic forums — on ${site.name}.`,
    openGraph: og("/features/circles", "Circles", `Community rooms on ${site.name}.`),
  },
  featuresFeed: {
    title: "Feed",
    description: `Discovery and trust signals built for clinicians — the ${site.name} feed.`,
    openGraph: og("/features/feed", "Feed", `Professional feed on ${site.name}.`),
  },
  featuresLive: {
    title: "Live",
    description: `Real-time healthcare culture and discovery on ${site.name} — Featured Live, Top Live Now, Rising Lives, browse by topic.`,
    openGraph: og("/features/live", "Live", `Live streaming on ${site.name}.`),
  },
  featuresPulsePage: {
    title: "Pulse Page",
    description: `Your identity home on ${site.name} — profile, Current Vibe, My Pulse, and Media Hub together.`,
    openGraph: og("/features/pulse-page", "Pulse Page", `Professional profiles on ${site.name}.`),
  },
  featuresMyPulse: {
    title: "My Pulse",
    description: `Rolling five-item update feed on your Pulse Page — Thought, Clip, Link, Pics — on ${site.name}.`,
    openGraph: og("/features/my-pulse", "My Pulse", `My Pulse on ${site.name}.`),
  },
  advertisers: {
    title: "Advertisers",
    description: `Reach verified healthcare audiences across Feed, Pulse Page, Live, and Circles — brand-safe placements on ${site.name}.`,
    keywords: ["healthcare advertising", "HCP marketing", "medical brand safety", "clinical audience"],
    openGraph: og("/advertisers", "Advertisers", `Healthcare advertising on ${site.name}.`),
  },
  support: {
    title: "Support",
    description: `Help center, FAQs, and how to get support from the ${site.name} team.`,
    openGraph: og("/support", "Support", `Help and support for ${site.name}.`),
  },
  partners: {
    title: "Partners",
    description: `Institutions, educators, and innovators partnering with ${site.name}.`,
    openGraph: og("/partners", "Partners", `Partnerships with ${site.name}.`),
  },
  communityGuidelines: {
    title: "Community guidelines",
    description: `How we keep ${site.name} respectful, accurate, and safe for healthcare professionals.`,
    openGraph: og("/community-guidelines", "Community guidelines", `Rules and norms on ${site.name}.`),
  },
  changelog: {
    title: "Changelog",
    description: `Public site and messaging updates for ${site.name} — product roadmap lives in the apps.`,
    openGraph: og("/changelog", "Changelog", `Marketing site changelog for ${site.name}.`),
  },
  trust: {
    title: "Trust & safety",
    description: `How ${site.name} approaches moderation, reporting, and protecting healthcare culture on the network.`,
    openGraph: og("/trust", "Trust & safety", `Trust, safety, and moderation on ${site.name}.`),
  },
  privacy: {
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses, and protects information.`,
    openGraph: og("/privacy", "Privacy Policy", `Privacy practices for ${site.name}.`),
  },
  terms: {
    title: "Terms of Service",
    description: `Terms that govern your use of ${site.name} apps and websites.`,
    openGraph: og("/terms", "Terms of Service", `Terms of service for ${site.name}.`),
  },
} satisfies Record<string, Metadata>;

/** Absolute canonical URL for a path (no trailing slash on base). */
export function canonical(path: string): NonNullable<Metadata["alternates"]> {
  const base = getPublicSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return { canonical: `${base}${p}` };
}
