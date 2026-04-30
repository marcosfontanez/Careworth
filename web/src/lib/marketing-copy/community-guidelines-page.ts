import type { Locale } from "@/lib/i18n";

export type GuidelinesTocItem = { id: string; label: string };

export type CommunityGuidelinesPageCopy = {
  docTitle: string;
  toc: readonly GuidelinesTocItem[];
  intro: string;
  expectationsHeading: string;
  expectationsItems: readonly string[];
  safetyHeading: string;
  safetyLead: string;
  safetyTrustLink: string;
  enforcementHeading: string;
  enforcementLead: string;
  enforcementTrustLink: string;
};

const copy: Record<Locale, CommunityGuidelinesPageCopy> = {
  en: {
    docTitle: "Community Guidelines",
    toc: [
      { id: "expectations", label: "Core expectations" },
      { id: "safety", label: "Safety & PHI" },
      { id: "enforcement", label: "Enforcement" },
    ],
    intro: "PulseVerse is a culture network for healthcare professionals. Be respectful, accurate, and mindful of patient privacy. Moderation may restrict accounts that harm community safety.",
    expectationsHeading: "Core expectations",
    expectationsItems: [
      "Treat colleagues and students with dignity — especially across power differences.",
      "Label educational content; avoid implying individualized care in public posts.",
      "Disclose conflicts when discussing products, employers, or sponsors.",
    ],
    safetyHeading: "Safety & PHI",
    safetyLead:
      "Protect PHI — no wristbands, faces, or charts without consent and policy alignment. Report content that risks patient privacy or promotes unsafe practices. For a network-level overview of reporting and moderation, see",
    safetyTrustLink: "Trust & safety",
    enforcementHeading: "Enforcement",
    enforcementLead:
      "Moderators may remove content, restrict features, or suspend accounts. Appeals are available for many enforcement actions — see in-app flows. High-level context:",
    enforcementTrustLink: "Trust & safety",
  },
  es: {
    docTitle: "Normas de la comunidad",
    toc: [
      { id: "expectations", label: "Expectativas básicas" },
      { id: "safety", label: "Seguridad y PHI" },
      { id: "enforcement", label: "Aplicación" },
    ],
    intro: "PulseVerse es una red cultural para profesionales sanitarios. Sé respetuoso, riguroso y cuidadoso con la privacidad del paciente. La moderación puede restringir cuentas que dañen la seguridad de la comunidad.",
    expectationsHeading: "Expectativas básicas",
    expectationsItems: [
      "Trata a colegas y estudiantes con dignidad — especialmente cuando hay diferencias de poder.",
      "Etiqueta contenido educativo; evita implicar atención individualizada en publicaciones públicas.",
      "Declara conflictos al hablar de productos, empleadores o patrocinadores.",
    ],
    safetyHeading: "Seguridad y PHI",
    safetyLead:
      "Protege la PHI: sin pulseras, caras o gráficos sin consentimiento y alineación con política. Reporta contenido que ponga en riesgo la privacidad o promueva prácticas inseguras. Para un panorama de reportes y moderación, consulta",
    safetyTrustLink: "Confianza y seguridad",
    enforcementHeading: "Aplicación",
    enforcementLead:
      "Los moderadores pueden retirar contenido, restringir funciones o suspender cuentas. Hay apelaciones para muchas medidas — revisa los flujos in-app. Contexto general:",
    enforcementTrustLink: "Confianza y seguridad",
  },
};

export function getCommunityGuidelinesPageCopy(locale: Locale): CommunityGuidelinesPageCopy {
  return copy[locale] ?? copy.en;
}
