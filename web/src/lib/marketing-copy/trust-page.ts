import type { Locale } from "@/lib/i18n";

export type TrustSection = { title: string; body: string };

export type TrustPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  infographicAlt: string;
  infographicTag: string;
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
      "Practical guidance on reporting, moderation, Live safety, and appeals. For enforceable rules and privacy practices, see the documents linked below.",
    infographicAlt:
      "Trust and Safety at PulseVerse infographic: central shield with six glass pillars — reporting, human moderation, identity, privacy and PHI, community standards, responsible disclosure.",
    infographicTag: "Trust surfaces",
    sections: [
      {
        title: "How to report content",
        body: "Use the overflow menu to report posts, comments, profiles, Circle threads, and Live streams. Choose the category that best matches the issue — harassment, spam, PHI, child safety, impersonation, or other concerns. Reports from Live are prioritized when real-time harm is possible.",
      },
      {
        title: "What happens after a report",
        body: "Reports enter moderation queues with severity and category signals. Moderators may remove content, restrict features, suspend Live access, or escalate to account enforcement. You may not always receive a detailed outcome, but we review good-faith reports consistent with our Community guidelines.",
      },
      {
        title: "Urgent safety issues",
        body: "If someone is in immediate danger, contact local emergency services first. For urgent platform safety issues — especially Live incidents or child safety concerns — use in-app reporting and contact paths in Help Center (/support). Child-safety compliance: safety@pulseverse.app.",
      },
      {
        title: "Appeals",
        body: "Where the product provides appeals, use in-app flows to add context after an enforcement action. Appeals are reviewed by humans when available; repeated or bad-faith abuse of appeals may be limited.",
      },
      {
        title: "Live moderation",
        body: "Live streams, chat, polls, reactions, and gifts are subject to real-time and post-session review. We may end a stream, restrict chat, or suspend Live privileges when safety requires it.",
      },
      {
        title: "Identity & authenticity",
        body: "Verification and professional context reduce impersonation and spam. Do not misrepresent credentials, employers, or partnerships. Sponsored or branded content must be labeled where policy requires.",
      },
      {
        title: "Healthcare misinformation & unsafe advice",
        body: "Educational storytelling is welcome. Content that promotes dangerous practices, false clinical claims, or individualized medical advice framed as personal care may be removed or restricted.",
      },
      {
        title: "PHI & clinical privacy",
        body: "PulseVerse is not a system of record for patient-identifiable information. Never post PHI or individually identifiable patient details in Feed, Circles, Live, comments, or profiles.",
      },
      {
        title: "Healthcare-first moderation",
        body: "Queues, escalation, and appeals are designed for clinical debate, education, humor, and creator safety — not generic social scale alone.",
      },
    ],
    disclosureTitle: "Responsible disclosure",
    disclosureBeforeEmail: "If you believe you have found a security vulnerability, contact",
    disclosureAfterEmail: ". We publish machine-readable contact metadata in",
    securityTxtLabel: "security.txt",
    relatedTitle: "Related",
    relatedLinks: [
      { href: "/community-guidelines", label: "Community guidelines" },
      { href: "/child-safety", label: "Child safety" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/faq", label: "FAQ" },
      { href: "/support", label: "Help Center" },
      { href: "/contact", label: "Contact (trust & safety, press, partnerships)" },
    ],
  },
  es: {
    eyebrow: "Confianza y seguridad",
    title: "Cómo protegemos la cultura sanitaria",
    description:
      "Guía práctica sobre denuncias, moderación, seguridad en Live y apelaciones. Para reglas exigibles y privacidad, consulta los documentos enlazados.",
    infographicAlt:
      "Infografía Confianza y seguridad en PulseVerse: escudo central y seis pilares — reportes, moderación humana, identidad, privacidad y PHI, normas, divulgación responsable.",
    infographicTag: "Superficies de confianza",
    sections: [
      {
        title: "Cómo denunciar contenido",
        body: "Usa el menú de opciones para denunciar publicaciones, comentarios, perfiles, hilos de Circles y transmisiones Live. Elige la categoría que mejor describa el problema. Las denuncias en Live tienen prioridad cuando hay riesgo en tiempo real.",
      },
      {
        title: "Qué ocurre después de una denuncia",
        body: "Las denuncias entran en colas de moderación con señales de gravedad y categoría. Los moderadores pueden retirar contenido, restringir funciones, suspender Live o escalar a medidas sobre la cuenta.",
      },
      {
        title: "Asuntos urgentes de seguridad",
        body: "Si alguien está en peligro inmediato, contacta primero a servicios de emergencia locales. Para urgencias en la plataforma — especialmente Live o seguridad infantil — usa los flujos in-app y las vías del Centro de ayuda (/support).",
      },
      {
        title: "Apelaciones",
        body: "Cuando el producto ofrezca apelaciones, usa los flujos in-app para aportar contexto tras una medida de aplicación. Las apelaciones las revisan personas cuando está disponible.",
      },
      {
        title: "Moderación en Live",
        body: "Transmisiones, chat, encuestas, reacciones y regalos pueden revisarse en tiempo real y después de la sesión. Podemos terminar una transmisión o restringir privilegios Live cuando la seguridad lo exija.",
      },
      {
        title: "Identidad y autenticidad",
        body: "La verificación y el contexto profesional reducen suplantación y spam. No tergiverses credenciales, empleadores o alianzas. El contenido patrocinado debe etiquetarse cuando la política lo exija.",
      },
      {
        title: "Desinformación sanitaria y consejo inseguro",
        body: "La divulgación educativa sí. Contenido que promueva prácticas peligrosas, afirmaciones clínicas falsas o consejo médico individualizado puede retirarse o restringirse.",
      },
      {
        title: "PHI y privacidad clínica",
        body: "PulseVerse no es un sistema de registro de información identificable del paciente. No publiques PHI ni datos identificables en Feed, Circles, Live, comentarios o perfiles.",
      },
      {
        title: "Moderación centrada en la sanidad",
        body: "Colas, escalado y apelaciones están pensados para debate clínico, educación, humor y seguridad de creadores — no solo para escala tipo red genérica.",
      },
    ],
    disclosureTitle: "Divulgación responsable",
    disclosureBeforeEmail: "Si crees haber encontrado una vulnerabilidad de seguridad, escribe a",
    disclosureAfterEmail: ". Publicamos metadatos de contacto legibles por máquina en",
    securityTxtLabel: "security.txt",
    relatedTitle: "Relacionado",
    relatedLinks: [
      { href: "/community-guidelines", label: "Normas de la comunidad" },
      { href: "/child-safety", label: "Seguridad infantil" },
      { href: "/privacy", label: "Política de privacidad" },
      { href: "/terms", label: "Términos del servicio" },
      { href: "/faq", label: "Preguntas frecuentes" },
      { href: "/support", label: "Centro de ayuda" },
      { href: "/contact", label: "Contacto (confianza, prensa, alianzas)" },
    ],
  },
};

export function getTrustPageCopy(locale: Locale): TrustPageCopy {
  return copy[locale] ?? copy.en;
}
