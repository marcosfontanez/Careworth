import type { Locale } from "@/lib/i18n";

import type { HomeCtaCopy } from "@/lib/marketing-copy/home";

export type FeatureSpotlight = {
  tag: string;
  title: string;
  body: string;
  href: string;
};

export type FeatureGridItem = { href: string; title: string; desc: string };

export type FeaturesHubStatsItem = { value: string; label: string };

export type ComparisonVariant = "full" | "partial" | "no" | "limited";

export type FeaturesComparisonRow = { label: string; us: ComparisonVariant; them: ComparisonVariant };

export type FeaturesHubCopy = {
  intro: { eyebrow: string; title: string; description: string };
  join: string;
  partner: string;
  spotlightsEyebrow: string;
  spotlightsTitle: string;
  spotlightsBody: string;
  explore: string;
  allSurfacesEyebrow: string;
  allSurfacesTitle: string;
  allSurfacesBody: string;
  spotlights: FeatureSpotlight[];
  grid: FeatureGridItem[];
  stats: FeaturesHubStatsItem[];
  compareEyebrow: string;
  compareTitle: string;
  compareBody: string;
  compareTableTitle: string;
  compareColUs: string;
  compareColThem: string;
  compareCellLimited: string;
  compareCellDash: string;
  compareIncludedAria: string;
  comparisonRows: FeaturesComparisonRow[];
  bottomCta: HomeCtaCopy;
};

const sharedSpotlightHrefs = [
  "/features/feed",
  "/features/circles",
  "/features/live",
  "/features/pulse-page",
  "/features/my-pulse",
] as const;

const en: FeaturesHubCopy = {
  intro: {
    eyebrow: "Features overview",
    title: "Explore everything PulseVerse can do.",
    description:
      "Feed, Circles, Live, Pulse Page, and My Pulse — one account, one trust model, and surfaces tuned to how healthcare culture actually moves (with Media Hub living right on your Pulse Page).",
  },
  join: "Join PulseVerse",
  partner: "Partner with us",
  spotlightsEyebrow: "Spotlights",
  spotlightsTitle: "Where culture shows up first",
  spotlightsBody:
    "Feed discovery, premium Circles rooms, Live momentum, and Pulse identity with My Pulse + Media Hub — start anywhere, stay in one network.",
  explore: "Explore",
  allSurfacesEyebrow: "All surfaces",
  allSurfacesTitle: "Five pillars, one product",
  allSurfacesBody: "Same account, same trust model — swap context without switching apps.",
  spotlights: [
    {
      tag: "Feed",
      title: "Culture-forward discovery — tuned for who you are in medicine.",
      body: "Short-form healthcare culture and creator content — video, images, and threads that respect specialty, shift, and credibility.",
      href: sharedSpotlightHrefs[0],
    },
    {
      tag: "Circles",
      title: "Premium topic spaces — healthcare-native, not forum chaos.",
      body: "Specialty and culture communities with high-signal threads — connected to Pulse Page and easy to share back into My Pulse.",
      href: sharedSpotlightHrefs[1],
    },
    {
      tag: "Live",
      title: "Real-time healthcare culture — discover what’s live now.",
      body: "Featured streams, top rooms, rising creators, and browse by topic — social, active, and creator-led (not a webinar grid).",
      href: sharedSpotlightHrefs[2],
    },
    {
      tag: "Pulse Page",
      title: "Your identity home — expressive, creator-style, clinically grounded.",
      body: "Profile presence, Current Vibe, My Pulse, and Media Hub in one premium surface — music, moments, and momentum together.",
      href: sharedSpotlightHrefs[3],
    },
    {
      tag: "My Pulse",
      title: "Keep your Pulse fresh — five updates, always current.",
      body: "A rolling strip of your latest five posts: Thought, Clip, Link, or Pics. Add a sixth and the oldest rolls off — never cluttered.",
      href: sharedSpotlightHrefs[4],
    },
  ],
  grid: [
    {
      href: "/features/feed",
      title: "Feed",
      desc: "Short-form healthcare culture and creator content — discovery that respects how you work.",
    },
    {
      href: "/features/circles",
      title: "Circles",
      desc: "Healthcare communities and topic spaces — premium rooms, not generic forums.",
    },
    {
      href: "/features/live",
      title: "Live",
      desc: "Real-time healthcare conversations and discovery — Featured, Top Live Now, Rising Lives, browse by topic.",
    },
    {
      href: "/features/pulse-page",
      title: "Pulse Page",
      desc: "Your identity home — profile, Current Vibe, My Pulse, and Media Hub in one creator-grade surface.",
    },
    {
      href: "/features/my-pulse",
      title: "My Pulse",
      desc: "Rolling five-item update feed on your Pulse Page — Thought, Clip, Link, Pics — always current.",
    },
  ],
  stats: [
    { value: "850K+", label: "Healthcare professionals" },
    { value: "190+", label: "Countries" },
    { value: "25K+", label: "Active Circles" },
    { value: "3.7K+", label: "Live sessions hosted" },
  ],
  compareEyebrow: "Compare",
  compareTitle: "More than a platform. A better way to connect.",
  compareBody:
    "PulseVerse is built for the cultural layer clinicians never had — not consumer social glued to a directory.",
  compareTableTitle: "Why PulseVerse stands out",
  compareColUs: "PulseVerse",
  compareColThem: "Others",
  compareCellLimited: "Limited",
  compareCellDash: "—",
  compareIncludedAria: "Included",
  comparisonRows: [
    { label: "Built for healthcare professionals", us: "full", them: "no" },
    { label: "Verified healthcare community", us: "full", them: "limited" },
    { label: "Purpose-driven conversations", us: "full", them: "partial" },
    { label: "Ad-free experience", us: "full", them: "limited" },
  ],
  bottomCta: {
    title: "Your community. Your voice. Your Pulse.",
    description: "Get early access to the network built for how healthcare actually connects.",
    primaryLabel: "Join PulseVerse now",
    secondaryLabel: "Talk to partnerships",
  },
};

const es: FeaturesHubCopy = {
  intro: {
    eyebrow: "Panorama de funciones",
    title: "Descubre todo lo que PulseVerse puede hacer.",
    description:
      "Feed, Circles, Live, Pulse Page y My Pulse — una cuenta, un modelo de confianza y superficies pensadas para cómo se mueve la cultura sanitaria (con Media Hub en tu Pulse Page).",
  },
  join: "Unirte a PulseVerse",
  partner: "Colaborar con nosotros",
  spotlightsEyebrow: "Focos",
  spotlightsTitle: "Donde la cultura se ve primero",
  spotlightsBody:
      "Descubrimiento en Feed, salas Circles premium, impulso en Live e identidad Pulse con My Pulse y Media Hub — empieza donde quieras, en una sola red.",
  explore: "Explorar",
  allSurfacesEyebrow: "Todas las superficies",
  allSurfacesTitle: "Cinco pilares, un producto",
  allSurfacesBody: "La misma cuenta y el mismo modelo de confianza — cambia de contexto sin cambiar de app.",
  spotlights: en.spotlights.map((s, i) => ({
    ...s,
    href: sharedSpotlightHrefs[i],
    tag: s.tag,
    title: [
      "Descubrimiento cultural — afinado a quien eres en medicina.",
      "Espacios temáticos premium — propios de la salud, sin caos de foro.",
      "Cultura sanitaria en tiempo real — descubre qué hay en vivo.",
      "Tu casa de identidad — estilo creador, base clínica.",
      "Mantén tu Pulse fresco — cinco novedades, siempre actuales.",
    ][i]!,
    body: [
      "Cultura y creadores en formato breve — vídeo, imagen e hilos que respetan especialidad, turno y credibilidad.",
      "Comunidades de especialidad y cultura con hilos de alta señal: conectadas a Pulse Page y fáciles de llevar a My Pulse.",
      "Emisiones destacadas, salas top, creadores en ascenso y explorar por tema — social y activo, no una parrilla de webinars.",
      "Presencia en perfil, Current Vibe, My Pulse y Media Hub en una superficie premium — música, momentos e impulso juntos.",
      "Una franja con tus cinco publicaciones más recientes: Thought, Clip, Link o Pics. Al añadir la sexta, la más antigua sale — sin desorden.",
    ][i]!,
  })),
  grid: [
    {
      href: "/features/feed",
      title: "Feed",
      desc: "Cultura sanitaria y creadores en formato breve — descubrimiento que respeta cómo trabajas.",
    },
    {
      href: "/features/circles",
      title: "Circles",
      desc: "Comunidades y espacios temáticos en salud — salas premium, no foros genéricos.",
    },
    {
      href: "/features/live",
      title: "Live",
      desc: "Conversaciones y descubrimiento en tiempo real — destacados, top en vivo, en ascenso y por tema.",
    },
    {
      href: "/features/pulse-page",
      title: "Pulse Page",
      desc: "Tu casa de identidad — perfil, Current Vibe, My Pulse y Media Hub en una superficie de nivel creador.",
    },
    {
      href: "/features/my-pulse",
      title: "My Pulse",
      desc: "Cinco novedades en tu Pulse Page — Thought, Clip, Link, Pics — siempre al día.",
    },
  ],
  stats: [
    { value: "850K+", label: "Profesionales de la salud" },
    { value: "190+", label: "Países" },
    { value: "25K+", label: "Circles activos" },
    { value: "3.7K+", label: "Sesiones Live alojadas" },
  ],
  compareEyebrow: "Comparar",
  compareTitle: "Más que una plataforma. Una mejor forma de conectar.",
  compareBody:
      "PulseVerse está hecha para la capa cultural que a los clínicos les faltaba — no es red de consumo pegada a un directorio.",
  compareTableTitle: "Por qué destaca PulseVerse",
  compareColUs: "PulseVerse",
  compareColThem: "Otros",
  compareCellLimited: "Limitado",
  compareCellDash: "—",
  compareIncludedAria: "Incluido",
  comparisonRows: [
    { label: "Pensada para profesionales de la salud", us: "full", them: "no" },
    { label: "Comunidad sanitaria verificada", us: "full", them: "limited" },
    { label: "Conversaciones con propósito", us: "full", them: "partial" },
    { label: "Experiencia sin publicidad", us: "full", them: "limited" },
  ],
  bottomCta: {
    title: "Tu comunidad. Tu voz. Tu Pulse.",
    description: "Accede antes a la red pensada para cómo se conecta de verdad la sanidad.",
    primaryLabel: "Unirte a PulseVerse ahora",
    secondaryLabel: "Hablar con alianzas",
  },
};

export function getFeaturesHubCopy(locale: Locale): FeaturesHubCopy {
  return locale === "es" ? es : en;
}
