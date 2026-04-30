import type { Locale } from "@/lib/i18n";

export type AboutPillar = { title: string; body: string };

export type AboutPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  pillars: readonly AboutPillar[];
  closing: string;
};

const copy: Record<Locale, AboutPageCopy> = {
  en: {
    eyebrow: "About",
    title: "Social infrastructure for healthcare culture",
    description:
      "PulseVerse exists because healthcare professionals deserve a network that feels as alive as the work — without being reduced to a line on a directory.",
    pillars: [
      {
        title: "Mission",
        body: "Strengthen culture, connection, and credible storytelling across clinical life — without reducing people to credentials alone.",
      },
      {
        title: "Vision",
        body: "A trusted surface where Feed, Circles, Live, and Pulse Page — with Current Vibe, My Pulse, and Media Hub — layer together for growth, moderation, and creator dignity.",
      },
      {
        title: "Principles",
        body: "Premium dark-native UX, healthcare-first moderation, and room for humor beside hard truths.",
      },
    ],
    closing:
      "We are not building hospital software or a stiff professional graph. We're building the cultural layer clinicians never had — serious about trust, expressive about identity, and readable at 2 a.m. on night shift.",
  },
  es: {
    eyebrow: "Acerca de",
    title: "Infraestructura social para la cultura sanitaria",
    description:
      "PulseVerse existe porque quienes trabajan la salud merecen una red tan viva como su trabajo — sin quedar reducidos a una línea en un directorio.",
    pillars: [
      {
        title: "Misión",
        body: "Fortalecer cultura, vínculo y narrativa creíble en la vida clínica — sin reducir a las personas solo a credenciales.",
      },
      {
        title: "Visión",
        body: "Una superficie de confianza donde Feed, Circles, Live y Pulse Page — con Current Vibe, My Pulse y Media Hub — se combinan para crecer, moderar y dignificar a creadores.",
      },
      {
        title: "Principios",
        body: "UX premium en modo oscuro, moderación centrada en la sanidad y espacio para el humor junto a verdades difíciles.",
      },
    ],
    closing:
      "No estamos haciendo software hospitalario ni un grafo rígido. Construimos la capa cultural que a los clínicos les faltó: seria en la confianza, expresiva en la identidad y legible a las 2 a.m. en el turno nocturno.",
  },
};

export function getAboutPageCopy(locale: Locale): AboutPageCopy {
  return copy[locale] ?? copy.en;
}
