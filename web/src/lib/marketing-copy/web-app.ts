import type { Locale } from "@/lib/i18n";

export type WebAppFrameCopy = {
  iframeTitle: string;
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
      noUrlTitle: "Web app URL not configured",
      noUrlBody:
        "In Vercel: open your PulseVerse web project → Settings → Environment Variables. Add NEXT_PUBLIC_EXPO_WEB_APP_URL with your hosted Expo web URL (no trailing slash), e.g. https://app.pulseverse.app, for Production. Save, then Deployments → Redeploy. Auth inside the iframe may also need this domain in Supabase URL configuration.",
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
      noUrlTitle: "URL de la app web no configurada",
      noUrlBody:
        "En Vercel: Settings → Environment Variables. Añade NEXT_PUBLIC_EXPO_WEB_APP_URL (URL del build web de Expo, sin barra final) para Production. Guarda y vuelve a desplegar.",
    },
  },
};

export function getWebAppPageCopy(locale: Locale): WebAppPageCopy {
  return copy[locale];
}
