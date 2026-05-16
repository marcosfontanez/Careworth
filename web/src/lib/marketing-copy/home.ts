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
    eyebrow: "Healthcare's first social home",
    headline: "Healthcare culture has a home.",
    subhead:
      "Verified clinicians, students, and creators — together in one place.",
    primaryCta: "Join PulseVerse",
    secondaryCta: "See it in the browser",
    posterTag: "Live product render",
    posterCaption: "Login · Profile · Circles · Creator Hub",
  },
  es: {
    eyebrow: "El primer hogar social de la salud",
    headline: "La cultura sanitaria tiene un hogar.",
    subhead:
      "Clínicos, estudiantes y creadores verificados — en un mismo lugar.",
    primaryCta: "Unirte a PulseVerse",
    secondaryCta: "Verla en el navegador",
    posterTag: "Renderizado real",
    posterCaption: "Login · Perfil · Circles · Creator Hub",
  },
};

const bottomCta: Record<Locale, HomeCtaCopy> = {
  en: {
    title: "Make it your Pulse.",
    description: "Join the clinicians, students, and creators already inside.",
    primaryLabel: "Join PulseVerse",
    secondaryLabel: "Partner with us",
    ecosystemHeroAlt:
      "PulseVerse marketing hero: central My Pulse phone with floating panels for Borders, Circles, Creator Live, Pulse Shop, and Live & Connect, plus Join PulseVerse call-to-action.",
  },
  es: {
    title: "Hazlo tu Pulse.",
    description: "Únete a los clínicos, estudiantes y creadores que ya están dentro.",
    primaryLabel: "Unirte a PulseVerse",
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
