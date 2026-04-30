import { site } from "@/lib/design-tokens";
import { absoluteUrl } from "@/lib/breadcrumbs";
import { getPublicSiteUrl } from "@/lib/site-url";

const ORG_ID = `${getPublicSiteUrl()}#organization`;
const SITE_ID = `${getPublicSiteUrl()}#website`;

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
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        name: site.name,
        url,
        description: site.description,
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
