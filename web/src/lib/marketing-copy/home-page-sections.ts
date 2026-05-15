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

export type HomeSparksDiamondsCopy = {
  eyebrow: string;
  title: string;
  description: string;
  posterTag: string;
  posterCaption: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export type HomeBordersDropTile = {
  /** "Free monthly" / "Premium drop" / "Charity" / "Partner drop" */
  badge: string;
  title: string;
  body: string;
};

export type HomeBordersSurfaceTile = { surface: string; line: string };

export type HomeBordersCopy = {
  eyebrow: string;
  title: string;
  description: string;
  posterTag: string;
  posterCaption: string;
  /** Four monthly drop programs, in priority order. */
  drops: readonly HomeBordersDropTile[];
  /** Surfaces strip — where borders appear across the app. */
  surfacesEyebrow: string;
  surfaces: readonly HomeBordersSurfaceTile[];
  ctaPrimary: string;
  ctaSecondary: string;
};

export type HomePulseShopCopy = {
  eyebrow: string;
  title: string;
  description: string;
  bannerTag: string;
  bannerCaption: string;
  mobileTag: string;
  mobileCaption: string;
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
    description: "One profile. Fresh expression, always evolving.",
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
    description: "Un perfil. Expresión fresca, siempre en evolución.",
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
      "Specialties, study spaces, and the humor only insiders get.",
    posterTag: "Inside Circles",
    posterCaption: "Discover · Your Circles · Trending",
    ctaPrimary: "Explore Circles",
    ctaSecondary: "See all features",
  },
  es: {
    eyebrow: "Circles",
    title: "Tu especialidad tiene una sala.",
    description:
      "Especialidades, salas de estudio y el humor que solo entienden los de dentro.",
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
    title: "Create. Customize. Get rewarded.",
    description:
      "Every tool the healthcare creator economy needs — built into one hub.",
    posterTag: "Creator Hub",
    posterCaption: "Pulse Shop · Borders · Leaderboards · Live",
    /* Slim "credibility receipts" strip rendered as a single horizontal line under the banner.
       Each pillar is icon + short title only — full bodies live on the /features deep dives. */
    pillars: [
      { title: "License-verified", body: "" },
      { title: "Native store payments", body: "" },
      { title: "Limited drops", body: "" },
      { title: "Earned ≠ purchased", body: "" },
      { title: "Per-creator ledger", body: "" },
      { title: "HIPAA-aware moderation", body: "" },
    ],
    ctaPrimary: "See creator tools",
    ctaSecondary: "Open Live",
  },
  es: {
    eyebrow: "Economía de creador",
    title: "Crea. Personaliza. Sé recompensado.",
    description:
      "Todas las herramientas que necesita la economía de creador en sanidad — en un solo hub.",
    posterTag: "Creator Hub",
    posterCaption: "Pulse Shop · Bordes · Leaderboards · Live",
    pillars: [
      { title: "Verificado por licencia", body: "" },
      { title: "Pagos en tienda nativa", body: "" },
      { title: "Drops limitados", body: "" },
      { title: "Ganado ≠ comprado", body: "" },
      { title: "Libro por creador", body: "" },
      { title: "Moderación con HIPAA", body: "" },
    ],
    ctaPrimary: "Ver herramientas de creador",
    ctaSecondary: "Abrir Live",
  },
};

/* ------------------------------------------------------------------------- */
/*  Pulse Shop spotlight (NEW).                                              */
/*  Uses two paired marketing renders — cinematic featured-drop banner and   */
/*  the in-app shop UI — so the shop earns its own moment instead of being   */
/*  buried inside Creator Hub or Borders.                                    */
/* ------------------------------------------------------------------------- */

const pulseShop: Record<Locale, HomePulseShopCopy> = {
  en: {
    eyebrow: "Pulse Shop",
    title: "Premium borders. Real rewards.",
    description:
      "Limited drops, exclusive borders, and creator support — through your app store.",
    bannerTag: "Featured drop",
    bannerCaption: "Direct purchase · App Store / Google Play",
    mobileTag: "Inside Pulse Shop",
    mobileCaption: "Borders · Sparks · Gifts",
    ctaPrimary: "Open Pulse Shop",
    ctaSecondary: "What are Sparks?",
  },
  es: {
    eyebrow: "Pulse Shop",
    title: "Bordes premium. Recompensas reales.",
    description:
      "Drops limitados, bordes exclusivos y apoyo a creadores — desde tu tienda de apps.",
    bannerTag: "Drop destacado",
    bannerCaption: "Compra directa · App Store / Google Play",
    mobileTag: "Dentro de Pulse Shop",
    mobileCaption: "Bordes · Sparks · Regalos",
    ctaPrimary: "Abrir Pulse Shop",
    ctaSecondary: "¿Qué son los Sparks?",
  },
};

/* ------------------------------------------------------------------------- */
/*  Sparks & Diamonds — economy explainer (poster-led).                       */
/*  The infographic carries the full breakdown (Sparks, Diamonds, tiers,     */
/*  KYC). Section copy stays short so the poster is the lede.                 */
/* ------------------------------------------------------------------------- */

const sparksDiamonds: Record<Locale, HomeSparksDiamondsCopy> = {
  en: {
    eyebrow: "Sparks & Diamonds",
    title: "How connection turns into recognition.",
    description: "Sparks fuel connection. Diamonds reward impact.",
    posterTag: "Sparks & Diamonds · Explainer",
    posterCaption: "Send Sparks  ·  Earn Diamonds  ·  Unlock tiers",
    ctaPrimary: "See creator tools",
    ctaSecondary: "Visit Pulse Shop",
  },
  es: {
    eyebrow: "Sparks y Diamonds",
    title: "Cómo la conexión se convierte en reconocimiento.",
    description: "Los Sparks alimentan la conexión. Los Diamonds premian el impacto.",
    posterTag: "Sparks y Diamonds · Explicación",
    posterCaption: "Envía Sparks  ·  Gana Diamonds  ·  Desbloquea tiers",
    ctaPrimary: "Ver herramientas de creador",
    ctaSecondary: "Visita Pulse Shop",
  },
};

/* ------------------------------------------------------------------------- */
/*  Borders flagship — identity layer across the app (poster-led).            */
/*  The infographic does the heavy lifting; section copy stays headline-      */
/*  weight. Two compact strips below the poster: the four monthly drop        */
/*  programs, then the surfaces where a border actually appears.              */
/* ------------------------------------------------------------------------- */

const borders: Record<Locale, HomeBordersCopy> = {
  en: {
    eyebrow: "PulseVerse Borders",
    title: "Your identity. Everywhere.",
    description:
      "Borders frame your avatar everywhere — feed, circles, comments, profiles.",
    posterTag: "Borders · Overview",
    posterCaption: "Pulse Shop  ·  My Pulse  ·  Border Vault",
    drops: [
      {
        badge: "Free monthly",
        title: "Holiday border",
        body: "Free for the whole community. Claim it before the month ends.",
      },
      {
        badge: "Premium drop",
        title: "Premium monthly",
        body: "A limited monthly Pulse Shop border you own and equip.",
      },
      {
        badge: "Charity",
        title: "Charity border",
        body: "Support a cause — a portion of every claim goes to the partner.",
      },
      {
        badge: "Partner drop",
        title: "Sponsored partner",
        body: "Brought to you by a partner brand. Free, time-limited campaigns.",
      },
    ],
    surfacesEyebrow: "Seen across PulseVerse",
    surfaces: [
      { surface: "Feed posts", line: "Wraps the creator avatar on every video." },
      { surface: "Circles posts", line: "Frames the author across rooms and threads." },
      { surface: "Comments & profiles", line: "Visible everywhere your avatar appears." },
      { surface: "My Pulse Customize", line: "Equip what you've unlocked in two taps." },
      { surface: "Border Vault", line: "Browse, filter, and showcase your collection." },
      { surface: "Pulse Shop", line: "Discover this month's drops in one rail." },
    ],
    ctaPrimary: "Open Pulse Shop",
    ctaSecondary: "Customize your borders",
  },
  es: {
    eyebrow: "Bordes de PulseVerse",
    title: "Tu identidad. En todas partes.",
    description:
      "Los bordes enmarcan tu avatar en todas partes — feed, circles, comentarios, perfiles.",
    posterTag: "Bordes · Vista general",
    posterCaption: "Pulse Shop  ·  My Pulse  ·  Cofre de Bordes",
    drops: [
      {
        badge: "Mensual gratis",
        title: "Borde de temporada",
        body: "Gratis para toda la comunidad. Reclámalo antes de fin de mes.",
      },
      {
        badge: "Drop premium",
        title: "Premium mensual",
        body: "Un borde limitado del Pulse Shop que es tuyo y puedes equipar.",
      },
      {
        badge: "Caridad",
        title: "Borde benéfico",
        body: "Apoya una causa — parte de cada reclamo va a la organización aliada.",
      },
      {
        badge: "Drop aliado",
        title: "Marca patrocinadora",
        body: "Cortesía de una marca aliada. Campañas gratis y por tiempo limitado.",
      },
    ],
    surfacesEyebrow: "Visto en todo PulseVerse",
    surfaces: [
      { surface: "Posts del feed", line: "Enmarca al creador en cada vídeo." },
      { surface: "Posts de Circles", line: "Acompaña al autor en salas e hilos." },
      { surface: "Comentarios y perfiles", line: "Visible donde aparezca tu avatar." },
      { surface: "Personaliza My Pulse", line: "Equipa lo que has desbloqueado en dos toques." },
      { surface: "Cofre de Bordes", line: "Explora, filtra y luce tu colección." },
      { surface: "Pulse Shop", line: "Descubre los drops del mes en un solo carril." },
    ],
    ctaPrimary: "Abrir Pulse Shop",
    ctaSecondary: "Personalizar mis bordes",
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

export function getHomePulseShopCopy(locale: Locale): HomePulseShopCopy {
  return pulseShop[locale] ?? pulseShop.en;
}

export function getHomeSparksDiamondsCopy(locale: Locale): HomeSparksDiamondsCopy {
  return sparksDiamonds[locale] ?? sparksDiamonds.en;
}

export function getHomeBordersCopy(locale: Locale): HomeBordersCopy {
  return borders[locale] ?? borders.en;
}

export function getHomeTrustCopy(locale: Locale): HomeTrustCopy {
  return trust[locale] ?? trust.en;
}
