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
  webBetaCta: string;
  betaStepsTitle: string;
  betaSteps: readonly string[];
  faqHintBefore: string;
  faqLinkLabel: string;
  faqHintAfter: string;
  /** Alt text for the wide early-access hero infographic (phones + value props). */
  earlyAccessHeroAlt: string;
  footnote: string;
  supportLinkLabel: string;
  availabilityNote: string;
  qrTitle: string;
  qrHint: string;
  deviceHintIos: string;
  deviceHintAndroid: string;
  deviceHintDesktop: string;
};

const copy: Record<Locale, DownloadPageCopy> = {
  en: {
    eyebrow: "Get the app",
    title: "Join PulseVerse free.",
    description:
      "Early access is open on iOS and Android. Start in the mobile app for the full experience, then use the web beta when you want PulseVerse in the browser.",
    requestInvite: "Request invite",
    appStoreSoon: "App Store (soon)",
    playSoon: "Google Play (soon)",
    iosBetaCta: "Join iOS beta",
    androidBetaCta: "Join Android beta",
    webBetaCta: "Explore web beta",
    betaStepsTitle: "Install the beta",
    betaSteps: [
      "iPhone / iPad: install Apple TestFlight from the App Store, tap Join iOS beta below, accept the invite, then Install in TestFlight.",
      "Android: tap Join Android beta below, opt in on Google Play, then Install from the Play Store listing.",
      "Open PulseVerse and sign in with your account — Wi‑Fi helps on first launch.",
    ],
    faqHintBefore: "Questions?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "includes eligibility and regional rollout notes.",
    earlyAccessHeroAlt:
      "PulseVerse early access infographic: headline, three benefit cards, rolling-out status bar, iOS TestFlight and Android beta phone mockups with join buttons.",
    footnote: "Mobile app available now. Web beta expanding.",
    supportLinkLabel: "Need help getting in?",
    availabilityNote:
      "Web beta: Feed is the main browser surface today — more areas roll out over time. Mobile is still the best full PulseVerse experience.",
    qrTitle: "Scan to download",
    qrHint: "Opens pulseverse.app/download on your phone.",
    deviceHintIos: "On iPhone or iPad? Tap Join iOS beta — TestFlight handles the rest.",
    deviceHintAndroid: "On Android? Tap Join Android beta to opt in on Google Play.",
    deviceHintDesktop: "On desktop? Use both beta links below, or scan the QR code with your phone.",
  },
  es: {
    eyebrow: "Descarga la app",
    title: "Únete a PulseVerse gratis.",
    description:
      "El acceso anticipado está abierto en iOS y Android. Empieza en la app móvil para la experiencia completa y usa la beta web cuando quieras PulseVerse en el navegador.",
    requestInvite: "Solicitar invitación",
    appStoreSoon: "App Store (pronto)",
    playSoon: "Google Play (pronto)",
    iosBetaCta: "Beta iOS",
    androidBetaCta: "Beta Android",
    webBetaCta: "Explorar beta web",
    betaStepsTitle: "Instalar la beta",
    betaSteps: [
      "iPhone / iPad: instala Apple TestFlight desde la App Store, pulsa Beta iOS abajo, acepta la invitación e Instalar en TestFlight.",
      "Android: pulsa Beta Android abajo, apúntate en Google Play y luego Instalar desde la ficha de Play Store.",
      "Abre PulseVerse e inicia sesión — Wi‑Fi ayuda en el primer arranque.",
    ],
    faqHintBefore: "¿Dudas?",
    faqLinkLabel: "FAQ",
    faqHintAfter: "incluye elegibilidad y despliegue por región.",
    earlyAccessHeroAlt:
      "Infografía de acceso anticipado PulseVerse: titular, tres beneficios, barra de despliegue, mockups iOS TestFlight y Android con botones para unirse.",
    footnote: "App móvil disponible ahora. Beta web en expansión.",
    supportLinkLabel: "¿Necesitas ayuda para entrar?",
    availabilityNote:
      "Beta web: Feed es la superficie principal en el navegador hoy — más áreas llegarán con el tiempo. El móvil sigue siendo la mejor experiencia completa.",
    qrTitle: "Escanea para descargar",
    qrHint: "Abre pulseverse.app/download en tu teléfono.",
    deviceHintIos: "¿En iPhone o iPad? Pulsa Beta iOS — TestFlight hace el resto.",
    deviceHintAndroid: "¿En Android? Pulsa Beta Android para apuntarte en Google Play.",
    deviceHintDesktop: "¿En escritorio? Usa ambos enlaces beta abajo o escanea el código QR con tu teléfono.",
  },
};

export function getDownloadPageCopy(locale: Locale): DownloadPageCopy {
  return copy[locale];
}
