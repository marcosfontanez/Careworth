import type { Locale } from "@/lib/i18n";

export type HomePillar = { title: string; body: string };

export type HomeProductOverviewCopy = {
  eyebrow: string;
  title: string;
  description: string;
  pillars: readonly HomePillar[];
};

export type HomePulseDuoCopy = {
  eyebrow: string;
  title: string;
  pulsePageLabel: string;
  myPulseLabel: string;
  pulsePage: string;
  myPulse: string;
  links: readonly { label: string; href: string }[];
};

export type HomeStatsSplitCopy = {
  titleLead: string;
  titleCare: string;
  titleMid: string;
  titleEmpower: string;
  description: string;
  statLabels: readonly [string, string, string, string];
};

export type HomeTestimonial = { quote: string; role: string };

export type HomeTestimonialsCopy = {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly HomeTestimonial[];
};

export type MyPulseSlot = { type: string; preview: string };

export type HomeMyPulseSignatureCopy = {
  eyebrow: string;
  title: string;
  description: string;
  slotsCaption: string;
  subheading: string;
  bullets: readonly { lead: string; rest: string }[];
  ctaPrimary: string;
  ctaSecondary: string;
  slots: readonly MyPulseSlot[];
};

const productOverview: Record<Locale, HomeProductOverviewCopy> = {
  en: {
    eyebrow: "Product overview",
    title: "Built for healthcare life — not another corporate graph.",
    description:
      "PulseVerse stitches together what clinicians use after the pager stops: short-form Feed culture, premium Circles, discovery-first Live, and Pulse Page identity with Current Vibe, My Pulse, and Media Hub.",
    pillars: [
      {
        title: "Culture-first",
        body: "Humor, grief, education, and night-shift solidarity — moderated with clinical context in mind.",
      },
      {
        title: "Creator-ready",
        body: "Hosts and storytellers get formats people already love — short video, live AMA, threaded Circles.",
      },
      {
        title: "Trust by design",
        body: "Reports, appeals, and live tooling built for a licensed audience — not an anything-goes feed.",
      },
    ],
  },
  es: {
    eyebrow: "Panorama del producto",
    title: "Pensada para la vida sanitaria — no para otro grafo corporativo.",
    description:
      "PulseVerse une lo que los clínicos usan cuando cesa el busca: cultura en Feed breve, Circles premium, Live pensado para descubrir, e identidad en Pulse Page con Current Vibe, My Pulse y Media Hub.",
    pillars: [
      {
        title: "Cultura primero",
        body: "Humor, duelo, formación y compañía en el turno nocturno — con moderación consciente del contexto clínico.",
      },
      {
        title: "Lista para creadores",
        body: "Anfitriones y narradores usan formatos que la gente ya quiere — vídeo breve, AMA en vivo, Circles en hilo.",
      },
      {
        title: "Confianza en el diseño",
        body: "Reportes, apelaciones y herramientas de vivo pensadas para un público colegiado — no un feed sin reglas.",
      },
    ],
  },
};

const pulseDuo: Record<Locale, HomePulseDuoCopy> = {
  en: {
    eyebrow: "Pulse Page · My Pulse",
    title: "One identity home — many ways to show up.",
    pulsePageLabel: "Pulse Page",
    myPulseLabel: "My Pulse",
    pulsePage:
      "Pulse Page is your professional and personal hub: verification, creator-style layout, Current Vibe (a premium mini music player), Media Hub, and the social energy of a living profile.",
    myPulse:
      "My Pulse sits on your Pulse Page as a rolling feed of your latest five updates — Thought, Clip, Link, or Pics — newest first, designed to stay fresh instead of turning into a stale wall.",
    links: [
      { label: "Pulse Page", href: "/features/pulse-page" },
      { label: "My Pulse", href: "/features/my-pulse" },
    ],
  },
  es: {
    eyebrow: "Pulse Page · My Pulse",
    title: "Una casa de identidad — muchas formas de aparecer.",
    pulsePageLabel: "Pulse Page",
    myPulseLabel: "My Pulse",
    pulsePage:
      "Pulse Page es tu centro profesional y personal: verificación, maquetación estilo creador, Current Vibe (reproductor musical mini premium), Media Hub y la energía social de un perfil vivo.",
    myPulse:
      "My Pulse vive en tu Pulse Page como un feed con tus cinco novedades más recientes — Thought, Clip, Link o Pics — primero lo nuevo, pensado para mantenerse fresco y no convertirse en un muro obsoleto.",
    links: [
      { label: "Pulse Page", href: "/features/pulse-page" },
      { label: "My Pulse", href: "/features/my-pulse" },
    ],
  },
};

const statsSplit: Record<Locale, HomeStatsSplitCopy> = {
  en: {
    titleLead: "A community that",
    titleCare: "cares.",
    titleMid: "A network that",
    titleEmpower: "empowers.",
    description:
      "PulseVerse grows where clinicians already show up — with rooms, live moments, and profiles worth revisiting.",
    statLabels: ["Healthcare professionals", "Countries", "Active Circles", "Live sessions hosted"],
  },
  es: {
    titleLead: "Una comunidad que",
    titleCare: "importa.",
    titleMid: "Una red que",
    titleEmpower: "empodera.",
    description:
      "PulseVerse crece donde ya están los clínicos — con salas, momentos en vivo y perfiles que merece la pena revisitar.",
    statLabels: ["Profesionales de la salud", "Países", "Circles activos", "Sesiones Live alojadas"],
  },
};

const testimonials: Record<Locale, HomeTestimonialsCopy> = {
  en: {
    eyebrow: "Social proof",
    title: "Voices from the floor",
    description: "Placeholders from pilot cohorts — swap for verified testimonials when you launch.",
    items: [
      { quote: "Finally somewhere that feels like our unit chat — but with room to breathe.", role: "ICU RN · anonymized beta" },
      { quote: "Live AMAs hit different when the audience actually speaks the same language.", role: "Cards fellow · pilot cohort" },
      { quote: "We needed culture infrastructure, not another wellness PDF.", role: "PharmD · early access" },
    ],
  },
  es: {
    eyebrow: "Prueba social",
    title: "Voces del territorio",
    description: "Textos de ejemplo de pilotos — sustituye por testimonios verificados al lanzar.",
    items: [
      { quote: "Por fin un sitio que se parece al chat de la unidad — pero con espacio para respirar.", role: "Enf. UCI · beta anónima" },
      { quote: "Los AMA en vivo cambian cuando el público habla el mismo idioma de verdad.", role: "Adjunto de cards · piloto" },
      { quote: "Necesitábamos infraestructura cultural, no otro PDF de bienestar.", role: "Farmacéutico clínico · acceso anticipado" },
    ],
  },
};

const myPulseSignature: Record<Locale, HomeMyPulseSignatureCopy> = {
  en: {
    eyebrow: "My Pulse",
    title: "Keep your Pulse fresh — five slots, zero clutter.",
    description:
      "Thought. Clip. Link. Pics. Only your newest five updates stay visible on Pulse Page; add a sixth and the oldest quietly rolls off so your identity always reads as current.",
    slotsCaption: "Newest first · illustrative order",
    subheading: "Built for healthcare identity, not dashboards.",
    bullets: [
      {
        lead: "Clips",
        rest: " come from PulseVerse — your posts or moments you saved from the Feed.",
      },
      {
        lead: "Links",
        rest: " head outward with optional commentary so context travels with the URL.",
      },
      {
        lead: "Pics",
        rest: " capture day-to-day human moments the way clinicians already share off-shift.",
      },
    ],
    ctaPrimary: "How My Pulse works",
    ctaSecondary: "See Pulse Page",
    slots: [
      { type: "Thought", preview: "Grateful for the team that stayed late." },
      { type: "Clip", preview: "From Feed · cath lab teaching moment" },
      { type: "Link", preview: "New guideline + why it matters on our floor" },
      { type: "Pics", preview: "Coffee before rounds (de-identified)" },
      { type: "Thought", preview: "Oldest visible slot — adding one more drops this item" },
    ],
  },
  es: {
    eyebrow: "My Pulse",
    title: "Mantén tu Pulse fresco — cinco huecos, cero desorden.",
    description:
      "Thought. Clip. Link. Pics. Solo tus cinco novedades más recientes se ven en Pulse Page; al publicar la sexta, la más antigua sale con calma para que tu identidad siga sonando actual.",
    slotsCaption: "Primero lo nuevo · orden ilustrativo",
    subheading: "Pensado para identidad sanitaria, no para cuadros de mando.",
    bullets: [
      {
        lead: "Clips",
        rest: " vienen de PulseVerse: tus publicaciones o momentos guardados del Feed.",
      },
      {
        lead: "Links",
        rest: " salen hacia fuera con comentario opcional para que el contexto viaje con la URL.",
      },
      {
        lead: "Pics",
        rest: " recogen momentos humanos del día a día como ya se comparten fuera de turno.",
      },
    ],
    ctaPrimary: "Cómo funciona My Pulse",
    ctaSecondary: "Ver Pulse Page",
    slots: [
      { type: "Thought", preview: "Agradecida al equipo que se quedó hasta tarde." },
      { type: "Clip", preview: "Del Feed · momento docente en el laboratorio de cateterismo" },
      { type: "Link", preview: "Nueva guía + por qué importa en nuestra planta" },
      { type: "Pics", preview: "Café antes de rondas (sin identificación)" },
      { type: "Thought", preview: "Hueco visible más antiguo — al añadir otro, este sale" },
    ],
  },
};

export function getHomeProductOverviewCopy(locale: Locale): HomeProductOverviewCopy {
  return productOverview[locale] ?? productOverview.en;
}

export function getHomePulseDuoCopy(locale: Locale): HomePulseDuoCopy {
  return pulseDuo[locale] ?? pulseDuo.en;
}

export function getHomeStatsSplitCopy(locale: Locale): HomeStatsSplitCopy {
  return statsSplit[locale] ?? statsSplit.en;
}

export function getHomeTestimonialsCopy(locale: Locale): HomeTestimonialsCopy {
  return testimonials[locale] ?? testimonials.en;
}

export function getHomeMyPulseSignatureCopy(locale: Locale): HomeMyPulseSignatureCopy {
  return myPulseSignature[locale] ?? myPulseSignature.en;
}
