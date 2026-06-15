import type { Locale } from "@/lib/i18n";

export type MarketingFaqItem = { q: string; a: string };

const en: MarketingFaqItem[] = [
  {
    q: "Is PulseVerse free?",
    a: "Yes. PulseVerse is free to download and use on iOS (TestFlight beta) and Android (Google Play open testing). Optional in-app purchases such as Sparks, gifts, and profile borders are available inside the app.",
  },
  {
    q: "How do I download the app?",
    a: "Go to pulseverse.app/download — tap Join iOS beta for TestFlight on iPhone, or Join Android beta for Google Play open testing. You can also request help from the contact form if you need access.",
  },
  {
    q: "Is PulseVerse only for healthcare workers?",
    a: "No. PulseVerse is healthcare-rooted, not healthcare-only. The platform is built around healthcare culture, but students, caregivers, creators, and curious minds are welcome alongside clinicians and allied health professionals.",
  },
  {
    q: "Can caregivers, students, creators, and curious minds join?",
    a: "Yes. PulseVerse is open to anyone who wants a respectful, moderated social space with healthcare roots — from nursing students and caregivers to creators sharing stories, humor, education, and everyday moments.",
  },
  {
    q: "Is the web beta the full app?",
    a: "Not yet. Mobile app available now. Web beta expanding — start in the app for the full PulseVerse experience. The web beta currently focuses on Feed access, with more surfaces rolling out over time.",
  },
  {
    q: "What is PulseVerse?",
    a: "PulseVerse is a social platform where healthcare workers, students, caregivers, and curious minds connect — through Feed video, Circles communities, My Pulse profiles, Live, and creator tools — with moderation built for clinical culture.",
  },
  {
    q: "Can I post patient stories?",
    a: "You may share general, de-identified stories and educational moments when they do not reveal who a patient is. Never include names, faces, dates, room numbers, identifiers, or other details that could identify a specific patient.",
  },
  {
    q: "Can I post PHI?",
    a: "No. PulseVerse is not a system of record for protected health information (PHI). Do not post identifiable patient information or individually identifiable patient details. Violations may be removed or escalated.",
  },
  {
    q: "Can I give or request medical advice?",
    a: "No. Educational storytelling is welcome, but PulseVerse does not provide individualized medical advice and does not create a provider–patient relationship. Direct personal care decisions belong in proper clinical channels.",
  },
  {
    q: "How do I report content?",
    a: "Use the overflow menu on posts, comments, profiles, Circles, or Live streams. For urgent safety issues, use in-app reporting and contact paths described on our Trust & safety page (/trust) and Help Center (/support).",
  },
  {
    q: "How do gifts, Sparks, and borders work?",
    a: "Sparks are in-app currency used for gifts, shop items, and profile customization such as avatar borders. Purchases are processed by Apple or Google where applicable. Owned items stay in your inventory; shop availability may change over time.",
  },
  {
    q: "How do I delete my account?",
    a: "Open Settings in the mobile app and use the account deletion flow. Deletion removes or anonymizes account data according to our Privacy Policy, subject to safety, legal, and moderation retention requirements.",
  },
  {
    q: "Where can I read about trust, safety, and moderation?",
    a: "See /trust for reporting, moderation posture, Live safety, and appeals — alongside Community guidelines (/community-guidelines) and our Privacy Policy (/privacy).",
  },
  {
    q: "What is My Pulse?",
    a: "My Pulse is your personalized profile surface — identity, stats, vibe music, Pulse Score, and your latest updates — designed to show your vibe, not just a static résumé.",
  },
  {
    q: "How do Circles work?",
    a: "Circles are topic communities for healthcare, humor, students, caregivers, creators, and everyday life — with weekly prompts, highlights, and moderated discussions that stay active over time.",
  },
  {
    q: "Is PulseVerse HIPAA-compliant?",
    a: "PulseVerse is designed with healthcare-grade trust and safety expectations for a public social product. It is not intended as a HIPAA-covered system of record. Enterprise or BAA needs require a separate conversation with our team.",
  },
];

const es: MarketingFaqItem[] = [
  {
    q: "¿PulseVerse es gratis?",
    a: "Sí. PulseVerse es gratis para descargar y usar en iOS (beta de TestFlight) y Android (prueba abierta de Google Play). Compras opcionales como Sparks, regalos y bordes de perfil están disponibles dentro de la app.",
  },
  {
    q: "¿Cómo descargo la app?",
    a: "Entra en pulseverse.app/download — pulsa Beta iOS para TestFlight en iPhone, o Beta Android para la prueba abierta de Google Play. También puedes pedir ayuda desde el formulario de contacto.",
  },
  {
    q: "¿PulseVerse es solo para profesionales de la salud?",
    a: "No. PulseVerse tiene raíz en la salud, pero no es exclusivo de ella. La plataforma se construye alrededor de la cultura sanitaria, pero estudiantes, cuidadores, creadores y mentes curiosas son bienvenidos junto a clínicos y profesionales aliados.",
  },
  {
    q: "¿Pueden unirse cuidadores, estudiantes, creadores y mentes curiosas?",
    a: "Sí. PulseVerse está abierto a quien busque un espacio social respetuoso y moderado con raíz sanitaria — desde estudiantes de enfermería y cuidadores hasta creadores que comparten historias, humor, educación y momentos cotidianos.",
  },
  {
    q: "¿La beta web es la app completa?",
    a: "Todavía no. App móvil disponible ahora. Beta web en expansión — empieza en la app para la experiencia completa. La beta web se centra hoy en el Feed, con más superficies en camino.",
  },
  {
    q: "¿Qué es PulseVerse?",
    a: "PulseVerse es una plataforma social donde profesionales de la salud, estudiantes, cuidadores y mentes curiosas conectan — con Feed, Circles, My Pulse, Live y herramientas para creadores — con moderación pensada para la cultura clínica.",
  },
  {
    q: "¿Puedo publicar historias de pacientes?",
    a: "Puedes compartir historias generales desidentificadas y momentos educativos que no revelen quién es un paciente. Nunca incluyas nombres, rostros, fechas, habitaciones, identificadores u otros datos que permitan identificar a una persona concreta.",
  },
  {
    q: "¿Puedo publicar PHI?",
    a: "No. PulseVerse no es un sistema de registro para información de salud protegida (PHI). No publiques datos identificables del paciente. Las infracciones pueden eliminarse o escalarse.",
  },
  {
    q: "¿Puedo dar o pedir consejo médico?",
    a: "No. La divulgación educativa sí; PulseVerse no ofrece consejo médico individualizado ni crea relación proveedor–paciente. Las decisiones de atención personal van a canales clínicos adecuados.",
  },
  {
    q: "¿Cómo denuncio contenido?",
    a: "Usa el menú de opciones en publicaciones, comentarios, perfiles, Circles o transmisiones Live. Para asuntos urgentes, usa los flujos in-app y las vías descritas en /trust y /support.",
  },
  {
    q: "¿Cómo funcionan regalos, Sparks y bordes?",
    a: "Los Sparks son moneda in-app para regalos, artículos de tienda y personalización como bordes de avatar. Las compras las procesan Apple o Google cuando corresponda. Los artículos adquiridos quedan en tu inventario.",
  },
  {
    q: "¿Cómo elimino mi cuenta?",
    a: "Abre Ajustes en la app móvil y usa el flujo de eliminación de cuenta. La eliminación retira o anonimiza datos según la Política de privacidad, sujeta a retención por seguridad, legal y moderación.",
  },
  {
    q: "¿Dónde leo sobre confianza, seguridad y moderación?",
    a: "Consulta /trust para denuncias, moderación, seguridad en Live y apelaciones — junto con las normas de la comunidad (/community-guidelines) y la Política de privacidad (/privacy).",
  },
  {
    q: "¿Qué es My Pulse?",
    a: "My Pulse es tu perfil personalizado — identidad, stats, música vibe, Pulse Score y tus novedades recientes — diseñado para mostrar tu vibe, no solo un currículum estático.",
  },
  {
    q: "¿Cómo funcionan Circles?",
    a: "Circles son comunidades temáticas para salud, humor, estudiantes, cuidadores, creadores y vida cotidiana — con prompts semanales, destacados y debates moderados.",
  },
  {
    q: "¿Es PulseVerse compatible con HIPAA?",
    a: "PulseVerse se diseña con expectativas de confianza y seguridad propias de la salud para un producto social público. No está pensado como sistema cubierto por HIPAA. Necesidades enterprise o BAA requieren conversación aparte con nuestro equipo.",
  },
];

export function getMarketingFaqItems(locale: Locale): MarketingFaqItem[] {
  return locale === "es" ? es : en;
}
