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
          { href: "/download", label: "Get the app" },
          { href: "/features", label: "All features" },
          { href: "/web-app", label: "Web Beta" },
          { href: "/login", label: "Sign in" },
        ],
      },
      {
        title: "Company",
        links: [
          { href: "/about", label: "About" },
          { href: "/contact", label: "Contact" },
          { href: "/advertisers", label: "Advertisers" },
          { href: "/partners", label: "Partners" },
          { href: "/changelog", label: "Changelog" },
          { href: "/admin/login", label: "Staff portal" },
        ],
      },
      {
        title: "Support & trust",
        links: [
          { href: "/support", label: "Help Center" },
          { href: "/faq", label: "FAQ" },
          { href: "/trust", label: "Trust & safety" },
          { href: "/child-safety", label: "Child safety" },
          { href: "/community-guidelines", label: "Community guidelines" },
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
    legalBlurb: "Legal & community documents last updated {date}.",
    privacy: "Privacy",
    terms: "Terms",
    rights: "All rights reserved.",
  },
  es: {
    columns: [
      {
        title: "Producto",
        links: [
          { href: "/download", label: "Obtener la app" },
          { href: "/features", label: "Todas las funciones" },
          { href: "/web-app", label: "Web Beta" },
          { href: "/login", label: "Iniciar sesión" },
        ],
      },
      {
        title: "Empresa",
        links: [
          { href: "/about", label: "Acerca de" },
          { href: "/contact", label: "Contacto" },
          { href: "/advertisers", label: "Anunciantes" },
          { href: "/partners", label: "Socios" },
          { href: "/changelog", label: "Novedades" },
          { href: "/admin/login", label: "Portal staff" },
        ],
      },
      {
        title: "Ayuda y confianza",
        links: [
          { href: "/support", label: "Centro de ayuda" },
          { href: "/faq", label: "Preguntas frecuentes" },
          { href: "/trust", label: "Confianza y seguridad" },
          { href: "/child-safety", label: "Seguridad infantil" },
          { href: "/community-guidelines", label: "Normas de la comunidad" },
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
    legalBlurb: "Documentos legales y de comunidad actualizados por última vez el {date}.",
    privacy: "Privacidad",
    terms: "Términos",
    rights: "Todos los derechos reservados.",
  },
};

export function getFooterCopy(locale: Locale): FooterCopy {
  return copy[locale];
}
