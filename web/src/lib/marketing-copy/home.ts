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
  collageBannerAlt: string;
  collagePhoneAlt: string;
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
    collageBannerAlt:
      "PulseVerse Pulse Shop banner and storefront hero with premium teal accents on dark glass.",
    collagePhoneAlt:
      "PulseVerse mobile Pulse Shop frame showing browse and collectibles UI on a phone mockup.",
  },
  es: {
    title: "Hazlo tu Pulse.",
    description: "Únete a los clínicos, estudiantes y creadores que ya están dentro.",
    primaryLabel: "Unirte a PulseVerse",
    secondaryLabel: "Aliarte con nosotros",
    collageBannerAlt:
      "Banner hero de Pulse Shop en PulseVerse con acentos teal premium sobre glass oscuro.",
    collagePhoneAlt:
      "Marco móvil de Pulse Shop en PulseVerse con interfaz de exploración y coleccionables.",
  },
};

export function getHomeHeroCopy(locale: Locale): HomeHeroCopy {
  return hero[locale] ?? hero.en;
}

export function getHomeCtaCopy(locale: Locale): HomeCtaCopy {
  return bottomCta[locale] ?? bottomCta.en;
}
