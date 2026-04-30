import type { Locale } from "@/lib/i18n";

export type HomeFeatureShowcaseCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  explore: string;
  liveLabel: string;
  cards: {
    feed: { title: string; desc: string };
    circles: { title: string; desc: string };
    live: { title: string; desc: string };
    myPulse: { title: string; desc: string };
  };
  myPulseRows: [string, string][];
};

const copy: Record<Locale, HomeFeatureShowcaseCopy> = {
  en: {
    eyebrow: "Platform",
    title: "Built for healthcare culture — end to end.",
    subtitle:
      "Feed, Circles, Live, and Pulse identity — Media Hub and My Pulse live on your Pulse Page, sharing one account and one trust model.",
    explore: "Explore",
    liveLabel: "Live",
    cards: {
      feed: {
        title: "Feed",
        desc: "Short-form discovery tuned for healthcare — stay close to what matters on shift.",
      },
      circles: {
        title: "Circles",
        desc: "Healthcare-specific topic spaces — high-signal threads that feel premium and connect back to your Pulse Page.",
      },
      live: {
        title: "Live",
        desc: "Featured Live, Top Live Now, Rising Lives, and browse by topic — social discovery for healthcare culture in real time.",
      },
      myPulse: {
        title: "My Pulse",
        desc: "The five newest updates on your Pulse Page — Thought, Clip, Link, or Pics — freshest on top, never cluttered.",
      },
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
    title: "Hecha para la cultura sanitaria, de punta a punta.",
    subtitle:
      "Feed, Circles, Live e identidad Pulse — Media Hub y My Pulse viven en tu Pulse Page, con una sola cuenta y un mismo modelo de confianza.",
    explore: "Explorar",
    liveLabel: "En vivo",
    cards: {
      feed: {
        title: "Feed",
        desc: "Descubrimiento breve pensado para la salud — mantente cerca de lo que importa en el turno.",
      },
      circles: {
        title: "Circles",
        desc: "Espacios temáticos para la salud — hilos de alta señal, sensación premium y conexión con tu Pulse Page.",
      },
      live: {
        title: "Live",
        desc: "Destacados, tendencias y exploración por tema — descubrimiento social para la cultura sanitaria en tiempo real.",
      },
      myPulse: {
        title: "My Pulse",
        desc: "Las cinco novedades más recientes en tu Pulse Page — Thought, Clip, Link o Pics — las últimas arriba, sin ruido.",
      },
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
  return copy[locale];
}
