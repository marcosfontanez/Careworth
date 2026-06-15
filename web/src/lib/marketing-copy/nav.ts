import type { Locale } from "@/lib/i18n";

const linkDefs = [
  {
    id: "product",
    href: "/features",
    match: (p: string) => p === "/features" || (p.startsWith("/features/") && !p.startsWith("/features/circles") && !p.startsWith("/features/live")),
  },
  {
    id: "circles",
    href: "/features/circles",
    match: (p: string) => p.startsWith("/features/circles") || p.startsWith("/communities"),
  },
  {
    id: "creatorHub",
    href: "/features",
    match: (p: string) => p === "/features",
  },
  {
    id: "live",
    href: "/features/live",
    match: (p: string) => p.startsWith("/features/live"),
  },
  {
    id: "advertisers",
    href: "/advertisers",
    match: (p: string) => p.startsWith("/advertisers"),
  },
  {
    id: "support",
    href: "/support",
    match: (p: string) => p.startsWith("/support"),
  },
] as const;

type LinkId = (typeof linkDefs)[number]["id"];

const labels: Record<Locale, Record<LinkId, string>> = {
  en: {
    product: "Product",
    circles: "Circles",
    creatorHub: "Creator Hub",
    live: "Live",
    advertisers: "Advertisers",
    support: "Support",
  },
  es: {
    product: "Producto",
    circles: "Circles",
    creatorHub: "Creator Hub",
    live: "Live",
    advertisers: "Anunciantes",
    support: "Ayuda",
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
    join: "Download free",
    menuLabel: "Menu",
    myPulse: "My Pulse",
    staffPortal: "Staff portal",
    signOut: "Sign out",
  },
  es: {
    logIn: "Iniciar sesión",
    join: "Descargar gratis",
    menuLabel: "Menú",
    myPulse: "My Pulse",
    staffPortal: "Portal staff",
    signOut: "Cerrar sesión",
  },
};

export function getMarketingNavStrings(locale: Locale): MarketingNavStrings {
  return navStrings[locale];
}
