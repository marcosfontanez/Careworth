import type { Locale } from "@/lib/i18n";

export type ContactPageCopy = {
  title: string;
  description: string;
  successTitle: string;
  successBody: string;
  backHome: string;
};

export type ContactFormCopy = {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholderDefault: string;
  messagePlaceholderTopic: string;
  submit: string;
  submitting: string;
};

const page: Record<Locale, ContactPageCopy> = {
  en: {
    title: "Contact",
    description: "Partnerships, press, trust & safety, and early access — we read every note.",
    successTitle: "Message received",
    successBody: "Thanks — our team will get back to you shortly.",
    backHome: "Back to home",
  },
  es: {
    title: "Contacto",
    description: "Alianzas, prensa, confianza y seguridad, y acceso anticipado — leemos cada mensaje.",
    successTitle: "Mensaje recibido",
    successBody: "Gracias: nuestro equipo te responderá pronto.",
    backHome: "Volver al inicio",
  },
};

const form: Record<Locale, ContactFormCopy> = {
  en: {
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@health.org",
    messageLabel: "Message",
    messagePlaceholderDefault: "How can we help?",
    messagePlaceholderTopic: "Tell us about your {topic} inquiry…",
    submit: "Send message",
    submitting: "Sending…",
  },
  es: {
    nameLabel: "Nombre",
    namePlaceholder: "Tu nombre",
    emailLabel: "Correo",
    emailPlaceholder: "tu@salud.org",
    messageLabel: "Mensaje",
    messagePlaceholderDefault: "¿En qué podemos ayudarte?",
    messagePlaceholderTopic: "Cuéntanos tu consulta sobre {topic}…",
    submit: "Enviar mensaje",
    submitting: "Enviando…",
  },
};

export function getContactPageCopy(locale: Locale): ContactPageCopy {
  return page[locale];
}

export function getContactFormCopy(locale: Locale): ContactFormCopy {
  return form[locale];
}

/** Humanize topic slug for message placeholder (both locales). */
export function formatContactTopicSnippet(topic: string): string {
  return topic.replaceAll("_", " ").replaceAll("-", " ");
}
