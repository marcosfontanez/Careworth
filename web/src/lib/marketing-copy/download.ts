import type { Locale } from "@/lib/i18n";

export type DownloadPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  requestInvite: string;
  appStoreSoon: string;
  playSoon: string;
  footnote: string;
};

const copy: Record<Locale, DownloadPageCopy> = {
  en: {
    eyebrow: "Get the app",
    title: "Join early access",
    description:
      "PulseVerse is rolling out to clinicians, students, and allied teams. Request access — we'll follow up with TestFlight / Play tracks as regions open.",
    requestInvite: "Request invite",
    appStoreSoon: "App Store (soon)",
    playSoon: "Google Play (soon)",
    footnote:
      "Creator program: indicate on the contact form if you plan to host Live sessions or publish educational series — we'll prioritize moderator-ready cohorts.",
  },
  es: {
    eyebrow: "Descarga la app",
    title: "Únete al acceso anticipado",
    description:
      "PulseVerse llega a clínicos, estudiantes y equipos afines. Solicita acceso: te contactaremos con TestFlight / Play según abramos regiones.",
    requestInvite: "Solicitar invitación",
    appStoreSoon: "App Store (pronto)",
    playSoon: "Google Play (pronto)",
    footnote:
      "Programa para creadores: indícalo en el formulario de contacto si planeas Lives o series educativas — priorizamos cohortes listas para moderación.",
  },
};

export function getDownloadPageCopy(locale: Locale): DownloadPageCopy {
  return copy[locale];
}
