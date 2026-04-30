import type { Locale } from "@/lib/i18n";

export type TrustSection = { title: string; body: string };

export type TrustPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  sections: readonly TrustSection[];
  disclosureTitle: string;
  disclosureBeforeEmail: string;
  disclosureAfterEmail: string;
  securityTxtLabel: string;
  relatedTitle: string;
  relatedLinks: readonly { href: string; label: string }[];
};

const copy: Record<Locale, TrustPageCopy> = {
  en: {
    eyebrow: "Trust & safety",
    title: "How we protect healthcare culture",
    description:
      "A short overview of moderation, reporting, and safety expectations. For enforceable rules and privacy practices, see the documents linked below.",
    sections: [
      {
        title: "Healthcare-first moderation",
        body: "Queues, escalation, and appeals are designed for clinical debate, education, and creator safety — not generic social scale alone.",
      },
      {
        title: "Reporting & urgent incidents",
        body: "In-app reporting covers posts, profiles, and Live. For time-sensitive safety issues, use in-app flows and priority contact paths described in Help Center.",
      },
      {
        title: "Identity & authenticity",
        body: "Verification and professional context reduce impersonation and spam. Brand and partnership placements are labeled clearly where policy requires.",
      },
      {
        title: "PHI & clinical safety",
        body: "PulseVerse is not a system of record for patient-identifiable information. Never post PHI or individually identifiable patient details in public surfaces.",
      },
    ],
    disclosureTitle: "Responsible disclosure",
    disclosureBeforeEmail: "If you believe you have found a security vulnerability, contact",
    disclosureAfterEmail: ". We publish machine-readable contact metadata in",
    securityTxtLabel: "security.txt",
    relatedTitle: "Related",
    relatedLinks: [
      { href: "/community-guidelines", label: "Community guidelines" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Help center" },
      { href: "/contact", label: "Contact (trust & safety, press, partnerships)" },
    ],
  },
  es: {
    eyebrow: "Confianza y seguridad",
    title: "Cómo protegemos la cultura sanitaria",
    description:
      "Panorama breve de moderación, reportes y expectativas de seguridad. Para reglas exigibles y prácticas de privacidad, consulta los documentos enlazados abajo.",
    sections: [
      {
        title: "Moderación centrada en la sanidad",
        body: "Colas, escalado y apelaciones están pensados para el debate clínico, la formación y la seguridad de creadores — no solo para escala tipo red genérica.",
      },
      {
        title: "Reportes e incidentes urgentes",
        body: "El reporte in-app cubre publicaciones, perfiles y Live. Para asuntos sensibles, usa los flujos in-app y las vías prioritarias del Centro de ayuda.",
      },
      {
        title: "Identidad y autenticidad",
        body: "La verificación y el contexto profesional reducen suplantación y spam. Las ubicaciones de marca se etiquetan con claridad cuando la política lo exige.",
      },
      {
        title: "PHI y seguridad clínica",
        body: "PulseVerse no es un sistema de registro de información identificable del paciente. No publiques PHI ni datos identificables en superficies públicas.",
      },
    ],
    disclosureTitle: "Divulgación responsable",
    disclosureBeforeEmail: "Si crees haber encontrado una vulnerabilidad de seguridad, escribe a",
    disclosureAfterEmail: ". Publicamos metadatos de contacto legibles por máquina en",
    securityTxtLabel: "security.txt",
    relatedTitle: "Relacionado",
    relatedLinks: [
      { href: "/community-guidelines", label: "Normas de la comunidad" },
      { href: "/privacy", label: "Política de privacidad" },
      { href: "/faq", label: "Preguntas frecuentes" },
      { href: "/support", label: "Centro de ayuda" },
      { href: "/contact", label: "Contacto (confianza, prensa, alianzas)" },
    ],
  },
};

export function getTrustPageCopy(locale: Locale): TrustPageCopy {
  return copy[locale] ?? copy.en;
}
