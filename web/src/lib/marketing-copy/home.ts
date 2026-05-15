import type { Locale } from "@/lib/i18n";

export type HomeHeroCopy = {
  eyebrow: string;
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
};

const hero: Record<Locale, HomeHeroCopy> = {
  en: {
    eyebrow: "Healthcare's first social home",
    subhead:
      "Verified clinicians, students, and creators — in your specialty, on your terms.",
    primaryCta: "Join PulseVerse",
    secondaryCta: "See it in the browser",
    posterTag: "Live product render",
    posterCaption: "Login · Profile · Circles · Creator Hub",
  },
  es: {
    eyebrow: "El primer hogar social de la salud",
    subhead:
      "Clínicos, estudiantes y creadores verificados — en tu especialidad, en tus términos.",
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
  },
  es: {
    title: "Hazlo tu Pulse.",
    description: "Únete a los clínicos, estudiantes y creadores que ya están dentro.",
    primaryLabel: "Unirte a PulseVerse",
    secondaryLabel: "Aliarte con nosotros",
  },
};

export function getHomeHeroCopy(locale: Locale): HomeHeroCopy {
  return hero[locale] ?? hero.en;
}

export function getHomeCtaCopy(locale: Locale): HomeCtaCopy {
  return bottomCta[locale] ?? bottomCta.en;
}
