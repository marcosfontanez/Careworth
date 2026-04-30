import type { Locale } from "@/lib/i18n";

import type { MarketingFaqItem } from "@/lib/marketing-copy/faq";

export type SupportHelpTile = {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
};

export type SupportContactCard = {
  title: string;
  body: string;
  href: string;
  cta: string;
  badge?: string;
};

export type SupportBlurbCard = { title: string; body: string; href: string; linkCta: string };

export type SupportCenterCopy = {
  eyebrow: string;
  heroTitleBefore: string;
  heroTitleAccent: string;
  searchPlaceholder: string;
  searchButton: string;
  popularLabel: string;
  popularLinks: { href: string; label: string }[];
  sectionHelpTitle: string;
  helpTiles: SupportHelpTile[];
  faqEyebrow: string;
  faqTitle: string;
  faqBrowseAll: string;
  stillTitle: string;
  stillBody: string;
  contactCards: SupportContactCard[];
  blurbs: SupportBlurbCard[];
  subscribeTitle: string;
  subscribeBody: string;
  faqItemsSubset: MarketingFaqItem[];
};

function cardsEn(supportEmail: string): SupportContactCard[] {
  return [
    { title: "Contact support", body: "Priority threads for trust & safety and access issues.", href: "/contact", cta: "Contact us" },
    { title: "Email us", body: supportEmail, href: `mailto:${supportEmail}`, cta: "Send an email" },
    { title: "Response time", body: "We typically respond within 24–48 business hours.", href: "/faq", badge: "24–48h avg.", cta: "Contact us" },
  ];
}

function cardsEs(supportEmail: string): SupportContactCard[] {
  return [
    { title: "Contactar soporte", body: "Hilos prioritarios para confianza, seguridad y acceso.", href: "/contact", cta: "Contactar" },
    { title: "Escríbenos", body: supportEmail, href: `mailto:${supportEmail}`, cta: "Enviar correo" },
    { title: "Tiempo de respuesta", body: "Solemos responder en 24–48 h laborables.", href: "/faq", badge: "24–48 h media", cta: "Contactar" },
  ];
}

/** First 6 FAQ entries for the support accordion (matches prior UX density). */
function faqSubset(items: MarketingFaqItem[]): MarketingFaqItem[] {
  return items.slice(0, 6);
}

export function getSupportCenterCopy(
  locale: Locale,
  faqItems: MarketingFaqItem[],
  supportEmail: string,
): SupportCenterCopy {
  const faqSlice = faqSubset(faqItems);

  if (locale === "es") {
    return {
      eyebrow: "Centro de ayuda",
      heroTitleBefore: "Ayuda para cada parte de",
      heroTitleAccent: "PulseVerse.",
      searchPlaceholder: "Buscar artículos de ayuda…",
      searchButton: "Buscar",
      popularLabel: "Popular:",
      popularLinks: [
        { href: "/faq", label: "Cuenta" },
        { href: "/trust", label: "Confianza y seguridad" },
        { href: "/privacy", label: "Privacidad" },
        { href: "/community-guidelines", label: "Normas" },
      ],
      sectionHelpTitle: "¿En qué podemos ayudarte hoy?",
      helpTiles: [
        { title: "Cuenta", body: "Inicio de sesión, verificación y dispositivos.", href: "/faq", linkLabel: "Ver artículos" },
        {
          title: "Seguridad",
          body: "Denuncias, recursos e incidencias urgentes en Live — ver confianza y seguridad.",
          href: "/trust",
          linkLabel: "Resumen de confianza",
        },
        { title: "Circles", body: "Comunidades temáticas, moderación y republicar a My Pulse.", href: "/faq", linkLabel: "Ver artículos" },
        { title: "Live", body: "Destacados, top en vivo, en ascenso y explorar por tema.", href: "/faq", linkLabel: "Ver artículos" },
        { title: "Pulse Page", body: "Casa de identidad — Current Vibe, My Pulse, Media Hub.", href: "/faq", linkLabel: "Ver artículos" },
        { title: "Socios", body: "Prensa, acceso e instituciones piloto.", href: "/faq", linkLabel: "Ver artículos" },
      ],
      faqEyebrow: "FAQ",
      faqTitle: "Preguntas frecuentes",
      faqBrowseAll: "Ver todos los artículos",
      stillTitle: "¿Sigues necesitando ayuda?",
      stillBody: "Nuestro equipo está contigo.",
      contactCards: cardsEs(supportEmail),
      blurbs: [
        {
          title: "Seguridad y denuncias",
          body: "Las banderas en la app llegan a moderadores con contexto clínico.",
          href: "/community-guidelines",
          linkCta: "Saber más",
        },
        {
          title: "Normas de la comunidad",
          body: "Cómo protegemos la cultura sin ahogar el debate de buena fe.",
          href: "/community-guidelines",
          linkCta: "Saber más",
        },
        {
          title: "Privacidad y seguridad",
          body: "Minimización de datos, retención y términos en la política de privacidad.",
          href: "/privacy",
          linkCta: "Saber más",
        },
      ],
      subscribeTitle: "Suscríbete a novedades de ayuda",
      subscribeBody: "Cambios de producto, avisos de confianza y seguridad, y consejos de Live.",
      faqItemsSubset: faqSlice,
    };
  }

  return {
    eyebrow: "Support center",
    heroTitleBefore: "Help for every part of",
    heroTitleAccent: "PulseVerse.",
    searchPlaceholder: "Search help articles…",
    searchButton: "Search",
    popularLabel: "Popular:",
    popularLinks: [
      { href: "/faq", label: "Account settings" },
      { href: "/trust", label: "Trust & safety" },
      { href: "/privacy", label: "Privacy" },
      { href: "/community-guidelines", label: "Guidelines" },
    ],
    sectionHelpTitle: "How can we help you today?",
    helpTiles: [
      { title: "Account", body: "Sign-in, verification, and device basics.", href: "/faq", linkLabel: "View articles" },
      {
        title: "Safety",
        body: "Reports, appeals, urgent live incidents — see also Trust & safety overview.",
        href: "/trust",
        linkLabel: "Trust overview",
      },
      { title: "Circles", body: "Topic communities, moderation, and reposting into My Pulse.", href: "/faq", linkLabel: "View articles" },
      { title: "Live", body: "Featured, Top Live Now, Rising Lives, and browse by topic.", href: "/faq", linkLabel: "View articles" },
      {
        title: "Pulse Page",
        body: "Identity home — Current Vibe, My Pulse strip, Media Hub, profile presence.",
        href: "/faq",
        linkLabel: "View articles",
      },
      { title: "Partners", body: "Press, access programs, and institution pilots.", href: "/faq", linkLabel: "View articles" },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Frequently asked questions",
    faqBrowseAll: "Browse all articles",
    stillTitle: "Still need help?",
    stillBody: "Our team is here for you.",
    contactCards: cardsEn(supportEmail),
    blurbs: [
      {
        title: "Safety & reporting",
        body: "In-app flags route to trained moderators with clinical context.",
        href: "/community-guidelines",
        linkCta: "Learn more",
      },
      {
        title: "Community guidelines",
        body: "How we protect culture without chilling good-faith debate.",
        href: "/community-guidelines",
        linkCta: "Learn more",
      },
      {
        title: "Privacy & security",
        body: "Data minimization, retention controls, and terms in our Privacy Policy.",
        href: "/privacy",
        linkCta: "Learn more",
      },
    ],
    subscribeTitle: "Subscribe to help updates",
    subscribeBody: "Product changes, trust & safety notices, and Live ops tips.",
    faqItemsSubset: faqSlice,
  };
}
