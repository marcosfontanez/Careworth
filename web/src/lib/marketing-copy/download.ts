import type { Locale } from "@/lib/i18n";

export type DownloadPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  requestInvite: string;
  appStoreSoon: string;
  playSoon: string;
  /** Shown when NEXT_PUBLIC_IOS_TESTFLIGHT_URL is set */
  iosBetaCta: string;
  /** Shown when NEXT_PUBLIC_ANDROID_OPEN_TESTING_URL is set */
  androidBetaCta: string;
  betaStepsTitle: string;
  betaSteps: readonly string[];
  faqHintBefore: string;
  faqLinkLabel: string;
  faqHintAfter: string;
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
      "Use the Join iOS beta or Join Android beta button for your device — iOS opens in TestFlight when the link is configured.",
      "Accept the PulseVerse beta invite and complete the store install flow.",
      "Open the app from TestFlight or Play; sign in with your approved account and use Wi‑Fi for the first launch when possible.",
    ],
    faqHintBefore: "Questions?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "includes eligibility and regional rollout notes.",
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
      "Usa Beta iOS o Beta Android según tu dispositivo — iOS abre TestFlight si el enlace está configurado.",
      "Acepta la invitación a la beta de PulseVerse y completa la instalación desde la tienda.",
      "Abre la app desde TestFlight o Play; entra con tu cuenta aprobada y usa Wi‑Fi en el primer arranque si puedes.",
    ],
    faqHintBefore: "¿Dudas?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "incluye elegibilidad y despliegue por región.",
    footnote:
      "Programa para creadores: indícalo en el formulario de contacto si planeas Lives o series educativas — priorizamos cohortes listas para moderación.",
  },
};

export function getDownloadPageCopy(locale: Locale): DownloadPageCopy {
  return copy[locale];
}
