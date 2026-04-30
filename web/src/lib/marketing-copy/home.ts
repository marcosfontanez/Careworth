import type { Locale } from "@/lib/i18n";

export type HomeHeroCopy = {
  headlineLead: string;
  headlineAccent: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  bulletSafe: string;
  bulletConnections: string;
  bulletLive: string;
  tagline: string;
  framesCaption: string;
};

export type HomeCtaCopy = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
};

const hero: Record<Locale, HomeHeroCopy> = {
  en: {
    headlineLead: "Healthcare culture,",
    headlineAccent: "all in one place.",
    subhead:
      "The social platform for the global healthcare community — Feed, Circles, Live, and Pulse Page with Current Vibe, My Pulse, and Media Hub. Built for professionals who want real connection, not another stiff directory.",
    primaryCta: "Join PulseVerse",
    secondaryCta: "Explore Pulse Page",
    bulletSafe: "Safe & verified",
    bulletConnections: "Real connections",
    bulletLive: "Live & on-demand",
    tagline: "where clinicians, students, and teams build culture that lasts.",
    framesCaption: "Product frames · swap for marketing captures anytime",
  },
  es: {
    headlineLead: "Cultura en salud,",
    headlineAccent: "todo en un solo lugar.",
    subhead:
      "La plataforma social para la comunidad sanitaria global — Feed, Circles, Live y Pulse Page con Current Vibe, My Pulse y Media Hub. Pensada para profesionales que buscan vínculos reales, no otro directorio rígido.",
    primaryCta: "Unirte a PulseVerse",
    secondaryCta: "Explorar Pulse Page",
    bulletSafe: "Seguro y verificado",
    bulletConnections: "Conexiones reales",
    bulletLive: "En vivo y a la carta",
    tagline: "donde clínicos, estudiantes y equipos construyen cultura que perdura.",
    framesCaption: "Maquetas del producto · sustituye por capturas cuando quieras",
  },
};

const bottomCta: Record<Locale, HomeCtaCopy> = {
  en: {
    title: "Your community. Your voice. Your Pulse.",
    description:
      "Join clinicians, students, and teams building healthcare culture — with trust, clarity, and room to breathe.",
    primaryLabel: "Join PulseVerse now",
    secondaryLabel: "Talk to partnerships",
  },
  es: {
    title: "Tu comunidad. Tu voz. Tu Pulse.",
    description:
      "Únete a clínicos, estudiantes y equipos que impulsan la cultura sanitaria — con confianza, claridad y espacio para respirar.",
    primaryLabel: "Unirte a PulseVerse",
    secondaryLabel: "Hablar con alianzas",
  },
};

export function getHomeHeroCopy(locale: Locale): HomeHeroCopy {
  return hero[locale];
}

export function getHomeCtaCopy(locale: Locale): HomeCtaCopy {
  return bottomCta[locale];
}
