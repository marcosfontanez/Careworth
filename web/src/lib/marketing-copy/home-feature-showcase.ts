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
    eyebrow: "Platform map",
    title: "Six surfaces. One account.",
    subtitle: "Tap any surface to dive in — the rest of the page covers the headliners.",
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
    eyebrow: "Mapa de la plataforma",
    title: "Seis superficies. Una cuenta.",
    subtitle: "Toca cualquier superficie para entrar — el resto de la página cubre las protagonistas.",
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
