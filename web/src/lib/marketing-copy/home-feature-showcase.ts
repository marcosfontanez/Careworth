import type { Locale } from "@/lib/i18n";

type FeatureCardCopy = { title: string; desc: string };

export type HomeFeatureShowcaseCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  explore: string;
  liveLabel: string;
  cards: {
    feed: FeatureCardCopy;
    circles: FeatureCardCopy;
    live: FeatureCardCopy;
    pulsePage: FeatureCardCopy;
    myPulse: FeatureCardCopy;
    creator: FeatureCardCopy;
  };
  /** Legacy slot kept so existing non-home callers keep compiling. */
  myPulseRows: [string, string][];
};

const copy: Record<Locale, HomeFeatureShowcaseCopy> = {
  en: {
    eyebrow: "Platform",
    title: "Six surfaces. One account.",
    subtitle: "Explore the full platform on Features — or join the beta.",
    explore: "Explore",
    liveLabel: "Live",
    cards: {
      feed: { title: "Feed", desc: "" },
      circles: { title: "Circles", desc: "" },
      live: { title: "Live", desc: "" },
      pulsePage: { title: "Pulse Page", desc: "" },
      myPulse: { title: "My Pulse", desc: "" },
      creator: { title: "Creator Hub", desc: "" },
    },
    myPulseRows: [
      ["Thought", "Night shift gratitude"],
      ["Clip", "From Feed · teaching clip"],
      ["Link", "Guideline + takeaway"],
      ["Pics", "Coffee before rounds"],
      ["Thought", "Rolls off when you post again"],
    ],
  },
  es: {
    eyebrow: "Plataforma",
    title: "Seis superficies. Una cuenta.",
    subtitle: "Explora todo en Funciones — o entra directo a la beta.",
    explore: "Explorar",
    liveLabel: "En vivo",
    cards: {
      feed: { title: "Feed", desc: "" },
      circles: { title: "Circles", desc: "" },
      live: { title: "Live", desc: "" },
      pulsePage: { title: "Pulse Page", desc: "" },
      myPulse: { title: "My Pulse", desc: "" },
      creator: { title: "Creator Hub", desc: "" },
    },
    myPulseRows: [
      ["Thought", "Gratitud tras el turno nocturno"],
      ["Clip", "Desde Feed · clip educativo"],
      ["Link", "Guía clínica + conclusión"],
      ["Pics", "Café antes de rondas"],
      ["Thought", "Se renueva cuando publicas"],
    ],
  },
};

export function getHomeFeatureShowcaseCopy(locale: Locale): HomeFeatureShowcaseCopy {
  return copy[locale] ?? copy.en;
}
