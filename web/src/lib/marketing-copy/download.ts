import type { Locale } from "@/lib/i18n";

export type DownloadPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  requestInvite: string;
  appStoreSoon: string;
  playSoon: string;
  iosBetaCta: string;
  /** Shown when NEXT_PUBLIC_ANDROID_OPEN_TESTING_URL is set */
  androidBetaCta: string;
  betaStepsTitle: string;
  betaSteps: readonly string[];
  faqHintBefore: string;
  faqLinkLabel: string;
  faqHintAfter: string;
  /** Alt text for the wide early-access hero infographic (phones + value props). */
  earlyAccessHeroAlt: string;
  footnote: string;
};

const copy: Record<Locale, DownloadPageCopy> = {
  en: {
    eyebrow: "Get the app",
    title: "Join early access",
    description:
      "PulseVerse is rolling out to clinicians, students, and allied teams. Request access — or open TestFlight / Play testing directly when your region is enabled.",
    requestInvite: "Request invite",
    appStoreSoon: "App Store (soon)",
    playSoon: "Google Play (soon)",
    iosBetaCta: "Join iOS beta",
    androidBetaCta: "Join Android beta",
    betaStepsTitle: "Install the beta",
    betaSteps: [
      "Install Apple TestFlight from the App Store on the iPhone, iPad, or Mac you’ll use for testing.",
      "On that device, tap Join iOS beta below, accept the invitation, then tap Install in TestFlight. (Android: use Join Android beta when available.)",
      "Open PulseVerse from TestFlight or Play and sign in with your approved account — Wi‑Fi helps on first launch.",
    ],
    faqHintBefore: "Questions?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "includes eligibility and regional rollout notes.",
    earlyAccessHeroAlt:
      "PulseVerse early access infographic: headline, three benefit cards, rolling-out status bar, iOS TestFlight and Android beta phone mockups with join buttons.",
    footnote:
      "Creator program: indicate on the contact form if you plan to host Live sessions or publish educational series — we'll prioritize moderator-ready cohorts.",
  },
  es: {
    eyebrow: "Descarga la app",
    title: "Únete al acceso anticipado",
    description:
      "PulseVerse llega a clínicos, estudiantes y equipos afines. Solicita acceso — o abre TestFlight / Play directamente cuando tu región esté activa.",
    requestInvite: "Solicitar invitación",
    appStoreSoon: "App Store (pronto)",
    playSoon: "Google Play (pronto)",
    iosBetaCta: "Beta iOS",
    androidBetaCta: "Beta Android",
    betaStepsTitle: "Instalar la beta",
    betaSteps: [
      "Instala Apple TestFlight desde la App Store en el iPhone, iPad o Mac que usarás para probar.",
      "En ese dispositivo, pulsa Beta iOS abajo, acepta la invitación y pulsa Instalar en TestFlight. (Android: Beta Android cuando exista.)",
      "Abre PulseVerse desde TestFlight o Play y entra con tu cuenta aprobada — Wi‑Fi ayuda en el primer arranque.",
    ],
    faqHintBefore: "¿Dudas?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "incluye elegibilidad y despliegue por región.",
    earlyAccessHeroAlt:
      "Infografía de acceso anticipado PulseVerse: titular, tres beneficios, barra de despliegue, mockups iOS TestFlight y Android con botones para unirse.",
    footnote:
      "Programa para creadores: indícalo en el formulario de contacto si planeas Lives o series educativas — priorizamos cohortes listas para moderación.",
  },
};

export function getDownloadPageCopy(locale: Locale): DownloadPageCopy {
  return copy[locale];
}
