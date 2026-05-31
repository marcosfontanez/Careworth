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
  /** Dynamic "Trending Circles" rail card. */
  railCirclesTitle: string;
  /** Dynamic "Suggested creators" rail card. */
  railCreatorsTitle: string;
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
  tabFollowing: string;
  tabTop: string;
  emptyTitle: string;
  emptyBody: string;
  /** Shown on the Following tab when the viewer follows no one (or no recent posts). */
  followingEmptyTitle: string;
  followingEmptyBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  openInApp: string;
  /** Card affordances. */
  anonymousLabel: string;
  openPost: string;
  videoBadge: string;
  liveBadge: string;
  /** Short-form video theater controls. */
  commentsLabel: string;
  shareLabel: string;
  copiedLabel: string;
  moreLabel: string;
  soundOnLabel: string;
  soundOffLabel: string;
  playLabel: string;
  pauseLabel: string;
  nextLabel: string;
  prevLabel: string;
  textPostLabel: string;
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

/** Native My Pulse / public Pulse Page copy. */
export type WebAppProfileCopy = {
  ownerTitle: string;
  ownerSubtitle: string;
  /** Stat strip labels. */
  statFollowers: string;
  statFollowing: string;
  statPulse: string;
  /** Section headers. */
  pulseUpdatesTitle: string;
  pulseUpdatesEmpty: string;
  postsTitle: string;
  postsEmptyOwner: string;
  postsEmptyVisitor: string;
  /** Read-only / locked states. */
  privateTitle: string;
  privateBody: string;
  blockedTitle: string;
  blockedBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  /** Affordances. */
  editProfile: string;
  openInApp: string;
  backToFeed: string;
  goToFeed: string;
  openPost: string;
  videoBadge: string;
  verifiedLabel: string;
  errorTitle: string;
  errorBody: string;
};

/** Native Circles read views copy. */
export type WebAppCirclesCopy = {
  indexTitle: string;
  indexSubtitle: string;
  pinnedLabel: string;
  membersLabel: string;
  postsLabel: string;
  indexEmptyTitle: string;
  indexEmptyBody: string;
  /** Index browse affordances. */
  searchPlaceholder: string;
  searchEmpty: string;
  viewLabel: string;
  joinedLabel: string;
  featuredKicker: string;
  /** Circle detail. */
  postsSectionTitle: string;
  threadsTitle: string;
  threadsEmpty: string;
  aboutTitle: string;
  /** Thread detail. */
  repliesTitle: string;
  repliesEmpty: string;
  anonymousLabel: string;
  confessionLabel: string;
  confessionNote: string;
  /** Affordances + posting deferral. */
  openInApp: string;
  postInApp: string;
  replyInApp: string;
  joinInApp: string;
  backToCircles: string;
  backToCircle: string;
  goToFeed: string;
  openThread: string;
  unavailableTitle: string;
  unavailableBody: string;
  errorTitle: string;
  errorBody: string;
};

/** Shared engagement (follow / like) action labels. */
export type WebAppEngagementCopy = {
  follow: string;
  following: string;
  followError: string;
  like: string;
  liked: string;
  likeError: string;
};

export type WebAppCreatorHubCopy = {
  title: string;
  subtitle: string;
  /** Create tiles. */
  createTitle: string;
  uploadVideo: string;
  goLive: string;
  brollStudio: string;
  clipStudio: string;
  newPost: string;
  createNote: string;
  /** Analytics. */
  analyticsTitle: string;
  statFollowers: string;
  statFollowing: string;
  statPulse: string;
  /** Uploads. */
  uploadsTitle: string;
  uploadsEmpty: string;
  draftsTitle: string;
  draftsNote: string;
  openInApp: string;
};

export type WebAppPageCopy = {
  metaTitle: string;
  metaDescription: string;
  shell: WebAppShellCopy;
  comingSoon: Record<Exclude<WebAppNavKey, "feed">, WebAppComingSoonCopy>;
  feed: WebAppFeedCopy;
  profile: WebAppProfileCopy;
  circles: WebAppCirclesCopy;
  creatorHub: WebAppCreatorHubCopy;
  engagement: WebAppEngagementCopy;
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
      railCirclesTitle: "Trending Circles",
      railCreatorsTitle: "Suggested creators",
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
      tabFollowing: "Following",
      tabTop: "Top Today",
      emptyTitle: "Your feed is warming up",
      emptyBody:
        "There’s nothing to show here yet. Follow a few creators or open the app to get started.",
      followingEmptyTitle: "Nothing from your follows yet",
      followingEmptyBody:
        "Follow a few creators to see their latest here, or explore For You and Top Today.",
      errorTitle: "We couldn’t load your feed",
      errorBody:
        "Something went wrong fetching your feed. Try again in a moment, or open the full app.",
      retry: "Try again",
      openInApp: "Open in app",
      anonymousLabel: "Anonymous",
      openPost: "Open post",
      videoBadge: "Video",
      liveBadge: "Live",
      commentsLabel: "Comments",
      shareLabel: "Share",
      copiedLabel: "Copied",
      moreLabel: "More",
      soundOnLabel: "Unmute",
      soundOffLabel: "Mute",
      playLabel: "Play",
      pauseLabel: "Pause",
      nextLabel: "Next",
      prevLabel: "Previous",
      textPostLabel: "Post",
    },
    profile: {
      ownerTitle: "My Pulse",
      ownerSubtitle: "Your profile, updates, and media.",
      statFollowers: "Followers",
      statFollowing: "Following",
      statPulse: "Pulse",
      pulseUpdatesTitle: "Pulse updates",
      pulseUpdatesEmpty: "No Pulse updates yet.",
      postsTitle: "Posts & media",
      postsEmptyOwner: "You haven’t posted anything yet. Create your first post in the app.",
      postsEmptyVisitor: "Nothing to show here yet.",
      privateTitle: "This profile is private",
      privateBody: "This member keeps their posts and updates private.",
      blockedTitle: "Content hidden",
      blockedBody: "You’ve blocked this member, so their posts and updates are hidden here.",
      unavailableTitle: "User unavailable",
      unavailableBody: "This profile can’t be shown. It may have been removed or is not available right now.",
      editProfile: "Edit in app",
      openInApp: "Open in app",
      backToFeed: "Back to Feed",
      goToFeed: "Go to Feed",
      openPost: "Open post",
      videoBadge: "Video",
      verifiedLabel: "Verified",
      errorTitle: "We couldn’t load this profile",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
    },
    circles: {
      indexTitle: "Circles",
      indexSubtitle: "Communities and conversations across PulseVerse.",
      pinnedLabel: "Pinned",
      membersLabel: "members",
      postsLabel: "posts",
      indexEmptyTitle: "No circles yet",
      indexEmptyBody: "Circles will appear here as communities grow. Open the app to explore.",
      searchPlaceholder: "Search circles",
      searchEmpty: "No circles match your search.",
      viewLabel: "View",
      joinedLabel: "Joined",
      featuredKicker: "Featured",
      postsSectionTitle: "Circle posts",
      threadsTitle: "Discussions",
      threadsEmpty: "No discussions yet in this Circle.",
      aboutTitle: "About",
      repliesTitle: "Replies",
      repliesEmpty: "No replies yet.",
      anonymousLabel: "Anonymous",
      confessionLabel: "Confession",
      confessionNote:
        "Confessions are anonymous. Identities are hidden from other members on web too.",
      openInApp: "Open in app",
      postInApp: "Post in app",
      replyInApp: "Reply in app",
      joinInApp: "Join in app",
      backToCircles: "All Circles",
      backToCircle: "Back to Circle",
      goToFeed: "Go to Feed",
      openThread: "Open thread",
      unavailableTitle: "Circle unavailable",
      unavailableBody: "This Circle can’t be shown. It may have been removed or is not available right now.",
      errorTitle: "We couldn’t load Circles",
      errorBody: "Something went wrong. Try again in a moment, or open the full app.",
    },
    creatorHub: {
      title: "Creator Hub",
      subtitle: "Create, manage, and grow your PulseVerse.",
      createTitle: "Create",
      uploadVideo: "Upload Video",
      goLive: "Go Live",
      brollStudio: "B-roll Studio",
      clipStudio: "Clip Studio",
      newPost: "New Post",
      createNote: "Creation tools live in the PulseVerse app — tap any tile to continue there.",
      analyticsTitle: "Your stats",
      statFollowers: "Followers",
      statFollowing: "Following",
      statPulse: "Pulse Score",
      uploadsTitle: "Recent uploads",
      uploadsEmpty: "Nothing published yet. Create your first video in the app.",
      draftsTitle: "Drafts",
      draftsNote: "Drafts are managed in the app.",
      openInApp: "Open in app",
    },
    engagement: {
      follow: "Follow",
      following: "Following",
      followError: "Couldn’t update. Tap to retry.",
      like: "Like",
      liked: "Liked",
      likeError: "Couldn’t update like.",
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
      railCirclesTitle: "Círculos en tendencia",
      railCreatorsTitle: "Creadores sugeridos",
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
      tabFollowing: "Siguiendo",
      tabTop: "Top de hoy",
      emptyTitle: "Tu feed se está preparando",
      emptyBody:
        "Aún no hay nada que mostrar aquí. Sigue a algunos creadores o abre la app para empezar.",
      followingEmptyTitle: "Aún no hay nada de tus seguidos",
      followingEmptyBody:
        "Sigue a algunos creadores para ver lo último aquí, o explora Para ti y Top de hoy.",
      errorTitle: "No pudimos cargar tu feed",
      errorBody:
        "Algo salió mal al cargar tu feed. Inténtalo de nuevo en un momento o abre la app completa.",
      retry: "Reintentar",
      openInApp: "Abrir en la app",
      anonymousLabel: "Anónimo",
      openPost: "Abrir publicación",
      videoBadge: "Vídeo",
      liveBadge: "En vivo",
      commentsLabel: "Comentarios",
      shareLabel: "Compartir",
      copiedLabel: "Copiado",
      moreLabel: "Más",
      soundOnLabel: "Activar sonido",
      soundOffLabel: "Silenciar",
      playLabel: "Reproducir",
      pauseLabel: "Pausar",
      nextLabel: "Siguiente",
      prevLabel: "Anterior",
      textPostLabel: "Publicación",
    },
    profile: {
      ownerTitle: "My Pulse",
      ownerSubtitle: "Tu perfil, novedades y contenido.",
      statFollowers: "Seguidores",
      statFollowing: "Siguiendo",
      statPulse: "Pulse",
      pulseUpdatesTitle: "Novedades de Pulse",
      pulseUpdatesEmpty: "Aún no hay novedades de Pulse.",
      postsTitle: "Publicaciones y contenido",
      postsEmptyOwner: "Aún no has publicado nada. Crea tu primera publicación en la app.",
      postsEmptyVisitor: "Aún no hay nada que mostrar aquí.",
      privateTitle: "Este perfil es privado",
      privateBody: "Este miembro mantiene sus publicaciones y novedades en privado.",
      blockedTitle: "Contenido oculto",
      blockedBody: "Has bloqueado a este miembro, así que sus publicaciones y novedades están ocultas aquí.",
      unavailableTitle: "Usuario no disponible",
      unavailableBody: "No se puede mostrar este perfil. Es posible que se haya eliminado o que no esté disponible ahora mismo.",
      editProfile: "Editar en la app",
      openInApp: "Abrir en la app",
      backToFeed: "Volver al Feed",
      goToFeed: "Ir al Feed",
      openPost: "Abrir publicación",
      videoBadge: "Vídeo",
      verifiedLabel: "Verificado",
      errorTitle: "No pudimos cargar este perfil",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
    },
    circles: {
      indexTitle: "Círculos",
      indexSubtitle: "Comunidades y conversaciones en todo PulseVerse.",
      pinnedLabel: "Fijado",
      membersLabel: "miembros",
      postsLabel: "publicaciones",
      indexEmptyTitle: "Aún no hay círculos",
      indexEmptyBody: "Los círculos aparecerán aquí a medida que crezcan las comunidades. Abre la app para explorar.",
      searchPlaceholder: "Buscar círculos",
      searchEmpty: "Ningún círculo coincide con tu búsqueda.",
      viewLabel: "Ver",
      joinedLabel: "Unido",
      featuredKicker: "Destacado",
      postsSectionTitle: "Publicaciones del Círculo",
      threadsTitle: "Conversaciones",
      threadsEmpty: "Aún no hay conversaciones en este Círculo.",
      aboutTitle: "Acerca de",
      repliesTitle: "Respuestas",
      repliesEmpty: "Aún no hay respuestas.",
      anonymousLabel: "Anónimo",
      confessionLabel: "Confesión",
      confessionNote:
        "Las confesiones son anónimas. Las identidades se ocultan a los demás miembros también en la web.",
      openInApp: "Abrir en la app",
      postInApp: "Publicar en la app",
      replyInApp: "Responder en la app",
      joinInApp: "Unirse en la app",
      backToCircles: "Todos los Círculos",
      backToCircle: "Volver al Círculo",
      goToFeed: "Ir al Feed",
      openThread: "Abrir conversación",
      unavailableTitle: "Círculo no disponible",
      unavailableBody: "No se puede mostrar este Círculo. Es posible que se haya eliminado o que no esté disponible ahora mismo.",
      errorTitle: "No pudimos cargar los Círculos",
      errorBody: "Algo salió mal. Inténtalo de nuevo en un momento o abre la app completa.",
    },
    creatorHub: {
      title: "Creator Hub",
      subtitle: "Crea, gestiona y haz crecer tu PulseVerse.",
      createTitle: "Crear",
      uploadVideo: "Subir vídeo",
      goLive: "Emitir en vivo",
      brollStudio: "Estudio B-roll",
      clipStudio: "Estudio de clips",
      newPost: "Nueva publicación",
      createNote: "Las herramientas de creación están en la app de PulseVerse — toca cualquier tarjeta para continuar allí.",
      analyticsTitle: "Tus estadísticas",
      statFollowers: "Seguidores",
      statFollowing: "Siguiendo",
      statPulse: "Pulse Score",
      uploadsTitle: "Subidas recientes",
      uploadsEmpty: "Aún no has publicado nada. Crea tu primer vídeo en la app.",
      draftsTitle: "Borradores",
      draftsNote: "Los borradores se gestionan en la app.",
      openInApp: "Abrir en la app",
    },
    engagement: {
      follow: "Seguir",
      following: "Siguiendo",
      followError: "No se pudo actualizar. Toca para reintentar.",
      like: "Me gusta",
      liked: "Te gusta",
      likeError: "No se pudo actualizar el me gusta.",
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
