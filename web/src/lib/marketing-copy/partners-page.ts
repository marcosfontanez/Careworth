import type { Locale } from "@/lib/i18n";

export type PartnersOffer = { title: string; body: string };

export type PartnersPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
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
      "Institutions, associations, and innovators partner with PulseVerse to reach clinicians in Feed, Circles, Live, and on Pulse Page — with moderation seriousness, trust tooling, and identity surfaces that respect how teams actually connect.",
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
        body: "Directional engagement and segment visibility with consent boundaries, evolving toward credible partner Data & Insights — expand under your data agreement.",
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
      "Instituciones, asociaciones e innovadores colaboran con PulseVerse para llegar a clínicos en Feed, Circles, Live y Pulse Page — con moderación rigurosa, herramientas de confianza e identidad que respetan cómo los equipos se conectan de verdad.",
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
        body: "Compromiso direccional y visibilidad por segmentos con límites de consentimiento, evolucionando hacia Data & Insights creíble para socios — amplía bajo tu acuerdo de datos.",
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
