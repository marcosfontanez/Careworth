import type { Locale } from "@/lib/i18n";

export type WebAppFrameCopy = {
  iframeTitle: string;
  openNewTab: string;
  hint: string;
  noUrlTitle: string;
  noUrlBody: string;
};

export type WebAppPageCopy = {
  metaTitle: string;
  metaDescription: string;
  kicker: string;
  title: string;
  subtitle: string;
  accountCtaBefore: string;
  accountCtaLink: string;
  accountCtaAfter: string;
  frame: WebAppFrameCopy;
};

const copy: Record<Locale, WebAppPageCopy> = {
  en: {
    metaTitle: "PulseVerse in your browser",
    metaDescription:
      "Use PulseVerse on a desktop or laptop in a phone-sized view—sign in, scroll, and explore without installing the app.",
    kicker: "Desktop",
    title: "PulseVerse in your browser",
    subtitle:
      "We wrap the mobile layout in a focused phone frame so spacing, typography, and video feel right on a large monitor—closer to how the app is designed than stretching a single column edge to edge.",
    accountCtaBefore: "",
    accountCtaLink: "Sign in",
    accountCtaAfter:
      " with your PulseVerse email to open your web profile (My Pulse). Use the frame below for the full mobile web app.",
    frame: {
      iframeTitle: "PulseVerse web app",
      openNewTab: "Open full tab",
      hint: "Tip: if something feels tight, use Open full tab for the whole window. Camera and mic work best when the app matches your PulseVerse web domain in Supabase settings.",
      noUrlTitle: "Web app URL not configured",
      noUrlBody:
        "Set NEXT_PUBLIC_EXPO_WEB_APP_URL in your deployment to the hosted Expo web build (for example https://app.pulseverse.app). Then redeploy this site.",
    },
  },
  es: {
    metaTitle: "PulseVerse en tu navegador",
    metaDescription:
      "Usa PulseVerse en un ordenador con una vista tipo móvil: inicia sesión y navega sin instalar la app.",
    kicker: "Escritorio",
    title: "PulseVerse en tu navegador",
    subtitle:
      "Mostramos el diseño móvil dentro de un marco tipo teléfono para que tipografía y vídeo se vean bien en pantallas grandes.",
    accountCtaBefore: "",
    accountCtaLink: "Iniciar sesión",
    accountCtaAfter: " con tu correo de PulseVerse para ver tu perfil web (My Pulse). Usa el marco de abajo para la app web.",
    frame: {
      iframeTitle: "PulseVerse (web)",
      openNewTab: "Abrir en pestaña",
      hint: "Si algo se ve justo, usa Abrir en pestaña. Cámara y micrófono funcionan mejor con el dominio web correcto en Supabase.",
      noUrlTitle: "URL de la app web no configurada",
      noUrlBody:
        "Configura NEXT_PUBLIC_EXPO_WEB_APP_URL en el despliegue con la URL del build web de Expo y vuelve a publicar.",
    },
  },
};

export function getWebAppPageCopy(locale: Locale): WebAppPageCopy {
  return copy[locale];
}
