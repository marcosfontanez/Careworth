import type { Metadata } from "next";

import { site } from "@/lib/design-tokens";
import type { Locale } from "@/lib/i18n";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { canonical } from "@/lib/page-metadata";
import { getPublicSiteUrl } from "@/lib/site-url";

export type MarketingSeoKey =
  | "home"
  | "about"
  | "contact"
  | "download"
  | "faq"
  | "features"
  | "featuresCircles"
  | "featuresFeed"
  | "featuresLive"
  | "featuresPulsePage"
  | "featuresMyPulse"
  | "advertisers"
  | "support"
  | "partners"
  | "communityGuidelines"
  | "changelog"
  | "trust"
  | "privacy"
  | "terms";

type SeoEntry = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords?: string[];
};

const PATHS: Record<MarketingSeoKey, `/${string}` | "/"> = {
  home: "/",
  about: "/about",
  contact: "/contact",
  download: "/download",
  faq: "/faq",
  features: "/features",
  featuresCircles: "/features/circles",
  featuresFeed: "/features/feed",
  featuresLive: "/features/live",
  featuresPulsePage: "/features/pulse-page",
  featuresMyPulse: "/features/my-pulse",
  advertisers: "/advertisers",
  support: "/support",
  partners: "/partners",
  communityGuidelines: "/community-guidelines",
  changelog: "/changelog",
  trust: "/trust",
  privacy: "/privacy",
  terms: "/terms",
};

const en: Record<MarketingSeoKey, SeoEntry> = {
  home: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    ogTitle: site.name,
    ogDescription: site.description,
    keywords: [
      "healthcare social network",
      "clinician community",
      "medical professional networking",
      "PulseVerse",
      "Circles",
      "healthcare live streaming",
    ],
  },
  about: {
    title: "About",
    description: `Learn why ${site.name} exists and how we build healthcare culture with trust and clarity.`,
    ogTitle: "About",
    ogDescription: `Why ${site.name} exists — mission and values.`,
  },
  contact: {
    title: "Contact",
    description: `Reach ${site.name} for partnerships, press, trust and safety, and early access.`,
    ogTitle: "Contact",
    ogDescription: `Contact ${site.name} for partnerships and support.`,
  },
  download: {
    title: "Download",
    description: `Request access to ${site.name} on iOS and Android as availability expands.`,
    ogTitle: "Download",
    ogDescription: `Get ${site.name} on mobile when your region opens.`,
  },
  faq: {
    title: "FAQ",
    description: `Common questions about ${site.name} for healthcare professionals and teams.`,
    ogTitle: "FAQ",
    ogDescription: `Answers about ${site.name}, safety, and eligibility.`,
  },
  features: {
    title: "Features",
    description: `Feed, Circles, Live, Pulse Page (with My Pulse and Media Hub) — how ${site.name} fits professional healthcare life.`,
    ogTitle: "Features",
    ogDescription: `Explore ${site.name} capabilities.`,
  },
  featuresCircles: {
    title: "Circles",
    description: `Healthcare topic communities and premium rooms — high-signal culture, not generic forums — on ${site.name}.`,
    ogTitle: "Circles",
    ogDescription: `Community rooms on ${site.name}.`,
  },
  featuresFeed: {
    title: "Feed",
    description: `Discovery and trust signals built for clinicians — the ${site.name} feed.`,
    ogTitle: "Feed",
    ogDescription: `Professional feed on ${site.name}.`,
  },
  featuresLive: {
    title: "Live",
    description: `Real-time healthcare culture and discovery on ${site.name} — Featured Live, Top Live Now, Rising Lives, browse by topic.`,
    ogTitle: "Live",
    ogDescription: `Live streaming on ${site.name}.`,
  },
  featuresPulsePage: {
    title: "Pulse Page",
    description: `Your identity home on ${site.name} — profile, Current Vibe, My Pulse, and Media Hub together.`,
    ogTitle: "Pulse Page",
    ogDescription: `Professional profiles on ${site.name}.`,
  },
  featuresMyPulse: {
    title: "My Pulse",
    description: `Rolling five-item update feed on your Pulse Page — Thought, Clip, Link, Pics — on ${site.name}.`,
    ogTitle: "My Pulse",
    ogDescription: `My Pulse on ${site.name}.`,
  },
  advertisers: {
    title: "Advertisers",
    description: `Reach verified healthcare audiences across Feed, Pulse Page, Live, and Circles — brand-safe placements on ${site.name}.`,
    ogTitle: "Advertisers",
    ogDescription: `Healthcare advertising on ${site.name}.`,
    keywords: ["healthcare advertising", "HCP marketing", "medical brand safety", "clinical audience"],
  },
  support: {
    title: "Support",
    description: `Help center, FAQs, and how to get support from the ${site.name} team.`,
    ogTitle: "Support",
    ogDescription: `Help and support for ${site.name}.`,
  },
  partners: {
    title: "Partners",
    description: `Institutions, educators, and innovators partnering with ${site.name}.`,
    ogTitle: "Partners",
    ogDescription: `Partnerships with ${site.name}.`,
  },
  communityGuidelines: {
    title: "Community guidelines",
    description: `How we keep ${site.name} respectful, accurate, and safe for healthcare professionals.`,
    ogTitle: "Community guidelines",
    ogDescription: `Rules and norms on ${site.name}.`,
  },
  changelog: {
    title: "Changelog",
    description: `Public site and messaging updates for ${site.name} — product roadmap lives in the apps.`,
    ogTitle: "Changelog",
    ogDescription: `Marketing site changelog for ${site.name}.`,
  },
  trust: {
    title: "Trust & safety",
    description: `How ${site.name} approaches moderation, reporting, and protecting healthcare culture on the network.`,
    ogTitle: "Trust & safety",
    ogDescription: `Trust, safety, and moderation on ${site.name}.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses, and protects information.`,
    ogTitle: "Privacy Policy",
    ogDescription: `Privacy practices for ${site.name}.`,
  },
  terms: {
    title: "Terms of Service",
    description: `Terms that govern your use of ${site.name} apps and websites.`,
    ogTitle: "Terms of Service",
    ogDescription: `Terms of service for ${site.name}.`,
  },
};

const es: Record<MarketingSeoKey, SeoEntry> = {
  home: {
    title: `${site.name} — Cultura en salud, todo en un solo lugar.`,
    description: "La plataforma social para la comunidad sanitaria global.",
    ogTitle: site.name,
    ogDescription: "La plataforma social para la comunidad sanitaria global.",
    keywords: [
      "red social sanitaria",
      "comunidad clínica",
      "red profesional médica",
      "PulseVerse",
      "Circles",
      "streaming en vivo en salud",
    ],
  },
  about: {
    title: "Acerca de",
    description: `Por qué existe ${site.name} y cómo construimos cultura sanitaria con confianza y claridad.`,
    ogTitle: "Acerca de",
    ogDescription: `Por qué existe ${site.name}: misión y valores.`,
  },
  contact: {
    title: "Contacto",
    description: `Escríbenos para alianzas, prensa, confianza y seguridad, y acceso anticipado a ${site.name}.`,
    ogTitle: "Contacto",
    ogDescription: `Contacto con ${site.name} para alianzas y soporte.`,
  },
  download: {
    title: "Descargar",
    description: `Solicita acceso a ${site.name} en iOS y Android según vaya abriendo disponibilidad.`,
    ogTitle: "Descargar",
    ogDescription: `Consigue ${site.name} en móvil cuando tu región esté disponible.`,
  },
  faq: {
    title: "Preguntas frecuentes",
    description: `Preguntas habituales sobre ${site.name} para profesionales y equipos sanitarios.`,
    ogTitle: "Preguntas frecuentes",
    ogDescription: `Respuestas sobre ${site.name}, seguridad y elegibilidad.`,
  },
  features: {
    title: "Funciones",
    description: `Feed, Circles, Live, Pulse Page (con My Pulse y Media Hub): cómo ${site.name} encaja en la vida profesional sanitaria.`,
    ogTitle: "Funciones",
    ogDescription: `Explora las capacidades de ${site.name}.`,
  },
  featuresCircles: {
    title: "Circles",
    description: `Comunidades temáticas en salud y salas premium: cultura de alta señal, no foros genéricos, en ${site.name}.`,
    ogTitle: "Circles",
    ogDescription: `Salas y comunidades en ${site.name}.`,
  },
  featuresFeed: {
    title: "Feed",
    description: `Descubrimiento y señales de confianza pensadas para clínicos: el feed de ${site.name}.`,
    ogTitle: "Feed",
    ogDescription: `Feed profesional en ${site.name}.`,
  },
  featuresLive: {
    title: "Live",
    description: `Cultura e información en tiempo real en ${site.name}: destacados, top en vivo, en ascenso y por tema.`,
    ogTitle: "Live",
    ogDescription: `Live en ${site.name}.`,
  },
  featuresPulsePage: {
    title: "Pulse Page",
    description: `Tu casa de identidad en ${site.name}: perfil, Current Vibe, My Pulse y Media Hub juntos.`,
    ogTitle: "Pulse Page",
    ogDescription: `Perfiles profesionales en ${site.name}.`,
  },
  featuresMyPulse: {
    title: "My Pulse",
    description: `Cinco novedades en tu Pulse Page — Thought, Clip, Link, Pics — en ${site.name}.`,
    ogTitle: "My Pulse",
    ogDescription: `My Pulse en ${site.name}.`,
  },
  advertisers: {
    title: "Anunciantes",
    description: `Llega a audiencias sanitarias verificadas en Feed, Pulse Page, Live y Circles — ubicaciones seguras para marca en ${site.name}.`,
    ogTitle: "Anunciantes",
    ogDescription: `Publicidad sanitaria en ${site.name}.`,
    keywords: [
      "publicidad en salud",
      "marketing HCP",
      "seguridad de marca médica",
      "audiencia clínica",
    ],
  },
  support: {
    title: "Soporte",
    description: `Centro de ayuda, preguntas frecuentes y cómo contactar al equipo de ${site.name}.`,
    ogTitle: "Soporte",
    ogDescription: `Ayuda y soporte para ${site.name}.`,
  },
  partners: {
    title: "Socios",
    description: `Instituciones, formadores e innovadores que colaboran con ${site.name}.`,
    ogTitle: "Socios",
    ogDescription: `Alianzas con ${site.name}.`,
  },
  communityGuidelines: {
    title: "Normas de la comunidad",
    description: `Cómo mantenemos ${site.name} respetuoso, riguroso y seguro para profesionales sanitarios.`,
    ogTitle: "Normas de la comunidad",
    ogDescription: `Reglas y normas en ${site.name}.`,
  },
  changelog: {
    title: "Novedades del sitio",
    description: `Actualizaciones públicas del sitio y mensajes para ${site.name}; el roadmap vivo está en las apps.`,
    ogTitle: "Novedades del sitio",
    ogDescription: `Registro de cambios del sitio de ${site.name}.`,
  },
  trust: {
    title: "Confianza y seguridad",
    description: `Cómo ${site.name} aborda moderación, reportes y la protección de la cultura sanitaria en la red.`,
    ogTitle: "Confianza y seguridad",
    ogDescription: `Confianza, seguridad y moderación en ${site.name}.`,
  },
  privacy: {
    title: "Política de privacidad",
    description: `Cómo ${site.name} recopila, usa y protege la información.`,
    ogTitle: "Política de privacidad",
    ogDescription: `Prácticas de privacidad de ${site.name}.`,
  },
  terms: {
    title: "Términos del servicio",
    description: `Términos que rigen el uso de las apps y sitios de ${site.name}.`,
    ogTitle: "Términos del servicio",
    ogDescription: `Términos de servicio de ${site.name}.`,
  },
};

export function marketingMetadataFor(key: MarketingSeoKey, locale: Locale): Metadata {
  const path = PATHS[key];
  const bundle = locale === "es" ? es : en;
  const e = bundle[key];
  const baseClean = getPublicSiteUrl().replace(/\/$/, "");
  const url = path === "/" ? `${baseClean}/` : `${baseClean}${path}`;

  return {
    title: e.title,
    description: e.description,
    ...(e.keywords ? { keywords: e.keywords } : {}),
    alternates: canonical(path),
    openGraph: {
      title: `${e.ogTitle} · ${site.name}`,
      description: e.ogDescription,
      siteName: site.name,
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      url,
    },
  };
}

export async function generateMarketingMetadata(key: MarketingSeoKey): Promise<Metadata> {
  const locale = await getMarketingLocale();
  return marketingMetadataFor(key, locale);
}
