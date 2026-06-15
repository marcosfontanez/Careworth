import type { Locale } from "@/lib/i18n";

export type HeroMiniCard = { title: string; body: string };

export type LandingFeature = {
  id: string;
  headline: string;
  copy: string;
  bullets: readonly string[];
  cta: string;
  href: string;
};

export type WhyDifferentCard = { title: string; body: string };

export type HomeLandingCopy = {
  hero: {
    badge: string;
    headlineLines: readonly [string, string, string];
    subhead: string;
    tagline: string;
    primaryCta: string;
    secondaryCta: string;
    demoCta: string;
    miniCards: readonly HeroMiniCard[];
    webBetaNote: string;
  };
  experience: {
    eyebrow: string;
    title: string;
    subtitle: string;
    features: readonly LandingFeature[];
  };
  whyDifferent: {
    eyebrow: string;
    title: string;
    cards: readonly WhyDifferentCard[];
  };
  demo: {
    eyebrow: string;
    title: string;
    body: string;
    button: string;
    footnote: string;
  };
  download: {
    headline: string;
    body: string;
    iosCta: string;
    androidCta: string;
    webBetaCta: string;
    webBetaNote: string;
    supportLinkLabel: string;
  };
  trustBand: {
    phiLead: string;
    phiBody: string;
    links: readonly { label: string; href: string }[];
  };
};

const en: HomeLandingCopy = {
  hero: {
    badge: "Healthcare-rooted social platform",
    headlineLines: ["Real stories.", "Real creators.", "Real community."],
    subhead:
      "PulseVerse brings together social video, curated Circles, personalized My Pulse profiles, live conversations, and powerful creator tools — all healthcare-rooted and made for everyone.",
    tagline: "Healthcare-rooted. Community-powered. Made for everyone.",
    primaryCta: "Download free",
    secondaryCta: "Explore web beta",
    demoCta: "Watch 35-sec demo",
    miniCards: [
      { title: "Watch & Create", body: "Discover real stories or share your own." },
      { title: "Join Circles", body: "Find your people in topical communities." },
      { title: "Build My Pulse", body: "Show your vibe, stats, and what drives you." },
      { title: "Go Live", body: "Connect in real time and grow together." },
    ],
    webBetaNote:
      "Mobile app available now. Web beta expanding — start in the app for the full experience.",
  },
  experience: {
    eyebrow: "Explore",
    title: "Explore the PulseVerse experience",
    subtitle: "One platform for stories, communities, profiles, creators, and live connection.",
    features: [
      {
        id: "feed",
        headline: "Real stories. Real creators.",
        copy: "Scroll short-form social video with healthcare roots and broad community appeal.",
        bullets: [
          "Healthcare-rooted creator content",
          "Comments, shares, saves, and reactions",
          "Built for humor, education, stories, and everyday moments",
        ],
        cta: "Explore Feed",
        href: "/features/feed",
      },
      {
        id: "circles",
        headline: "Find your people.",
        copy: "Explore communities for healthcare, creators, humor, students, caregivers, and everyday life.",
        bullets: ["Discover public Circles", "Follow trending topics", "Join shared-interest spaces"],
        cta: "Explore Circles",
        href: "/features/circles",
      },
      {
        id: "prompts",
        headline: "Every Circle stays alive.",
        copy: "Weekly prompts, highlights, top discussions, and community moments keep conversations moving.",
        bullets: [
          "AI-assisted weekly prompts",
          "Top discussions and highlights",
          "Fresh, video, question, and trending filters",
        ],
        cta: "See community prompts",
        href: "/features/circles",
      },
      {
        id: "myPulse",
        headline: "Your profile. Your vibe.",
        copy: "Show your identity, stats, interests, personal style, music, and Pulse Score in one premium profile.",
        bullets: ["Personalized profiles", "Vibe music", "Pulse Score and creator identity"],
        cta: "Build My Pulse",
        href: "/features/my-pulse",
      },
      {
        id: "creator",
        headline: "Create with confidence.",
        copy: "Record, upload, plan, and publish with tools made for modern creators.",
        bullets: ["Record and upload", "B-roll Studio", "Drafts and scheduled posts"],
        cta: "Open Creator Hub",
        href: "/creator-hub",
      },
      {
        id: "live",
        headline: "Go live. Stay connected.",
        copy: "Stream in real time, chat with your audience, run polls, receive reactions, and build community.",
        bullets: ["Live chat", "Real-time reactions", "Creator community"],
        cta: "Explore Live",
        href: "/features/live",
      },
    ],
  },
  whyDifferent: {
    eyebrow: "Why PulseVerse",
    title: "Why PulseVerse feels different",
    cards: [
      {
        title: "Healthcare-rooted, not healthcare-only",
        body: "Built around healthcare culture, but open to students, caregivers, creators, and curious minds.",
      },
      {
        title: "Communities with momentum",
        body: "Weekly prompts, top discussions, and highlights help every Circle feel alive.",
      },
      {
        title: "Creator tools built in",
        body: "Record, upload, go live, schedule, customize, and grow from one ecosystem.",
      },
      {
        title: "Trust and safety up front",
        body: "Clear standards, reporting, moderation, and PHI reminders are built into the experience.",
      },
    ],
  },
  demo: {
    eyebrow: "See it in motion",
    title: "PulseVerse in 35 seconds",
    body: "A quick look at stories, Circles, My Pulse, creator tools, and live connection — without leaving this page.",
    button: "Watch PulseVerse in 35 seconds",
    footnote: "Video loads only when you tap play — nothing autoplays on page load.",
  },
  download: {
    headline: "Join PulseVerse free.",
    body: "Early access is open on iOS and Android. Start in the mobile app for the full experience, then use the web beta when you want PulseVerse in the browser.",
    iosCta: "Join iOS beta",
    androidCta: "Join Android beta",
    webBetaCta: "Explore web beta",
    webBetaNote:
      "Web beta: Feed access today, with more surfaces rolling out. Mobile app is the best way to experience PulseVerse now.",
    supportLinkLabel: "Need help getting in?",
  },
  trustBand: {
    phiLead: "PHI & clinical safety:",
    phiBody:
      "PulseVerse is not a system of record for identifiable patient information. Never post PHI or individually identifiable patient details. See",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Community guidelines", href: "/community-guidelines" },
      { label: "Trust & safety", href: "/trust" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
};

const es: HomeLandingCopy = {
  ...en,
  hero: {
    ...en.hero,
    badge: "Plataforma social centrada en salud",
    headlineLines: ["Historias reales.", "Creadores reales.", "Comunidad real."],
    subhead:
      "PulseVerse reúne video social, Circles curados, perfiles My Pulse, conversaciones en vivo y herramientas para creadores — con raíces en salud y abierto a todos.",
    tagline: "Con raíz en salud. Impulsado por la comunidad. Para todos.",
    primaryCta: "Descargar gratis",
    secondaryCta: "Explorar beta web",
    demoCta: "Ver demo de 35 s",
    miniCards: [
      { title: "Ver y crear", body: "Descubre historias reales o comparte la tuya." },
      { title: "Unirte a Circles", body: "Encuentra tu gente en comunidades temáticas." },
      { title: "Armar My Pulse", body: "Muestra tu vibe, stats y lo que te mueve." },
      { title: "Ir en vivo", body: "Conecta en tiempo real y crece junto a otros." },
    ],
    webBetaNote:
      "App móvil disponible ahora. Beta web en expansión — empieza en la app para la experiencia completa.",
  },
  experience: {
    ...en.experience,
    title: "Explora la experiencia PulseVerse",
    subtitle: "Una plataforma para historias, comunidades, perfiles, creadores y conexión en vivo.",
  },
  whyDifferent: {
    ...en.whyDifferent,
    title: "Por qué PulseVerse se siente distinto",
  },
  download: {
    ...en.download,
    headline: "Únete a PulseVerse gratis.",
    iosCta: "Beta iOS",
    androidCta: "Beta Android",
    webBetaCta: "Explorar beta web",
    supportLinkLabel: "¿Necesitas ayuda para entrar?",
  },
};

export function getHomeLandingCopy(locale: Locale): HomeLandingCopy {
  return locale === "es" ? es : en;
}
