import type { Locale } from "@/lib/i18n";

const linkDefs = [
  {
    id: "features",
    href: "/features",
    match: (p: string) => p === "/features" || p.startsWith("/features"),
  },
  {
    id: "webApp",
    href: "/web-app",
    match: (p: string) => p === "/web-app" || p.startsWith("/web-app/"),
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
    features: "Product",
    webApp: "Web Beta",
    support: "Support",
    advertisers: "Advertisers",
  },
  es: {
    features: "Producto",
    webApp: "Web Beta",
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
    logIn: "Sign in",
    join: "Join Beta",
    menuLabel: "Menu",
    myPulse: "My Pulse",
    staffPortal: "Staff portal",
    signOut: "Sign out",
  },
  es: {
    logIn: "Iniciar sesión",
    join: "Unirte a la beta",
    menuLabel: "Menú",
    myPulse: "My Pulse",
    staffPortal: "Portal staff",
    signOut: "Cerrar sesión",
  },
};

export function getMarketingNavStrings(locale: Locale): MarketingNavStrings {
  return navStrings[locale];
}
