import type { Locale } from "@/lib/i18n";

export type LoginPageCopy = {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  submit: string;
  newUser: string;
  getTheApp: string;
  staffLink: string;
};

const copy: Record<Locale, LoginPageCopy> = {
  en: {
    title: "Sign in",
    subtitle: "Use the same email and password as in the PulseVerse app.",
    emailLabel: "Email",
    emailPlaceholder: "you@hospital.org",
    passwordLabel: "Password",
    submit: "Continue",
    newUser: "New to PulseVerse?",
    getTheApp: "Get the app",
    staffLink: "Staff? Open the admin console →",
  },
  es: {
    title: "Iniciar sesión",
    subtitle: "Usa el mismo correo y contraseña que en la app PulseVerse.",
    emailLabel: "Correo",
    emailPlaceholder: "tu@correo.org",
    passwordLabel: "Contraseña",
    submit: "Continuar",
    newUser: "¿Nuevo en PulseVerse?",
    getTheApp: "Obtener la app",
    staffLink: "¿Personal? Ir al panel de administración →",
  },
};

export function getLoginPageCopy(locale: Locale): LoginPageCopy {
  return copy[locale];
}
