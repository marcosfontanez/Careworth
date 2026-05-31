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
  /** Slim brand wordmark in the top bar. */
  wordmark: string;
  /** Top-bar create button. */
  createLabel: string;
  /** Open the full app in a standalone tab. */
  openNewTab: string;
  /** Account menu — open full profile / my pulse. */
  accountProfile: string;
  /** Sign out action label. */
  signOut: string;
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

/** Per-surface "coming soon to web" copy for not-yet-native routes. */
export type WebAppComingSoonCopy = {
  badge: string;
  title: string;
  body: string;
  openInApp: string;
  goToFeed: string;
};

export type WebAppFeedCopy = {
  title: string;
  subtitle: string;
  tabForYou: string;
  tabTop: string;
  emptyTitle: string;
  emptyBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  openInApp: string;
  /** Card affordances. */
  anonymousLabel: string;
  openPost: string;
  videoBadge: string;
  liveBadge: string;
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
  comingSoon: Record<Exclude<WebAppNavKey, "feed">, WebAppComingSoonCopy>;
  feed: WebAppFeedCopy;
  landing: WebAppLandingCopy;
};

const copy: Record<Locale, WebAppPageCopy> = {
  en: {
    metaTitle: "PulseVerse Web",
    metaDescription:
      "PulseVerse Web — your feed, circles, live, My Pulse, and Creator Hub in a clean, responsive browser experience. Sign in to pick up where you left off.",
    shell: {
      wordmark: "PulseVerse Web",
      createLabel: "Create",
      openNewTab: "Open in app",
      accountProfile: "My Pulse",
      signOut: "Sign out",
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
        "Browse your Feed right here — more surfaces are coming to the web soon.",
        "Everything stays in sync with the PulseVerse mobile app on your account.",
        "Tap any post to open the full view.",
      ],
      railSafetyTitle: "Healthy, respectful community",
      railSafetyBody:
        "Confessions stay anonymous, private posts stay private, and blocked accounts stay hidden — on web too.",
      railSafetyLink: "Community guidelines",
      railGetAppTitle: "Prefer mobile?",
      railGetAppBody: "Get the full PulseVerse app for iOS and Android.",
      railGetAppLink: "Get the app",
    },
    comingSoon: {
      circles: {
        badge: "Coming soon to web",
        title: "Circles is coming to the web",
        body: "Threads, replies, and communities are getting a desktop home. For now, open Circles in the app — your privacy rules carry over.",
        openInApp: "Open Circles in app",
        goToFeed: "Go to Feed",
      },
      live: {
        badge: "Coming soon to web",
        title: "Live is coming to the web",
        body: "Live rooms and replays will stream here soon. For now, catch them in the PulseVerse app.",
        openInApp: "Open Live in app",
        goToFeed: "Go to Feed",
      },
      myPulse: {
        badge: "Coming soon to web",
        title: "My Pulse is coming to the web",
        body: "Your profile, posts, and media will have a polished desktop page soon. For now, view your Pulse in the app.",
        openInApp: "Open My Pulse in app",
        goToFeed: "Go to Feed",
      },
      creatorHub: {
        badge: "Coming soon to web",
        title: "Creator Hub is coming to the web",
        body: "Creating, publishing, and managing content from the desktop is on the way. For now, create in the PulseVerse app.",
        openInApp: "Open Creator Hub in app",
        goToFeed: "Go to Feed",
      },
      notifications: {
        badge: "Coming soon to web",
        title: "Notifications are coming to the web",
        body: "Your activity and mentions will appear here soon. For now, check notifications in the app.",
        openInApp: "Open Notifications in app",
        goToFeed: "Go to Feed",
      },
      settings: {
        badge: "Coming soon to web",
        title: "Settings are coming to the web",
        body: "Account and privacy controls are getting a desktop home. For now, manage settings in the app.",
        openInApp: "Open Settings in app",
        goToFeed: "Go to Feed",
      },
    },
    feed: {
      title: "Your Feed",
      subtitle: "The latest from across PulseVerse.",
      tabForYou: "For You",
      tabTop: "Top Today",
      emptyTitle: "Your feed is warming up",
      emptyBody:
        "There’s nothing to show here yet. Follow a few creators or open the app to get started.",
      errorTitle: "We couldn’t load your feed",
      errorBody:
        "Something went wrong fetching your feed. Try again in a moment, or open the full app.",
      retry: "Try again",
      openInApp: "Open in app",
      anonymousLabel: "Anonymous",
      openPost: "Open post",
      videoBadge: "Video",
      liveBadge: "Live",
    },
    landing: {
      kicker: "PulseVerse Web",
      title: "Your PulseVerse, right in the browser",
      subtitle:
        "Your Feed in a clean, responsive web experience — with Circles, Live, My Pulse, and the Creator Hub arriving soon. No phone required.",
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
      wordmark: "PulseVerse Web",
      createLabel: "Crear",
      openNewTab: "Abrir en la app",
      accountProfile: "My Pulse",
      signOut: "Cerrar sesión",
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
        "Explora tu Feed aquí mismo — pronto llegarán más secciones a la web.",
        "Todo se mantiene sincronizado con la app móvil de PulseVerse en tu cuenta.",
        "Toca cualquier publicación para abrir la vista completa.",
      ],
      railSafetyTitle: "Comunidad sana y respetuosa",
      railSafetyBody:
        "Las confesiones siguen siendo anónimas, las publicaciones privadas siguen privadas y las cuentas bloqueadas se ocultan — también en la web.",
      railSafetyLink: "Normas de la comunidad",
      railGetAppTitle: "¿Prefieres el móvil?",
      railGetAppBody: "Consigue la app completa de PulseVerse para iOS y Android.",
      railGetAppLink: "Obtener la app",
    },
    comingSoon: {
      circles: {
        badge: "Pronto en la web",
        title: "Círculos llegará pronto a la web",
        body: "Los hilos, respuestas y comunidades tendrán su espacio en el escritorio. Por ahora, abre Círculos en la app — tus reglas de privacidad se mantienen.",
        openInApp: "Abrir Círculos en la app",
        goToFeed: "Ir al Feed",
      },
      live: {
        badge: "Pronto en la web",
        title: "En vivo llegará pronto a la web",
        body: "Las salas en vivo y repeticiones se transmitirán aquí pronto. Por ahora, míralas en la app de PulseVerse.",
        openInApp: "Abrir En vivo en la app",
        goToFeed: "Ir al Feed",
      },
      myPulse: {
        badge: "Pronto en la web",
        title: "My Pulse llegará pronto a la web",
        body: "Tu perfil, publicaciones y contenido tendrán una página pulida en el escritorio. Por ahora, mira tu Pulse en la app.",
        openInApp: "Abrir My Pulse en la app",
        goToFeed: "Ir al Feed",
      },
      creatorHub: {
        badge: "Pronto en la web",
        title: "Creator Hub llegará pronto a la web",
        body: "Crear, publicar y gestionar contenido desde el escritorio está en camino. Por ahora, crea en la app de PulseVerse.",
        openInApp: "Abrir Creator Hub en la app",
        goToFeed: "Ir al Feed",
      },
      notifications: {
        badge: "Pronto en la web",
        title: "Las notificaciones llegarán pronto a la web",
        body: "Tu actividad y menciones aparecerán aquí pronto. Por ahora, revisa las notificaciones en la app.",
        openInApp: "Abrir Notificaciones en la app",
        goToFeed: "Ir al Feed",
      },
      settings: {
        badge: "Pronto en la web",
        title: "Los ajustes llegarán pronto a la web",
        body: "Los controles de cuenta y privacidad tendrán su espacio en el escritorio. Por ahora, gestiona los ajustes en la app.",
        openInApp: "Abrir Ajustes en la app",
        goToFeed: "Ir al Feed",
      },
    },
    feed: {
      title: "Tu Feed",
      subtitle: "Lo último de todo PulseVerse.",
      tabForYou: "Para ti",
      tabTop: "Top de hoy",
      emptyTitle: "Tu feed se está preparando",
      emptyBody:
        "Aún no hay nada que mostrar aquí. Sigue a algunos creadores o abre la app para empezar.",
      errorTitle: "No pudimos cargar tu feed",
      errorBody:
        "Algo salió mal al cargar tu feed. Inténtalo de nuevo en un momento o abre la app completa.",
      retry: "Reintentar",
      openInApp: "Abrir en la app",
      anonymousLabel: "Anónimo",
      openPost: "Abrir publicación",
      videoBadge: "Vídeo",
      liveBadge: "En vivo",
    },
    landing: {
      kicker: "PulseVerse Web",
      title: "Tu PulseVerse, directo en el navegador",
      subtitle:
        "Tu Feed en una experiencia web limpia y adaptable — con Círculos, En vivo, My Pulse y el Creator Hub llegando pronto. Sin necesidad del móvil.",
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
