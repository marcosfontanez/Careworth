import type { Locale } from "@/lib/i18n";

export type MePageCopy = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  bioFallback: string;
  pulseScore: string;
  followers: string;
  following: string;
  openInBrowserApp: string;
  openProfileInApp: string;
  browseWebApp: string;
  signInDifferent: string;
};

const copy: Record<Locale, MePageCopy> = {
  en: {
    title: "My Pulse",
    metaTitle: "My Pulse",
    metaDescription: "Your PulseVerse profile on the web.",
    bioFallback: "No intro yet — add one in the app under Customize My Pulse.",
    pulseScore: "Pulse Score",
    followers: "Followers",
    following: "Following",
    openInBrowserApp: "Open mobile web app",
    openProfileInApp: "Open my profile in app",
    browseWebApp: "Browse in phone view",
    signInDifferent: "Sign in as someone else",
  },
  es: {
    title: "My Pulse",
    metaTitle: "My Pulse",
    metaDescription: "Tu perfil PulseVerse en la web.",
    bioFallback: "Sin presentación todavía — añádela en la app.",
    pulseScore: "Pulse Score",
    followers: "Seguidores",
    following: "Siguiendo",
    openInBrowserApp: "Abrir app web móvil",
    openProfileInApp: "Abrir mi perfil en la app",
    browseWebApp: "Ver en vista móvil",
    signInDifferent: "Iniciar sesión con otra cuenta",
  },
};

export function getMePageCopy(locale: Locale): MePageCopy {
  return copy[locale];
}
