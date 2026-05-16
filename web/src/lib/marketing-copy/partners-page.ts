import type { Locale } from "@/lib/i18n";

export type PartnersOffer = { title: string; body: string };

export type PartnersPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  heroVisualAlt: string;
  heroPosterTag: string;
  offers: readonly PartnersOffer[];
  contactLead: string;
  contactLinkLabel: string;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimaryLabel: string;
};

const copy: Record<Locale, PartnersPageCopy> = {
  en: {
    eyebrow: "Partners",
    title: "Build with healthcare culture",
    description:
      "Institutions, associations, and innovators reach clinicians across Feed, Circles, Live, and Pulse Page — with moderation depth, trust tooling, and identity surfaces aligned to how teams actually work.",
    heroVisualAlt:
      "Partners marketing hero: live collaboration card with dual PulseVerse phone mockups for co-branded education and institutional reach.",
    heroPosterTag: "Partner ecosystem",
    offers: [
      {
        title: "Education series",
        body: "Co-branded Live with moderated Q&A, clear disclosures, and optional integration with Circles programming — built for discovery-first Live, not static webinars.",
      },
      {
        title: "Circles & community",
        body: "Sponsored room headers and editorial support in premium healthcare topic spaces — with paths for highlights to surface on Pulse Page via My Pulse.",
      },
      {
        title: "Research-ready analytics",
        body: "Directional engagement and segment visibility with consent boundaries, evolving toward credible partner Data & Insights.",
      },
    ],
    contactLead: "Enterprise pathways, BAAs, and regional rollouts — start on the",
    contactLinkLabel: "contact form",
    ctaTitle: "Talk partnerships",
    ctaDescription: "Tell us about your organization and the communities you serve.",
    ctaPrimaryLabel: "Contact us",
  },
  es: {
    eyebrow: "Socios",
    title: "Construir con la cultura sanitaria",
    description:
      "Instituciones, asociaciones e innovadores llegan a clínicos en Feed, Circles, Live y Pulse Page — con moderación rigurosa, herramientas de confianza e identidad alineadas al trabajo real de los equipos.",
    heroVisualAlt:
      "Hero de socios PulseVerse: tarjeta de colaboración en vivo con dos mockups móviles para educación co-marca e instituciones.",
    heroPosterTag: "Ecosistema de socios",
    offers: [
      {
        title: "Series formativas",
        body: "Live de marca con Q&A moderada, divulgación clara e integración opcional con programación en Circles — pensado para descubrimiento en Live, no webinars estáticos.",
      },
      {
        title: "Circles y comunidad",
        body: "Cabeceras patrocinadas y apoyo editorial en espacios temáticos premium — con caminos para que los destacados aparezcan en Pulse Page vía My Pulse.",
      },
      {
        title: "Analítica lista para investigación",
        body: "Compromiso direccional y visibilidad por segmentos con límites de consentimiento, evolucionando hacia Data & Insights creíble para socios.",
      },
    ],
    contactLead: "Vías enterprise, BAAs y despliegues por región — empieza en el",
    contactLinkLabel: "formulario de contacto",
    ctaTitle: "Hablar de alianzas",
    ctaDescription: "Cuéntanos tu organización y las comunidades que acompañáis.",
    ctaPrimaryLabel: "Contacto",
  },
};

export function getPartnersPageCopy(locale: Locale): PartnersPageCopy {
  return copy[locale] ?? copy.en;
}
