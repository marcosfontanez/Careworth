import type { Locale } from "@/lib/i18n";

export type HomeHeroCopy = {
  eyebrow: string;
  /** Visible H1 above the eyebrow (mirrors the headline baked into the hero image for SEO + screen readers). */
  headline: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  posterTag: string;
  posterCaption: string;
};

export type HomeCtaCopy = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  /** Alt for the wide ecosystem hero visual beside the closing CTAs. */
  ecosystemHeroAlt: string;
};

const hero: Record<Locale, HomeHeroCopy> = {
  en: {
    eyebrow: "Healthcare-centered social — open to everyone",
    headline: "Where healthcare stories, creators, and communities connect.",
    subhead:
      "For clinicians, students, caregivers, and curious minds — real stories, humor, education, and live conversations.",
    primaryCta: "Join the beta",
    secondaryCta: "See it in the browser",
    posterTag: "Live product render",
    posterCaption: "Login · Profile · Circles · Creator Hub",
  },
  es: {
    eyebrow: "Red social centrada en salud — abierta a todos",
    headline: "Donde confluyen historias, creadores y comunidades de salud.",
    subhead:
      "Para clínicos, estudiantes, cuidadores y mentes curiosas — historias reales, humor, educación y conversaciones en vivo.",
    primaryCta: "Unirte a la beta",
    secondaryCta: "Verla en el navegador",
    posterTag: "Renderizado real",
    posterCaption: "Login · Perfil · Circles · Creator Hub",
  },
};

const bottomCta: Record<Locale, HomeCtaCopy> = {
  en: {
    title: "Make it your Pulse.",
    description: "Join clinicians, students, caregivers, and curious learners on PulseVerse — healthcare stories, creators, Circles, and live Q&A.",
    primaryLabel: "Join the beta",
    secondaryLabel: "Partner with us",
    ecosystemHeroAlt:
      "PulseVerse marketing hero: central My Pulse phone with floating panels for Borders, Circles, Creator Live, Pulse Shop, and Live & Connect, plus Join PulseVerse call-to-action.",
  },
  es: {
    title: "Hazlo tu Pulse.",
    description:
      "Únete a clínicos, estudiantes, cuidadores y mentes curiosas en PulseVerse — historias, creadores, Circles y Q&A en vivo.",
    primaryLabel: "Unirte a la beta",
    secondaryLabel: "Aliarte con nosotros",
    ecosystemHeroAlt:
      "Hero de PulseVerse: teléfono central My Pulse con paneles flotantes Borders, Circles, Creator Live, Pulse Shop y Live & Connect, más llamada a unirse.",
  },
};

export function getHomeHeroCopy(locale: Locale): HomeHeroCopy {
  return hero[locale] ?? hero.en;
}

export function getHomeCtaCopy(locale: Locale): HomeCtaCopy {
  return bottomCta[locale] ?? bottomCta.en;
}
