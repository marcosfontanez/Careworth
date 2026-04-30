import { isLocale, type Locale } from "@/lib/i18n";

export type ContactFormErrors = {
  required: string;
  rateLimited: string;
  saveFailed: string;
  notConfigured: string;
};

export type NewsletterFormErrors = {
  invalidEmail: string;
  rateLimited: string;
  subscribeFailed: string;
  notConfigured: string;
};

export type NewsletterFormUi = {
  placeholder: string;
  subscribeAria: string;
  success: string;
  disclaimer: string;
};

const contact: Record<Locale, ContactFormErrors> = {
  en: {
    required: "Please fill in name, email, and message.",
    rateLimited: "Too many submissions from this network. Try again in an hour or email us directly.",
    saveFailed: "Could not send right now. Try again later or email us directly.",
    notConfigured: "Contact form is not configured. Add Supabase keys to the server environment.",
  },
  es: {
    required: "Completa nombre, correo y mensaje.",
    rateLimited: "Demasiados envíos desde esta red. Prueba en una hora o escríbenos por correo.",
    saveFailed: "No se pudo enviar ahora. Inténtalo más tarde o escríbenos por correo.",
    notConfigured: "El formulario no está configurado. Añade las claves de Supabase al servidor.",
  },
};

const newsletterErrors: Record<Locale, NewsletterFormErrors> = {
  en: {
    invalidEmail: "Enter a valid email.",
    rateLimited: "Too many signups from this network. Try again later.",
    subscribeFailed: "Could not subscribe right now. Try again later.",
    notConfigured: "Newsletter is not configured yet.",
  },
  es: {
    invalidEmail: "Introduce un correo válido.",
    rateLimited: "Demasiados registros desde esta red. Prueba más tarde.",
    subscribeFailed: "No se pudo suscribir ahora. Prueba más tarde.",
    notConfigured: "El boletín aún no está configurado.",
  },
};

const newsletterUi: Record<Locale, NewsletterFormUi> = {
  en: {
    placeholder: "Email",
    subscribeAria: "Subscribe",
    success: "Thanks — you're on the list.",
    disclaimer: "Updates about product and trust & safety. Unsubscribe anytime from messages we send.",
  },
  es: {
    placeholder: "Correo",
    subscribeAria: "Suscribirse",
    success: "Gracias: ya estás en la lista.",
    disclaimer: "Novedades del producto y de confianza y seguridad. Puedes darte de baja en los envíos.",
  },
};

export function getContactFormErrors(locale: Locale): ContactFormErrors {
  return contact[locale] ?? contact.en;
}

export function getNewsletterFormErrors(locale: Locale): NewsletterFormErrors {
  return newsletterErrors[locale] ?? newsletterErrors.en;
}

export function getNewsletterFormUi(locale: Locale): NewsletterFormUi {
  return newsletterUi[locale] ?? newsletterUi.en;
}

export function parseFormLocale(raw: unknown): Locale {
  const s = String(raw ?? "").trim();
  return isLocale(s) ? s : "en";
}
