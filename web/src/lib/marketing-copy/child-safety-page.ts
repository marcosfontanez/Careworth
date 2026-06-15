import type { Locale } from "@/lib/i18n";
import { legalDocumentsLastUpdatedDisplay } from "@/lib/site-constants";

export type ChildSafetyPageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  lastReviewedLabel: string;
  surfacesTitle: string;
  surfacesBody: string;
  zeroToleranceTitle: string;
  zeroToleranceLead: string;
  zeroToleranceItems: readonly string[];
  inAppTitle: string;
  inAppBody: string;
  urgentTitle: string;
  urgentBody: string;
  reviewTitle: string;
  reviewBody: string;
  csamTitle: string;
  csamBody: string;
  complianceTitle: string;
  complianceBody: string;
  contactTitle: string;
  contactLead: string;
  relatedTitle: string;
  relatedLinks: readonly { href: string; label: string }[];
};

const copy: Record<Locale, ChildSafetyPageCopy> = {
  en: {
    eyebrow: "Policies",
    title: "Child Safety Standards",
    intro:
      "PulseVerse is committed to maintaining a safe platform and strictly prohibits child sexual abuse and exploitation (CSAE), child sexual abuse material (CSAM), grooming, sextortion, trafficking, or any content that sexualizes, exploits, endangers, or abuses minors.",
    lastReviewedLabel: `Last reviewed ${legalDocumentsLastUpdatedDisplay}.`,
    surfacesTitle: "Where these standards apply",
    surfacesBody:
      "These standards apply across PulseVerse surfaces — Feed, Circles, Live streams, comments, public profiles, My Pulse, creator uploads, and any messaging or direct communication features when available.",
    zeroToleranceTitle: "Zero-tolerance policy",
    zeroToleranceLead: "PulseVerse prohibits:",
    zeroToleranceItems: [
      "Child sexual abuse and exploitation (CSAE)",
      "Child sexual abuse material (CSAM)",
      "Grooming or predatory behavior involving minors",
      "Solicitation or sexualization of minors",
      "Threats, coercion, or trafficking involving minors",
      "Attempts to share, request, or distribute exploitative content involving minors",
    ],
    inAppTitle: "In-app reporting",
    inAppBody:
      "Users can report concerning content, accounts, posts, comments, Live streams, and Circle threads directly through PulseVerse in-app reporting tools. Choose the child-safety category when applicable.",
    urgentTitle: "Urgent reporting path",
    urgentBody:
      "If a child is in immediate danger, contact local emergency services first. Then report in-app and email our child-safety contact below with links, usernames, and timestamps when available. Live incidents and CSAM reports are treated as highest priority.",
    reviewTitle: "Review and enforcement",
    reviewBody:
      "Reported content may be reviewed by trained moderators. PulseVerse may remove content, restrict accounts, suspend users, terminate accounts, and preserve or escalate information when required.",
    csamTitle: "CSAM response",
    csamBody:
      "When PulseVerse obtains actual knowledge of confirmed CSAM or conduct that requires reporting under applicable law, PulseVerse will take appropriate action in accordance with applicable laws and may report to the National Center for Missing and Exploited Children (NCMEC) or other relevant regional authorities as required.",
    complianceTitle: "Compliance with child-safety laws",
    complianceBody:
      "PulseVerse is committed to complying with applicable child-safety laws and regulations, including platform disclosure requirements for app stores.",
    contactTitle: "Designated child-safety contact",
    contactLead: "For child-safety compliance inquiries and urgent escalations, contact:",
    relatedTitle: "Related policies",
    relatedLinks: [
      { href: "/trust", label: "Trust & safety" },
      { href: "/community-guidelines", label: "Community guidelines" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  es: {
    eyebrow: "Políticas",
    title: "Normas de seguridad infantil",
    intro:
      "PulseVerse se compromete a mantener una plataforma segura y prohíbe de forma estricta el abuso y la explotación sexual infantil (CSAE), el material de abuso sexual infantil (CSAM), el grooming, la sextorsión, la trata o cualquier contenido que sexualice, explote, ponga en peligro o abuse de menores.",
    lastReviewedLabel: `Última revisión: ${legalDocumentsLastUpdatedDisplay}.`,
    surfacesTitle: "Dónde aplican estas normas",
    surfacesBody:
      "Estas normas aplican en todas las superficies de PulseVerse — Feed, Circles, Live, comentarios, perfiles públicos, My Pulse, subidas de creadores y cualquier función de mensajes cuando esté disponible.",
    zeroToleranceTitle: "Política de tolerancia cero",
    zeroToleranceLead: "PulseVerse prohíbe:",
    zeroToleranceItems: [
      "El abuso y la explotación sexual infantil (CSAE)",
      "El material de abuso sexual infantil (CSAM)",
      "El grooming o la conducta depredadora que involucre a menores",
      "La solicitación o sexualización de menores",
      "Las amenazas, la coerción o la trata que involucren a menores",
      "Los intentos de compartir, solicitar o distribuir contenido explotador que involucre a menores",
    ],
    inAppTitle: "Reporte en la aplicación",
    inAppBody:
      "Las personas usuarias pueden reportar contenido, cuentas, publicaciones, comentarios, transmisiones Live e hilos de Circles mediante las herramientas integradas. Elige la categoría de seguridad infantil cuando corresponda.",
    urgentTitle: "Vía de reporte urgente",
    urgentBody:
      "Si un menor está en peligro inmediato, contacta primero a servicios de emergencia locales. Luego reporta in-app y escribe a nuestro contacto de seguridad infantil con enlaces, usuarios y marcas de tiempo cuando sea posible.",
    reviewTitle: "Revisión y aplicación",
    reviewBody:
      "El contenido reportado puede ser revisado por moderadores formados. PulseVerse puede eliminar contenido, restringir cuentas, suspender usuarias y usuarios, dar de baja cuentas, y conservar o escalar información cuando corresponda.",
    csamTitle: "Respuesta ante CSAM",
    csamBody:
      "Cuando PulseVerse tenga conocimiento efectivo de CSAM confirmado o de conductas que deban reportarse conforme a la ley aplicable, adoptará las medidas adecuadas y podrá notificar al NCMEC u otras autoridades regionales pertinentes.",
    complianceTitle: "Cumplimiento de las leyes de seguridad infantil",
    complianceBody:
      "PulseVerse se compromete a cumplir las leyes y regulaciones aplicables en materia de seguridad infantil, incluidos los requisitos de divulgación de las tiendas de aplicaciones.",
    contactTitle: "Contacto designado de seguridad infantil",
    contactLead: "Para consultas de cumplimiento y escalaciones urgentes, escribe a:",
    relatedTitle: "Políticas relacionadas",
    relatedLinks: [
      { href: "/trust", label: "Confianza y seguridad" },
      { href: "/community-guidelines", label: "Normas de la comunidad" },
      { href: "/privacy", label: "Política de privacidad" },
      { href: "/terms", label: "Términos del servicio" },
    ],
  },
};

export function getChildSafetyPageCopy(locale: Locale): ChildSafetyPageCopy {
  return copy[locale] ?? copy.en;
}
