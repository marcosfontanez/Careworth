import type { Locale } from "@/lib/i18n";

export type AdvertisersDiff = { title: string; body: string };
export type AdvertisersAudience = { title: string; count: string; body: string; tint: string };
export type AdvertisersPlacement = { title: string; body: string };
export type AdvertisersDrive = { title: string; body: string };
export type AdvertisersSolution = { title: string };
export type AdvertisersDeliverable = { title: string; body: string };
export type AdvertisersReportingPillar = { title: string; body: string };

export type AdvertisersLandingCopy = {
  hero: {
    eyebrow: string;
    titleBefore: string;
    titleGradient: string;
    body: string;
    ctaMediaKit: string;
    ctaPartnerships: string;
  };
  preview: {
    feedLabel: string;
    sponsoredLine: string;
    liveLabel: string;
    lowerThird: string;
  };
  whyEyebrow: string;
  whyTitle: string;
  differentiation: readonly AdvertisersDiff[];
  whyFooter: string;
  audiencesTitle: string;
  audiences: readonly AdvertisersAudience[];
  scaleEyebrow: string;
  scaleStats: readonly string[];
  drivesTitle: string;
  driveEngagement: readonly AdvertisersDrive[];
  placementsEyebrow: string;
  placementsTitle: string;
  placements: readonly AdvertisersPlacement[];
  safeEyebrow: string;
  safeTitle: string;
  safetyChecks: readonly string[];
  solutionsTitle: string;
  solutions: readonly AdvertisersSolution[];
  partnerSheet: {
    eyebrow: string;
    title: string;
    intro: string;
    deliverables: readonly AdvertisersDeliverable[];
    reportingTitle: string;
    reporting: readonly AdvertisersReportingPillar[];
    disclaimer: string;
  };
  bottomCta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
};

const enAudiences: AdvertisersLandingCopy["audiences"] = [
  {
    title: "Nurses",
    count: "450K+ professionals",
    body: "Shift culture, floor humor, and education that respects the bedside.",
    tint: "from-sky-500/20 to-blue-900/40",
  },
  {
    title: "Physicians & APPs",
    count: "280K+ professionals",
    body: "Specialty depth, debate, and live teaching without generic noise.",
    tint: "from-primary/25 to-slate-900/50",
  },
  {
    title: "Pharmacists",
    count: "110K+ professionals",
    body: "Drug information, adherence stories, and collaborative care threads.",
    tint: "from-emerald-500/20 to-slate-900/45",
  },
  {
    title: "Allied health",
    count: "120K+ professionals",
    body: "Imaging, lab, therapy, and operations — the whole care team.",
    tint: "from-violet-500/20 to-slate-900/45",
  },
];

const en: AdvertisersLandingCopy = {
  hero: {
    eyebrow: "Advertisers & partners",
    titleBefore: "Reach healthcare",
    titleGradient: "where culture lives.",
    body: "PulseVerse is the premium healthcare audience platform where professionals learn, connect, and lead — with moderation and category fit baked in.",
    ctaMediaKit: "Request media kit",
    ctaPartnerships: "Talk to partnerships",
  },
  preview: {
    feedLabel: "Feed preview",
    sponsoredLine: "Sponsored insight card {n} · cards / clips / live",
    liveLabel: "Live placement",
    lowerThird: "Brand lower-third · verified host",
  },
  whyEyebrow: "Why healthcare brands start here",
  whyTitle: "A credible media-kit entry — built for HCP attention, not generic impressions.",
  differentiation: [
    {
      title: "Healthcare-native, not borrowed social",
      body: "The Feed, Circles, Live, and Pulse Page model is built for licensed culture — not consumer timelines retrofitted with a blue check.",
    },
    {
      title: "Premium creator + community environment",
      body: "Hosts, educators, and clinicians show up with real identity surfaces — Pulse Page, My Pulse, Media Hub — so brands sit next to credible voices.",
    },
    {
      title: "Trust & safety with clinical context",
      body: "Moderation queues, live escalation, and appeals are designed for how healthcare audiences actually debate and learn.",
    },
    {
      title: "Roadmap: credible Data & Insights",
      body: "Directional reach, resonance, and segment reporting is being built with consent boundaries — ask partnerships for the latest partner analytics posture.",
    },
  ],
  whyFooter:
    "Placements span the surfaces clinicians already trust: Feed cards, Pulse Page frames, Live sponsorships with moderator review, and Circles headers where specialty culture concentrates — with audience segmentation language that respects role, specialty, and shift context.",
  audiencesTitle: "Premium access to healthcare's most influential audiences.",
  audiences: enAudiences,
  scaleEyebrow: "Scale",
  scaleStats: [
    "850K+ healthcare professionals",
    "190+ countries",
    "25K+ active Circles",
    "3.7K+ Live sessions hosted",
  ],
  drivesTitle: "What drives engagement",
  driveEngagement: [
    { title: "Peer knowledge", body: "Specialty rooms and threaded expertise." },
    { title: "Live education", body: "CME-style moments with interactive Q&A." },
    { title: "Career signals", body: "Roles, growth, and mentorship visibility." },
    { title: "Real-world insight", body: "Stories that reflect how care actually feels." },
  ],
  placementsEyebrow: "High-impact ad placements",
  placementsTitle: "Formats built for clinician attention",
  placements: [
    { title: "Sponsored feed", body: "Native cards that match clinician reading patterns." },
    { title: "Pulse Page takeover", body: "Brand-forward frames on high-trust profiles." },
    { title: "Live sponsorships", body: "Lower-thirds and labels with moderator review." },
    { title: "Circles headers", body: "Community surfaces where specialty culture gathers." },
  ],
  safeEyebrow: "Brand safe · clinician trusted",
  safeTitle: "Your brand next to content that passes the ward-room test.",
  safetyChecks: [
    "100% professional community",
    "Human content moderation",
    "No DTC pharma spam lanes",
    "Transparent placement labels",
    "Appeals & brand escalation paths",
  ],
  solutionsTitle: "Partnership solutions",
  solutions: [
    { title: "Sponsored feed" },
    { title: "Creator collabs" },
    { title: "Circles sponsorships" },
    { title: "Live partnerships" },
    { title: "Campaign reporting" },
  ],
  partnerSheet: {
    eyebrow: "For your RFP or leadership review",
    title: "Partner deliverables & reporting",
    intro:
      "We can package materials for procurement, legal, and brand safety teams. Final metrics, segment definitions, and pricing are aligned with your objectives and privacy requirements — ask partnerships for the latest partner data posture.",
    deliverables: [
      {
        title: "Positioning & placement one-pager",
        body: "Audiences, surfaces (Feed, Live, Circles, Pulse Page), and how sponsored units are labeled.",
      },
      {
        title: "Moderation & escalation overview",
        body: "How professional content is reviewed, live escalation, and paths for brand concerns.",
      },
      {
        title: "Illustrative flight structure",
        body: "Example pacing, creative specs, and preview workflow — customized per campaign.",
      },
      {
        title: "Post-campaign summary",
        body: "Directional reach, engagement, and context narrative as available for your flight.",
      },
    ],
    reportingTitle: "What we aim to report",
    reporting: [
      {
        title: "Exposure & attention",
        body: "Reach-style and frequency signals where policy and instrumentation allow — not vanity bot traffic.",
      },
      {
        title: "Engagement quality",
        body: "Saves, shares, dwell, and other signals that reflect clinician interest rather than accidental taps.",
      },
      {
        title: "Contextual sponsorships",
        body: "Live and Circles alignment with specialty and education topics you care about.",
      },
      {
        title: "Professional segmentation",
        body: "Role- and specialty-oriented language — never patient-level targeting.",
      },
    ],
    disclaimer:
      "Figures on this page are directional and rounded for storytelling. Verified audience metrics, segment definitions, geo splits, and rate cards are provided under NDA by partnerships and may differ by market, format, and inventory.",
  },
  bottomCta: {
    title: "Let's build something meaningful together.",
    description: "Media kits, partnership pilots, and brand-safe placements — start with a conversation.",
    primaryLabel: "Request media kit",
    secondaryLabel: "Talk to partnerships",
  },
};

const es: AdvertisersLandingCopy = {
  hero: {
    eyebrow: "Anunciantes y socios",
    titleBefore: "Llega a la sanidad",
    titleGradient: "donde vive la cultura.",
    body: "PulseVerse es la plataforma premium de audiencias sanitarias donde los profesionales aprenden, conectan y lideran — con moderación y encaje de categoría integrados.",
    ctaMediaKit: "Solicitar media kit",
    ctaPartnerships: "Hablar con alianzas",
  },
  preview: {
    feedLabel: "Vista previa del Feed",
    sponsoredLine: "Tarjeta patrocinada {n} · tarjetas / clips / live",
    liveLabel: "Ubicación en Live",
    lowerThird: "Tercio inferior de marca · anfitrión verificado",
  },
  whyEyebrow: "Por qué las marcas sanitarias empiezan aquí",
  whyTitle: "Una entrada creíble al media kit — pensada para la atención del profesional sanitario, no para impresiones genéricas.",
  differentiation: [
    {
      title: "Nativa de la sanidad, no red prestada",
      body: "Feed, Circles, Live y Pulse Page están pensados para la cultura colegiada — no hilos de consumo con un cheque azul añadido.",
    },
    {
      title: "Entorno premium de creadores y comunidad",
      body: "Anfitriones, formadores y clínicos con superficies de identidad reales — Pulse Page, My Pulse, Media Hub — para que la marca se siente junto a voces creíbles.",
    },
    {
      title: "Confianza y seguridad con contexto clínico",
      body: "Colas de moderación, escalado en vivo y apelaciones diseñadas para cómo las audiencias sanitarias debaten y aprenden de verdad.",
    },
    {
      title: "Hoja de ruta: Data & Insights creíble",
      body: "Alcance direccional, resonancia e informes por segmentos se construyen con límites de consentimiento — pide a alianzas la postura analítica más reciente.",
    },
  ],
  whyFooter:
    "Las ubicaciones cubren las superficies en las que ya confían los clínicos: tarjetas en Feed, marcos en Pulse Page, patrocinios en Live con revisión de moderador y cabeceras en Circles donde se concentra la cultura por especialidad — con lenguaje de segmentación que respeta rol, especialidad y turno.",
  audiencesTitle: "Acceso premium a las audiencias sanitarias más influyentes.",
  audiences: [
    { ...enAudiences[0]!, title: "Enfermería", count: "450K+ profesionales", body: "Cultura de turno, humor de planta y formación que respeta el lado de la cama." },
    { ...enAudiences[1]!, title: "Médicos y APP", count: "280K+ profesionales", body: "Profundidad de especialidad, debate y docencia en vivo sin ruido genérico." },
    { ...enAudiences[2]!, title: "Farmacia", count: "110K+ profesionales", body: "Información sobre fármacos, historias de adherencia e hilos de cuidado colaborativo." },
    { ...enAudiences[3]!, title: "Profesiones aliadas", count: "120K+ profesionales", body: "Imagen, laboratorio, terapia y operaciones — todo el equipo asistencial." },
  ],
  scaleEyebrow: "Escala",
  scaleStats: [
    "850K+ profesionales de la salud",
    "190+ países",
    "25K+ Circles activos",
    "3.7K+ sesiones Live alojadas",
  ],
  drivesTitle: "Qué impulsa el compromiso",
  driveEngagement: [
    { title: "Conocimiento entre pares", body: "Salas por especialidad y experiencia en hilo." },
    { title: "Formación en vivo", body: "Momentos estilo CME con Q&A interactiva." },
    { title: "Señales de carrera", body: "Roles, crecimiento y visibilidad de mentoría." },
    { title: "Visión del mundo real", body: "Historias que reflejan cómo se siente el cuidado." },
  ],
  placementsEyebrow: "Ubicaciones publicitarias de alto impacto",
  placementsTitle: "Formatos pensados para la atención clínica",
  placements: [
    { title: "Feed patrocinado", body: "Tarjetas nativas que siguen cómo leen los clínicos." },
    { title: "Takeover de Pulse Page", body: "Marcos con fuerza de marca en perfiles de alta confianza." },
    { title: "Patrocinios en Live", body: "Tercios inferiores y etiquetas con revisión del moderador." },
    { title: "Cabeceras en Circles", body: "Superficies donde se concentra la cultura por especialidad." },
  ],
  safeEyebrow: "Marca segura · confianza clínica",
  safeTitle: "Tu marca junto a contenido que supera la prueba del vestuario.",
  safetyChecks: [
    "Comunidad 100 % profesional",
    "Moderación humana del contenido",
    "Sin carriles de spam pharma DTC",
    "Etiquetas transparentes de ubicación",
    "Apelaciones y escalado de marca",
  ],
  solutionsTitle: "Soluciones de asociación",
  solutions: [
    { title: "Feed patrocinado" },
    { title: "Colaboraciones con creadores" },
    { title: "Patrocinios en Circles" },
    { title: "Alianzas en Live" },
    { title: "Informes de campaña" },
  ],
  partnerSheet: {
    eyebrow: "Para tu RFP o revisión interna",
    title: "Entregables para socios e informes",
    intro:
      "Podemos empaquetar materiales para compras, legal y brand safety. Las métricas finales, definiciones de segmentos y precios se alinean con tus objetivos y requisitos de privacidad — pide a alianzas la postura de datos más reciente.",
    deliverables: [
      {
        title: "One-pager de posicionamiento y ubicaciones",
        body: "Audiencias, superficies (Feed, Live, Circles, Pulse Page) y cómo se etiquetan las unidades patrocinadas.",
      },
      {
        title: "Resumen de moderación y escalado",
        body: "Cómo se revisa el contenido profesional, escalado en vivo y vías para dudas de marca.",
      },
      {
        title: "Estructura de vuelo ilustrativa",
        body: "Ejemplo de pacing, especificaciones creativas y flujo de preview — personalizado por campaña.",
      },
      {
        title: "Informe post-campaña",
        body: "Alcance direccional, engagement y narrativa de contexto según disponibilidad para tu vuelo.",
      },
    ],
    reportingTitle: "Qué aspiramos a informar",
    reporting: [
      {
        title: "Exposición y atención",
        body: "Señales estilo alcance y frecuencia donde la política y la instrumentación lo permitan — no tráfico bot vanidoso.",
      },
      {
        title: "Calidad de engagement",
        body: "Guardados, compartidos, tiempo de permanencia y otras señales de interés clínico.",
      },
      {
        title: "Patrocinios contextuales",
        body: "Alineación en Live y Circles con especialidad y temas educativos que te importan.",
      },
      {
        title: "Segmentación profesional",
        body: "Lenguaje por rol y especialidad — nunca orientación a nivel de paciente.",
      },
    ],
    disclaimer:
      "Las cifras de esta página son direccionales y redondeadas para la narrativa. Métricas de audiencia verificadas, definiciones de segmento, splits geográficos y tarifas se proporcionan bajo NDA por alianzas y pueden variar según mercado, formato e inventario.",
  },
  bottomCta: {
    title: "Construyamos algo con sentido juntos.",
    description: "Media kits, pilotos de alianza y ubicaciones seguras para marca — empieza con una conversación.",
    primaryLabel: "Solicitar media kit",
    secondaryLabel: "Hablar con alianzas",
  },
};

export function getAdvertisersLandingCopy(locale: Locale): AdvertisersLandingCopy {
  return locale === "es" ? es : en;
}
