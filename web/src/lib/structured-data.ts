import { site } from "@/lib/design-tokens";
import { absoluteUrl } from "@/lib/breadcrumbs";
import { getPublicSiteUrl } from "@/lib/site-url";

const ORG_ID = `${getPublicSiteUrl()}#organization`;
const SITE_ID = `${getPublicSiteUrl()}#website`;
const APP_ID = `${getPublicSiteUrl()}#app`;

/**
 * Site-wide entity graph. Includes a MobileApplication node so AI answer
 * engines (ChatGPT, Perplexity, Gemini) can resolve PulseVerse as a real,
 * free social app for healthcare workers — not just a generic website.
 */
export function organizationAndWebsiteGraph(): Record<string, unknown> {
  const url = getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: site.name,
        url,
        description: site.description,
        logo: `${url}/opengraph-image`,
        sameAs: [
          "https://apps.apple.com/app/pulseverse",
          "https://play.google.com/store/apps/details?id=app.pulseverse",
        ],
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: site.name,
        url,
        description: site.description,
        publisher: { "@id": ORG_ID },
      },
      {
        "@type": "MobileApplication",
        "@id": APP_ID,
        name: site.name,
        url,
        applicationCategory: "SocialNetworkingApplication",
        applicationSubCategory: "Healthcare social network",
        operatingSystem: "iOS, Android",
        description:
          "PulseVerse is a free social app for healthcare workers — nurses, doctors, and medical students — to share short videos, post updates, and join moderated communities called Circles.",
        audience: {
          "@type": "Audience",
          audienceType: "Healthcare professionals (nurses, doctors, medical students)",
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

export function faqPageSchema(items: readonly { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function breadcrumbListSchema(items: readonly { name: string; href: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.href),
    })),
  };
}
