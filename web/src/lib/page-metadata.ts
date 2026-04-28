import type { Metadata } from "next";

import { site } from "@/lib/design-tokens";
import { getPublicSiteUrl } from "@/lib/site-url";

function og(title: string, description: string): Metadata["openGraph"] {
  return {
    title: `${title} · ${site.name}`,
    description,
    siteName: site.name,
    type: "website",
  };
}

/** Canonical marketing page metadata. Use on each public `page.tsx` via `export const metadata = m.*`. */
export const m = {
  home: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    openGraph: og(`${site.name}`, site.description),
  },
  about: {
    title: "About",
    description: `Learn why ${site.name} exists and how we build healthcare culture with trust and clarity.`,
    openGraph: og("About", `Why ${site.name} exists — mission and values.`),
  },
  contact: {
    title: "Contact",
    description: `Reach ${site.name} for partnerships, press, trust and safety, and early access.`,
    openGraph: og("Contact", `Contact ${site.name} for partnerships and support.`),
  },
  download: {
    title: "Download",
    description: `Request access to ${site.name} on iOS and Android as availability expands.`,
    openGraph: og("Download", `Get ${site.name} on mobile when your region opens.`),
  },
  faq: {
    title: "FAQ",
    description: `Common questions about ${site.name} for healthcare professionals and teams.`,
    openGraph: og("FAQ", `Answers about ${site.name}, safety, and eligibility.`),
  },
  features: {
    title: "Features",
    description: `Circles, Live, Pulse Page, Feed, and My Pulse — how ${site.name} fits your professional life.`,
    openGraph: og("Features", `Explore ${site.name} capabilities.`),
  },
  featuresCircles: {
    title: "Circles",
    description: `Specialty and community rooms for focused, high-trust conversation on ${site.name}.`,
    openGraph: og("Circles", `Community rooms on ${site.name}.`),
  },
  featuresFeed: {
    title: "Feed",
    description: `Discovery and trust signals built for clinicians — the ${site.name} feed.`,
    openGraph: og("Feed", `Professional feed on ${site.name}.`),
  },
  featuresLive: {
    title: "Live",
    description: `Go live with credibility — AMAs, teaching, and real-time community on ${site.name}.`,
    openGraph: og("Live", `Live streaming on ${site.name}.`),
  },
  featuresPulsePage: {
    title: "Pulse Page",
    description: `Your public professional presence — pins, media, and identity on ${site.name}.`,
    openGraph: og("Pulse Page", `Professional profiles on ${site.name}.`),
  },
  featuresMyPulse: {
    title: "My Pulse",
    description: `Private notes, links, and circles — your personal layer on ${site.name}.`,
    openGraph: og("My Pulse", `Personal pulse layer on ${site.name}.`),
  },
  advertisers: {
    title: "Advertisers",
    description: `Reach verified healthcare audiences with brand-safe placements on ${site.name}.`,
    openGraph: og("Advertisers", `Healthcare advertising on ${site.name}.`),
  },
  support: {
    title: "Support",
    description: `Help center, FAQs, and how to get support from the ${site.name} team.`,
    openGraph: og("Support", `Help and support for ${site.name}.`),
  },
  partners: {
    title: "Partners",
    description: `Institutions, educators, and innovators partnering with ${site.name}.`,
    openGraph: og("Partners", `Partnerships with ${site.name}.`),
  },
  communityGuidelines: {
    title: "Community guidelines",
    description: `How we keep ${site.name} respectful, accurate, and safe for healthcare professionals.`,
    openGraph: og("Community guidelines", `Rules and norms on ${site.name}.`),
  },
  privacy: {
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses, and protects information.`,
    openGraph: og("Privacy Policy", `Privacy practices for ${site.name}.`),
  },
  terms: {
    title: "Terms of Service",
    description: `Terms that govern your use of ${site.name} apps and websites.`,
    openGraph: og("Terms of Service", `Terms of service for ${site.name}.`),
  },
} satisfies Record<string, Metadata>;

/** Absolute canonical URL for a path (no trailing slash on base). */
export function canonical(path: string): NonNullable<Metadata["alternates"]> {
  const base = getPublicSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return { canonical: `${base}${p}` };
}
