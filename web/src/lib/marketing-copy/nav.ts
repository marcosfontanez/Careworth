import type { Locale } from "@/lib/i18n";

const linkDefs = [
  {
    id: "features",
    href: "/features",
    match: (p: string) =>
      p === "/features" ||
      (p.startsWith("/features") &&
        !p.startsWith("/features/feed") &&
        !p.startsWith("/features/circles") &&
        !p.startsWith("/features/live") &&
        !p.startsWith("/features/pulse-page") &&
        !p.startsWith("/features/my-pulse")),
  },
  {
    id: "webApp",
    href: "/web-app",
    match: (p: string) => p === "/web-app" || p.startsWith("/web-app/"),
  },
  {
    id: "circles",
    href: "/features/circles",
    match: (p: string) => p.startsWith("/features/circles"),
  },
  {
    id: "live",
    href: "/features/live",
    match: (p: string) => p.startsWith("/features/live"),
  },
  {
    id: "pulsePage",
    href: "/features/pulse-page",
    match: (p: string) => p.startsWith("/features/pulse-page"),
  },
  {
    id: "support",
    href: "/support",
    match: (p: string) => p.startsWith("/support"),
  },
  {
    id: "advertisers",
    href: "/advertisers",
    match: (p: string) => p.startsWith("/advertisers"),
  },
] as const;

type LinkId = (typeof linkDefs)[number]["id"];

const labels: Record<Locale, Record<LinkId, string>> = {
  en: {
    features: "Features",
    webApp: "Web app",
    circles: "Circles",
    live: "Live",
    pulsePage: "Pulse Page",
    support: "Support",
    advertisers: "Advertisers",
  },
  es: {
    features: "Funciones",
    webApp: "App web",
    circles: "Circles",
    live: "Live",
    pulsePage: "Pulse Page",
    support: "Ayuda",
    advertisers: "Anunciantes",
  },
};

export type MarketingCenterLink = {
  href: string;
  label: string;
  match: (path: string) => boolean;
};

export function getMarketingCenterLinks(locale: Locale): MarketingCenterLink[] {
  return linkDefs.map((d) => ({
    href: d.href,
    label: labels[locale][d.id],
    match: d.match,
  }));
}

export type MarketingNavStrings = {
  logIn: string;
  join: string;
  menuLabel: string;
  myPulse: string;
  staffPortal: string;
  signOut: string;
};

const navStrings: Record<Locale, MarketingNavStrings> = {
  en: {
    logIn: "Log in",
    join: "Join PulseVerse",
    menuLabel: "Menu",
    myPulse: "My Pulse",
    staffPortal: "Staff",
    signOut: "Sign out",
  },
  es: {
    logIn: "Iniciar sesión",
    join: "Unirte a PulseVerse",
    menuLabel: "Menú",
    myPulse: "My Pulse",
    staffPortal: "Personal",
    signOut: "Cerrar sesión",
  },
};

export function getMarketingNavStrings(locale: Locale): MarketingNavStrings {
  return navStrings[locale];
}
