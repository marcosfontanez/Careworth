import type { Locale } from "@/lib/i18n";

export type HomePillar = { title: string; body: string };

export type HomePulseDuoCopy = {
  eyebrow: string;
  title: string;
  description: string;
  posterTag: string;
  posterCaption: string;
  links: readonly { label: string; href: string }[];
};

export type HomeSignatureOverviewItem = { title: string; kicker: string };

export type HomeSignatureOverviewCopy = {
  eyebrow: string;
  items: readonly HomeSignatureOverviewItem[];
};

export type HomeCirclesSpotlightCopy = {
  eyebrow: string;
  title: string;
  description: string;
  posterTag: string;
  posterCaption: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export type HomeCreatorHubCopy = {
  eyebrow: string;
  title: string;
  description: string;
  posterTag: string;
  posterCaption: string;
  pillars: readonly HomePillar[];
  ctaPrimary: string;
  ctaSecondary: string;
};

export type HomeTrustVoice = { quote: string; role: string };

export type HomeTrustCopy = {
  eyebrow: string;
  title: string;
  description: string;
  commitments: readonly HomePillar[];
  voice: HomeTrustVoice;
  disclaimer: string;
};

/* ------------------------------------------------------------------------- */
/*  Signature overview — compact 4-icon strip directly under the hero.        */
/*  Title + 3-word kicker only. No body copy (kept on the home).              */
/* ------------------------------------------------------------------------- */

const signatureOverview: Record<Locale, HomeSignatureOverviewCopy> = {
  en: {
    eyebrow: "What makes it PulseVerse",
    items: [
      { title: "Verified by license", kicker: "No fake-pro accounts" },
      { title: "Built for the floor", kicker: "Shift-aware, not sterile" },
      { title: "Creators rewarded", kicker: "Borders, gifting, leaderboards" },
    ],
  },
  es: {
    eyebrow: "Lo que la hace PulseVerse",
    items: [
      { title: "Verificado por licencia", kicker: "Sin cuentas falsas" },
      { title: "Hecho para la planta", kicker: "Consciente del turno" },
      { title: "Creadores recompensados", kicker: "Bordes, regalos, leaderboards" },
    ],
  },
};

/* ------------------------------------------------------------------------- */
/*  Pulse Page vs My Pulse explainer.                                        */
/* ------------------------------------------------------------------------- */

const pulseDuo: Record<Locale, HomePulseDuoCopy> = {
  en: {
    eyebrow: "Pulse Page · My Pulse",
    title: "One identity home. Two ways to show up.",
    description: "Pulse Page is the room. My Pulse is what's playing in it.",
    posterTag: "Side-by-side",
    posterCaption: "Live product render · iPhone",
    links: [
      { label: "Pulse Page", href: "/features/pulse-page" },
      { label: "My Pulse", href: "/features/my-pulse" },
    ],
  },
  es: {
    eyebrow: "Pulse Page · My Pulse",
    title: "Un hogar de identidad. Dos formas de aparecer.",
    description: "Pulse Page es la sala. My Pulse es lo que suena dentro.",
    posterTag: "Lado a lado",
    posterCaption: "Renderizado real · iPhone",
    links: [
      { label: "Pulse Page", href: "/features/pulse-page" },
      { label: "My Pulse", href: "/features/my-pulse" },
    ],
  },
};

/* ------------------------------------------------------------------------- */
/*  Circles spotlight.                                                       */
/* ------------------------------------------------------------------------- */

const circlesSpotlight: Record<Locale, HomeCirclesSpotlightCopy> = {
  en: {
    eyebrow: "Circles",
    title: "Your specialty has a room.",
    description:
      "Specialties, study spaces, identity rooms, and the humor only insiders get — not a noisy global feed.",
    posterTag: "Inside Circles",
    posterCaption: "Discover · Your Circles · Trending",
    ctaPrimary: "Explore Circles",
    ctaSecondary: "See all features",
  },
  es: {
    eyebrow: "Circles",
    title: "Tu especialidad tiene una sala.",
    description:
      "Especialidades, salas de estudio, espacios de identidad y el humor que solo entienden los de dentro — no un feed global ruidoso.",
    posterTag: "Dentro de Circles",
    posterCaption: "Descubre · Tus Circles · Tendencias",
    ctaPrimary: "Explorar Circles",
    ctaSecondary: "Ver todas las funciones",
  },
};

/* ------------------------------------------------------------------------- */
/*  Creator / Live / Shop / Rewards section.                                 */
/* ------------------------------------------------------------------------- */

const creatorHub: Record<Locale, HomeCreatorHubCopy> = {
  en: {
    eyebrow: "Creator economy",
    title: "Why creators stay.",
    description:
      "The creator hub itself is on the right — these are the receipts behind it.",
    posterTag: "Creator Hub",
    posterCaption: "Pulse Shop · Borders · Leaderboards",
    pillars: [
      { title: "License-verified", body: "Creator features unlock after license verification." },
      { title: "Native store payments", body: "Pulse Shop runs through Apple and Google. No off-platform funnels." },
      { title: "Limited drops, real scarcity", body: "Time-limited borders aren't re-released. Once gone, gone." },
      { title: "Earned ≠ purchased", body: "Sparks earned through gifting stay separate from purchased credits." },
      { title: "Per-creator ledger", body: "Every gift, tip, and tier change tracked per creator." },
      { title: "HIPAA-aware moderation", body: "Same lens on Live, Circles, and Pulse Page." },
    ],
    ctaPrimary: "See creator tools",
    ctaSecondary: "Open Live",
  },
  es: {
    eyebrow: "Economía de creador",
    title: "Por qué se quedan los creadores.",
    description:
      "El propio Creator Hub está a la derecha — esto son los recibos detrás.",
    posterTag: "Creator Hub",
    posterCaption: "Pulse Shop · Bordes · Leaderboards",
    pillars: [
      { title: "Verificado por licencia", body: "Las funciones de creador se desbloquean tras verificar la licencia." },
      { title: "Pagos en tienda nativa", body: "Pulse Shop usa Apple y Google. Sin embudos externos." },
      { title: "Drops limitados, escasez real", body: "Los bordes limitados no se reeditan. Cuando se van, se van." },
      { title: "Ganado ≠ comprado", body: "Los Sparks ganados con regalos se mantienen separados del crédito comprado." },
      { title: "Libro mayor por creador", body: "Cada regalo, propina y cambio de tier queda registrado por creador." },
      { title: "Moderación con conciencia HIPAA", body: "El mismo criterio en Live, Circles y Pulse Page." },
    ],
    ctaPrimary: "Ver herramientas de creador",
    ctaSecondary: "Abrir Live",
  },
};

/* ------------------------------------------------------------------------- */
/*  Trust / proof section — slimmed: commitments + ONE voice.                 */
/* ------------------------------------------------------------------------- */

const trust: Record<Locale, HomeTrustCopy> = {
  en: {
    eyebrow: "Built for healthcare life",
    title: "Designed with the floor in mind — not a press release.",
    description:
      "Privacy, moderation, and the creator economy aren't afterthoughts here. They're the product.",
    commitments: [
      { title: "Healthcare context", body: "Surfaces and moderation tuned for licensed users. HIPAA-aware reporting." },
      { title: "Privacy by design", body: "Identity, verification, and visibility live in one place — yours to control." },
      { title: "Honest safety", body: "Clear standards, fast appeals, and human review on the hardest reports." },
      { title: "Creators keep theirs", body: "Pulse Shop, gifting, and rewards built so creators keep what they earn." },
    ],
    voice: {
      quote: "Finally somewhere that feels like our unit chat — with room to breathe.",
      role: "ICU RN · early access",
    },
    disclaimer: "Quote from an early-access participant. We don't run paid testimonials.",
  },
  es: {
    eyebrow: "Pensada para la vida sanitaria",
    title: "Diseñada con la planta en mente — no para una nota de prensa.",
    description:
      "Privacidad, moderación y economía de creador no son extras aquí. Son el producto.",
    commitments: [
      { title: "Contexto sanitario", body: "Superficies y moderación pensadas para usuarios colegiados. Reportes con conciencia de HIPAA." },
      { title: "Privacidad desde el diseño", body: "Identidad, verificación y visibilidad en un mismo sitio — tuyas para controlar." },
      { title: "Seguridad honesta", body: "Estándares claros, apelaciones rápidas y revisión humana en los reportes más duros." },
      { title: "El creador conserva lo suyo", body: "Pulse Shop, regalos y recompensas pensados para que los creadores conserven lo que ganan." },
    ],
    voice: {
      quote: "Por fin un sitio que se parece al chat de la unidad — con espacio para respirar.",
      role: "Enf. UCI · acceso anticipado",
    },
    disclaimer: "Frase de un participante en acceso anticipado. No publicamos testimonios pagados.",
  },
};

/* ------------------------------------------------------------------------- */
/*  Exports                                                                  */
/* ------------------------------------------------------------------------- */

export function getHomeSignatureOverviewCopy(locale: Locale): HomeSignatureOverviewCopy {
  return signatureOverview[locale] ?? signatureOverview.en;
}

export function getHomePulseDuoCopy(locale: Locale): HomePulseDuoCopy {
  return pulseDuo[locale] ?? pulseDuo.en;
}

export function getHomeCirclesSpotlightCopy(locale: Locale): HomeCirclesSpotlightCopy {
  return circlesSpotlight[locale] ?? circlesSpotlight.en;
}

export function getHomeCreatorHubCopy(locale: Locale): HomeCreatorHubCopy {
  return creatorHub[locale] ?? creatorHub.en;
}

export function getHomeTrustCopy(locale: Locale): HomeTrustCopy {
  return trust[locale] ?? trust.en;
}
