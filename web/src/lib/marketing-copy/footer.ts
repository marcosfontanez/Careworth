import type { Locale } from "@/lib/i18n";

export type FooterColumn = {
  title: string;
  links: { href: string; label: string }[];
};

export type FooterCopy = {
  columns: FooterColumn[];
  stayConnectedTitle: string;
  stayConnectedBlurb: string;
  phiLead: string;
  phiBody: string;
  phiBetween: string;
  phiFaq: string;
  phiGuidelines: string;
  legalBlurb: string;
  privacy: string;
  terms: string;
  rights: string;
};

const copy: Record<Locale, FooterCopy> = {
  en: {
    columns: [
      {
        title: "Product",
        links: [
          { href: "/features", label: "Features" },
          { href: "/web-app", label: "Web app" },
          { href: "/login", label: "Sign in" },
          { href: "/me", label: "My Pulse" },
          { href: "/features/feed", label: "Feed" },
          { href: "/features/circles", label: "Circles" },
          { href: "/features/live", label: "Live" },
          { href: "/features/pulse-page", label: "Pulse Page" },
          { href: "/features/my-pulse", label: "My Pulse" },
        ],
      },
      {
        title: "Company",
        links: [
          { href: "/about", label: "About us" },
          { href: "/changelog", label: "Changelog" },
          { href: "/partners", label: "Partners" },
          { href: "/contact?topic=careers", label: "Careers (contact)" },
          { href: "/contact?topic=press", label: "Press (contact)" },
          { href: "/contact", label: "Contact" },
        ],
      },
      {
        title: "Support",
        links: [
          { href: "/support", label: "Help Center" },
          { href: "/faq", label: "FAQ" },
          { href: "/trust", label: "Trust & safety" },
          { href: "/community-guidelines", label: "Community guidelines" },
          { href: "/privacy", label: "Privacy" },
          { href: "/terms", label: "Terms" },
        ],
      },
      {
        title: "For advertisers",
        links: [
          { href: "/advertisers", label: "Advertise with us" },
          { href: "/contact?topic=media", label: "Media kit (contact)" },
          { href: "/contact?topic=partnerships", label: "Brand partnerships" },
        ],
      },
    ],
    stayConnectedTitle: "Stay connected",
    stayConnectedBlurb: "Product updates and trust & safety news.",
    phiLead: "PHI & clinical safety:",
    phiBody:
      "is not a system of record for identifiable patient information. Never post PHI or individually identifiable patient details. See",
    phiBetween: "and",
    phiFaq: "FAQ",
    phiGuidelines: "Community guidelines",
    legalBlurb:
      "Legal & community documents last updated {date}. Review with counsel before relying on them as your sole policies.",
    privacy: "Privacy",
    terms: "Terms",
    rights: "All rights reserved.",
  },
  es: {
    columns: [
      {
        title: "Producto",
        links: [
          { href: "/features", label: "Funciones" },
          { href: "/web-app", label: "App web" },
          { href: "/login", label: "Iniciar sesión" },
          { href: "/me", label: "My Pulse" },
          { href: "/features/feed", label: "Feed" },
          { href: "/features/circles", label: "Circles" },
          { href: "/features/live", label: "Live" },
          { href: "/features/pulse-page", label: "Pulse Page" },
          { href: "/features/my-pulse", label: "My Pulse" },
        ],
      },
      {
        title: "Empresa",
        links: [
          { href: "/about", label: "Quiénes somos" },
          { href: "/changelog", label: "Novedades" },
          { href: "/partners", label: "Socios" },
          { href: "/contact?topic=careers", label: "Empleo (contacto)" },
          { href: "/contact?topic=press", label: "Prensa (contacto)" },
          { href: "/contact", label: "Contacto" },
        ],
      },
      {
        title: "Ayuda",
        links: [
          { href: "/support", label: "Centro de ayuda" },
          { href: "/faq", label: "Preguntas frecuentes" },
          { href: "/trust", label: "Confianza y seguridad" },
          { href: "/community-guidelines", label: "Normas de la comunidad" },
          { href: "/privacy", label: "Privacidad" },
          { href: "/terms", label: "Términos" },
        ],
      },
      {
        title: "Para anunciantes",
        links: [
          { href: "/advertisers", label: "Anuncia con nosotros" },
          { href: "/contact?topic=media", label: "Kit de medios (contacto)" },
          { href: "/contact?topic=partnerships", label: "Alianzas de marca" },
        ],
      },
    ],
    stayConnectedTitle: "Mantente al tanto",
    stayConnectedBlurb: "Novedades del producto y de confianza y seguridad.",
    phiLead: "PHI y seguridad clínica:",
    phiBody:
      "no es un sistema de registro para información identificable de pacientes. No publiques PHI ni datos que permitan identificar a pacientes. Consulta las",
    phiBetween: "y las",
    phiFaq: "FAQ",
    phiGuidelines: "normas de la comunidad",
    legalBlurb:
      "Documentos legales y de comunidad actualizados por última vez el {date}. Revísalos con asesoría legal antes de usarlos como políticas únicas.",
    privacy: "Privacidad",
    terms: "Términos",
    rights: "Todos los derechos reservados.",
  },
};

export function getFooterCopy(locale: Locale): FooterCopy {
  return copy[locale];
}
