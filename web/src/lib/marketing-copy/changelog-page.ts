import type { Locale } from "@/lib/i18n";

import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";

export type ChangelogEntry = { date: string; title: string; body: string };

export type ChangelogPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  entries: readonly ChangelogEntry[];
};

function description(locale: Locale): string {
  const tail =
    locale === "es"
      ? `Para fechas legales en vigor, revisa la cabecera de cada documento (última actualización ${legalDocumentsLastUpdatedDisplay}).`
      : `For legal effective dates, see each document’s header (last updated ${legalDocumentsLastUpdatedDisplay}).`;
  const lead =
    locale === "es"
      ? "Las novedades del producto van primero a las apps; esta página destaca hitos del sitio público y del mensaje."
      : "Product updates ship in the apps first; this page highlights marketing-site and messaging milestones.";
  return `${lead} ${tail}`;
}

const entries: Record<Locale, readonly ChangelogEntry[]> = {
  en: [
    {
      date: "2026-04-27",
      title: "PulseVerse marketing site refresh",
      body: "Homepage, feature pages, FAQ, and support copy aligned to Pulse Page (Current Vibe, My Pulse, Media Hub), Live discovery, and Circles. Added /trust overview, breadcrumbs with BreadcrumbList JSON-LD, per-route Open Graph images, Organization + FAQ structured data, sitemap + footer links, contact success + CTA analytics, newsletter signup events, UTM preservation on download/contact, footer PHI + legal last-updated surfacing, lazy-loaded home sections, and performance-oriented loading for below-the-fold content.",
    },
  ],
  es: [
    {
      date: "2026-04-27",
      title: "Renovación del sitio de marketing de PulseVerse",
      body: "Inicio, páginas de funciones, FAQ y soporte alineados con Pulse Page (Current Vibe, My Pulse, Media Hub), descubrimiento en Live y Circles. Añadimos /trust, migas con JSON-LD BreadcrumbList, Open Graph por ruta, datos estructurados Organization + FAQ, sitemap y enlaces en el pie, analítica de contacto y CTAs, eventos del boletín, preservación de UTM en descarga/contacto, aviso PHI y última actualización legal en el pie, secciones de inicio con carga diferida y mejoras de rendimiento bajo el pliegue.",
    },
  ],
};

export function getChangelogPageCopy(locale: Locale): ChangelogPageCopy {
  const isEs = locale === "es";
  return {
    eyebrow: isEs ? "Novedades" : "Changelog",
    title: isEs ? "Qué hay de nuevo en el sitio público" : "What’s new on the public site",
    description: description(locale),
    entries: entries[locale] ?? entries.en,
  };
}
