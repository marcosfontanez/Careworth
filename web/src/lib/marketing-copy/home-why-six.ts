import type { Locale } from "@/lib/i18n";

export type HomeWhySixItem = { title: string; body: string };

export type HomeWhySixCopy = {
  eyebrow: string;
  title: string;
  items: readonly HomeWhySixItem[];
};

const copy: Record<Locale, HomeWhySixCopy> = {
  en: {
    eyebrow: "Why PulseVerse",
    title: "Built by healthcare. Built for healthcare.",
    items: [
      {
        title: "Healthcare first",
        body: "Surfaces and moderation tuned for licensed professionals — not generic social noise.",
      },
      {
        title: "Privacy by design",
        body: "Built with PHI-shaped mistakes in mind — reporting flows that match clinical reality.",
      },
      {
        title: "Meaningful community",
        body: "Circles and Live that honor night shift, humor, and hard conversations.",
      },
      {
        title: "Live & interactive",
        body: "Teaching, AMAs, and Q&A with tooling that scales when chat moves fast.",
      },
      {
        title: "Your professional brand",
        body: "Pulse Page showcases how you show up — clips, pins, and credibility without stiffness.",
      },
      {
        title: "Global reach",
        body: "A culture network spanning roles, regions, and training stages.",
      },
    ],
  },
  es: {
    eyebrow: "Por qué PulseVerse",
    title: "Hecha desde la sanidad. Para la sanidad.",
    items: [
      {
        title: "La salud primero",
        body: "Superficies y moderación pensadas para profesionales colegiados — no ruido social genérico.",
      },
      {
        title: "Privacidad desde el diseño",
        body: "Con los errores tipo PHI en mente — flujos de reporte alineados con la práctica clínica.",
      },
      {
        title: "Comunidad con sentido",
        body: "Circles y Live que respetan el turno nocturno, el humor y las conversaciones difíciles.",
      },
      {
        title: "En vivo e interactivo",
        body: "Docencia, AMAs y preguntas con herramientas que aguantan cuando el chat se dispara.",
      },
      {
        title: "Tu marca profesional",
        body: "Pulse Page muestra cómo te presentas — clips, pins y credibilidad sin rigidez.",
      },
      {
        title: "Alcance global",
        body: "Una red cultural que abarca roles, regiones y etapas de formación.",
      },
    ],
  },
};

export function getHomeWhySixCopy(locale: Locale): HomeWhySixCopy {
  return copy[locale] ?? copy.en;
}
