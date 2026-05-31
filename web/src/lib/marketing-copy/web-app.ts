import type { Locale } from "@/lib/i18n";

/** Primary navigation entries for the PulseVerse Web shell. */
export type WebAppNavKey =
  | "feed"
  | "circles"
  | "live"
  | "myPulse"
  | "creatorHub"
  | "notifications"
  | "settings";

export type WebAppNavCopy = Record<WebAppNavKey, string>;

export type WebAppShellCopy = {
  /** Accessible iframe title. */
  iframeTitle: string;
  /** Slim brand wordmark in the top bar. */
  wordmark: string;
  /** Top-bar search affordance placeholder. */
  searchPlaceholder: string;
  /** Top-bar create button. */
  createLabel: string;
  /** Open the embedded surface in a standalone tab. */
  openNewTab: string;
  /** Account menu — open full profile / my pulse. */
  accountProfile: string;
  /** Sign out action label. */
  signOut: string;
  /** Loading overlay copy while the embedded surface boots. */
  loadingTitle: string;
  loadingBody: string;
  /** Error / timeout state. */
  errorTitle: string;
  errorBody: string;
  retry: string;
  /** Shown when NEXT_PUBLIC_EXPO_WEB_APP_URL is missing. */
  notConfiguredTitle: string;
  notConfiguredBody: string;
  nav: WebAppNavCopy;
  /** Right contextual rail. */
  railTitle: string;
  railTips: string[];
  railSafetyTitle: string;
  railSafetyBody: string;
  railSafetyLink: string;
  railGetAppTitle: string;
  railGetAppBody: string;
  railGetAppLink: string;
};

export type WebAppLandingCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  loginCta: string;
  getAppCta: string;
  /** Reassurance line under the CTAs. */
  ctaNote: string;
  /** Feature highlight cards. */
  features: { title: string; body: string }[];
};

export type WebAppPageCopy = {
  metaTitle: string;
  metaDescription: string;
  shell: WebAppShellCopy;
  landing: WebAppLandingCopy;
};

const copy: Record<Locale, WebAppPageCopy> = {
  en: {
    metaTitle: "PulseVerse Web",
    metaDescription:
      "PulseVerse Web — your feed, circles, live, My Pulse, and Creator Hub in a clean, responsive browser experience. Sign in to pick up where you left off.",
    shell: {
      iframeTitle: "PulseVerse Web",
      wordmark: "PulseVerse Web",
      searchPlaceholder: "Search creators, circles, sounds…",
      createLabel: "Create",
      openNewTab: "Open in new tab",
      accountProfile: "My Pulse",
      signOut: "Sign out",
      loadingTitle: "Loading PulseVerse…",
      loadingBody: "Setting up your space.",
      errorTitle: "This is taking longer than usual",
      errorBody:
        "PulseVerse Web didn’t finish loading. Check your connection, then try again — or open it in a new tab.",
      retry: "Try again",
      notConfiguredTitle: "PulseVerse Web isn’t connected yet",
      notConfiguredBody:
        "An administrator needs to set NEXT_PUBLIC_EXPO_WEB_APP_URL to the hosted web app origin (no trailing slash). Once set and redeployed, the experience loads here automatically.",
      nav: {
        feed: "Feed",
        circles: "Circles",
        live: "Live",
        myPulse: "My Pulse",
        creatorHub: "Creator Hub",
        notifications: "Notifications",
        settings: "Settings",
      },
      railTitle: "On PulseVerse Web",
      railTips: [
        "Use the rail on the left to jump between Feed, Circles, Live, and your Pulse page.",
        "Everything stays in sync with the PulseVerse mobile app on your account.",
        "Tap Open in new tab for a full-screen, distraction-free view.",
      ],
      railSafetyTitle: "Healthy, respectful community",
      railSafetyBody:
        "Confessions stay anonymous, private posts stay private, and blocked accounts stay hidden — on web too.",
      railSafetyLink: "Community guidelines",
      railGetAppTitle: "Prefer mobile?",
      railGetAppBody: "Get the full PulseVerse app for iOS and Android.",
      railGetAppLink: "Get the app",
    },
    landing: {
      kicker: "PulseVerse Web",
      title: "Your PulseVerse, right in the browser",
      subtitle:
        "Feed, Circles, Live, My Pulse, and the Creator Hub — in a clean, responsive web experience. No phone required.",
      loginCta: "Log in to PulseVerse Web",
      getAppCta: "Get the mobile app",
      ctaNote: "Sign in with your PulseVerse email. New here? Create your account in the mobile app.",
      features: [
        { title: "Feed", body: "Scroll videos and posts in a comfortable, readable column built for the desktop." },
        { title: "Circles", body: "Join the conversation — threads, replies, and communities with the same privacy rules you trust." },
        { title: "Live", body: "Catch live rooms and replays without missing a beat." },
        { title: "My Pulse", body: "Your profile, posts, and media — a polished page that’s yours." },
        { title: "Creator Hub", body: "Create, publish, and manage your content from a focused workspace." },
        { title: "Always in sync", body: "Everything mirrors your mobile app instantly across every device." },
      ],
    },
  },
  es: {
    metaTitle: "PulseVerse Web",
    metaDescription:
      "PulseVerse Web — tu feed, círculos, en vivo, My Pulse y Creator Hub en una experiencia web limpia y adaptable. Inicia sesión y continúa donde lo dejaste.",
    shell: {
      iframeTitle: "PulseVerse Web",
      wordmark: "PulseVerse Web",
      searchPlaceholder: "Buscar creadores, círculos, sonidos…",
      createLabel: "Crear",
      openNewTab: "Abrir en pestaña nueva",
      accountProfile: "My Pulse",
      signOut: "Cerrar sesión",
      loadingTitle: "Cargando PulseVerse…",
      loadingBody: "Preparando tu espacio.",
      errorTitle: "Esto está tardando más de lo normal",
      errorBody:
        "PulseVerse Web no terminó de cargar. Revisa tu conexión e inténtalo de nuevo, o ábrelo en una pestaña nueva.",
      retry: "Reintentar",
      notConfiguredTitle: "PulseVerse Web aún no está conectado",
      notConfiguredBody:
        "Un administrador debe definir NEXT_PUBLIC_EXPO_WEB_APP_URL con el origen de la app web (sin barra final). Tras guardarlo y volver a desplegar, la experiencia se cargará aquí automáticamente.",
      nav: {
        feed: "Feed",
        circles: "Círculos",
        live: "En vivo",
        myPulse: "My Pulse",
        creatorHub: "Creator Hub",
        notifications: "Notificaciones",
        settings: "Ajustes",
      },
      railTitle: "En PulseVerse Web",
      railTips: [
        "Usa la barra de la izquierda para moverte entre Feed, Círculos, En vivo y tu página Pulse.",
        "Todo se mantiene sincronizado con la app móvil de PulseVerse en tu cuenta.",
        "Pulsa Abrir en pestaña nueva para una vista a pantalla completa.",
      ],
      railSafetyTitle: "Comunidad sana y respetuosa",
      railSafetyBody:
        "Las confesiones siguen siendo anónimas, las publicaciones privadas siguen privadas y las cuentas bloqueadas se ocultan — también en la web.",
      railSafetyLink: "Normas de la comunidad",
      railGetAppTitle: "¿Prefieres el móvil?",
      railGetAppBody: "Consigue la app completa de PulseVerse para iOS y Android.",
      railGetAppLink: "Obtener la app",
    },
    landing: {
      kicker: "PulseVerse Web",
      title: "Tu PulseVerse, directo en el navegador",
      subtitle:
        "Feed, Círculos, En vivo, My Pulse y el Creator Hub — en una experiencia web limpia y adaptable. Sin necesidad del móvil.",
      loginCta: "Iniciar sesión en PulseVerse Web",
      getAppCta: "Obtener la app móvil",
      ctaNote: "Inicia sesión con tu correo de PulseVerse. ¿Nuevo aquí? Crea tu cuenta en la app móvil.",
      features: [
        { title: "Feed", body: "Desliza vídeos y publicaciones en una columna cómoda pensada para el escritorio." },
        { title: "Círculos", body: "Únete a la conversación — hilos, respuestas y comunidades con las mismas reglas de privacidad." },
        { title: "En vivo", body: "Disfruta de salas en vivo y repeticiones sin perderte nada." },
        { title: "My Pulse", body: "Tu perfil, publicaciones y contenido — una página pulida que es tuya." },
        { title: "Creator Hub", body: "Crea, publica y gestiona tu contenido desde un espacio enfocado." },
        { title: "Siempre sincronizado", body: "Todo refleja tu app móvil al instante en todos tus dispositivos." },
      ],
    },
  },
};

export function getWebAppPageCopy(locale: Locale): WebAppPageCopy {
  return copy[locale];
}
