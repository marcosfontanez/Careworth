import type { Locale } from "@/lib/i18n";

export type MarketingFaqItem = { q: string; a: string };

const en: MarketingFaqItem[] = [
  {
    q: "How do I download PulseVerse?",
    a: "Go to pulseverse.app/download — tap Join iOS beta for TestFlight on iPhone, or Join Android beta for Google Play open testing. You can also request an invite from the contact form if you need help getting access.",
  },
  {
    q: "What is PulseVerse?",
    a: "A social platform for healthcare professionals — Feed, Circles, Live, and Pulse Page (with My Pulse and Media Hub) — with moderation built for clinical culture.",
  },
  {
    q: "Who is PulseVerse for?",
    a: "Licensed or training healthcare professionals and aligned teams — from bedside to classroom — who want culture, not another corporate directory.",
  },
  {
    q: "What is Pulse Page?",
    a: "Your identity home: expressive profile, Current Vibe (mini music player), My Pulse (your latest five updates), and Media Hub (recent videos, favorites, photos) — a living page, not a static résumé.",
  },
  {
    q: "How does My Pulse work?",
    a: "Only your five most recent My Pulse items are visible on your Pulse Page. New posts appear at the top; when you add a sixth, the oldest visible item drops off — so your profile stays fresh.",
  },
  {
    q: "What can I post to My Pulse?",
    a: "Thought (short updates), Clip (from your PulseVerse posts or saves from the Feed), Link (external URLs with optional commentary), and Pics (photo moments). Clips stay inside PulseVerse — they are not arbitrary external video uploads.",
  },
  {
    q: "What is Current Vibe?",
    a: "A premium mini music player on your Pulse Page showing what you are listening to — part of your identity and the atmosphere of your profile.",
  },
  {
    q: "What is Media Hub?",
    a: "The personal media library on Pulse Page: Recent Videos, Favorites, and My Photos in one compact grid.",
  },
  {
    q: "How is the Live tab organized?",
    a: "Featured Live, Top Live Now, Rising Lives, and Browse by Topic — emphasis on what’s broadcasting and gaining momentum now, not a schedule-first webinar experience.",
  },
  {
    q: "How do I verify my account?",
    a: "Verification paths vary by region and credential type. Start from Settings → Verification and follow the guided checklist.",
  },
  {
    q: "How do I report content?",
    a: "Use the overflow menu on posts, comments, or profiles. For live streams, flag from the player — live incidents are prioritized.",
  },
  {
    q: "Where can I read about trust, safety, and moderation?",
    a: "See the Trust & safety overview on our public site at /trust — it summarizes reporting, moderation posture, and how we approach healthcare culture, with links to Community guidelines, Privacy, FAQ, and Support.",
  },
  {
    q: "Does PulseVerse publish a high-level safety overview for clinicians or partners?",
    a: "Yes. The /trust page is the starting point for teams evaluating the network — alongside our Community guidelines for enforceable norms and Privacy Policy for data practices.",
  },
  {
    q: "Is PulseVerse HIPAA-compliant?",
    a: "The product is designed with healthcare-grade trust and safety expectations. Specific compliance posture depends on your deployment and BAA needs — talk to us for enterprise health pathways.",
  },
  {
    q: "Can I post identifiable patient information (PHI)?",
    a: "No. PulseVerse is not a system of record for PHI. Do not post identifiable patient information; violations may be removed or escalated.",
  },
  {
    q: "How does moderation work?",
    a: "Reports flow into trained moderator queues with severity, category, and live tooling. Appeals capture context for review. For a public overview, see our Trust & safety page (/trust).",
  },
  {
    q: "Can I use PulseVerse for medical advice?",
    a: "No. Educational storytelling is welcome; individualized medical advice belongs in proper clinical channels. Community guidelines spell this out.",
  },
  {
    q: "How do Circles differ from generic forums?",
    a: "Circles are healthcare-native topic spaces with moderated, high-signal threads — connected to Pulse Page and easy to repost into My Pulse — without old-school forum energy.",
  },
  {
    q: "Is PulseVerse free?",
    a: "Yes. PulseVerse is free to download and use on iOS (TestFlight beta) and Android (Google Play open testing).",
  },
  {
    q: "Is there a free social app for nurses?",
    a: "Yes — PulseVerse is a free social app built for nurses and the wider healthcare community to share short videos, connect, and join moderated communities. See pulseverse.app/for/nurses.",
  },
  {
    q: "What is a good TikTok or Instagram alternative for healthcare workers?",
    a: "PulseVerse is a free, healthcare-only alternative — short videos and updates with clinical-culture moderation instead of a general-audience feed. See pulseverse.app/compare.",
  },
  {
    q: "Is there a social app for doctors or medical students?",
    a: "Yes. PulseVerse welcomes physicians, residents, and medical and nursing students. See pulseverse.app/for/doctors and pulseverse.app/for/medical-students.",
  },
];

const es: MarketingFaqItem[] = [
  {
    q: "¿Cómo descargo PulseVerse?",
    a: "Entra en pulseverse.app/download — pulsa Beta iOS para TestFlight en iPhone, o Beta Android para la prueba abierta de Google Play. También puedes solicitar invitación desde el formulario de contacto.",
  },
  {
    q: "¿Qué es PulseVerse?",
    a: "Una red social para profesionales de la salud: Feed, Circles, Live y Pulse Page (con My Pulse y Media Hub), con moderación pensada para la cultura clínica.",
  },
  {
    q: "¿Para quién es PulseVerse?",
    a: "Profesionales en ejercicio o en formación y equipos alineados — desde la cabecera hasta el aula — que buscan cultura, no otro directorio corporativo.",
  },
  {
    q: "¿Qué es Pulse Page?",
    a: "Tu casa de identidad: perfil expresivo, Current Vibe (mini reproductor), My Pulse (tus cinco novedades más recientes) y Media Hub (vídeos recientes, favoritos, fotos): una página viva, no un currículum estático.",
  },
  {
    q: "¿Cómo funciona My Pulse?",
    a: "Solo se ven en tu Pulse Page los cinco elementos más recientes de My Pulse. Lo nuevo arriba; al publicar un sexto, el más antiguo deja de mostrarse — así el perfil se mantiene fresco.",
  },
  {
    q: "¿Qué puedo publicar en My Pulse?",
    a: "Thought (notas breves), Clip (desde tus publicaciones en PulseVerse o guardados del Feed), Link (URLs externas con comentario opcional) y Pics (momentos en foto). Los clips se quedan dentro de PulseVerse: no son subidas de vídeo externas arbitrarias.",
  },
  {
    q: "¿Qué es Current Vibe?",
    a: "Un mini reproductor premium en tu Pulse Page con lo que estás escuchando — parte de tu identidad y del ambiente del perfil.",
  },
  {
    q: "¿Qué es Media Hub?",
    a: "La biblioteca personal en Pulse Page: vídeos recientes, favoritos y mis fotos en una cuadrícula compacta.",
  },
  {
    q: "¿Cómo está organizada la pestaña Live?",
    a: "Destacados, Top en vivo ahora, en ascenso y explorar por tema — énfasis en lo que emite y gana impulso ahora, no una parrilla solo de webinars.",
  },
  {
    q: "¿Cómo verifico mi cuenta?",
    a: "Las rutas dependen de región y tipo de credencial. Empieza en Ajustes → Verificación y sigue la lista guiada.",
  },
  {
    q: "¿Cómo denuncio contenido?",
    a: "Usa el menú de opciones en publicaciones, comentarios o perfiles. En directos, marca desde el reproductor: los incidentes en vivo tienen prioridad.",
  },
  {
    q: "¿Dónde leo sobre confianza, seguridad y moderación?",
    a: "Consulta la página de confianza y seguridad en /trust: resume denuncias, postura de moderación y cultura sanitaria, con enlaces a normas de la comunidad, privacidad, FAQ y ayuda.",
  },
  {
    q: "¿PulseVerse publica una vista general de seguridad para clínicos o socios?",
    a: "Sí. /trust es el punto de partida para equipos que evalúan la red, junto con las normas de la comunidad y la política de privacidad.",
  },
  {
    q: "¿Es PulseVerse compatible con HIPAA?",
    a: "El producto se diseña con expectativas de confianza y seguridad propias de la salud. El cumplimiento concreto depende de tu despliegue y necesidad de BAA — hablemos para vías enterprise.",
  },
  {
    q: "¿Puedo publicar información identificable del paciente (PHI)?",
    a: "No. PulseVerse no es un sistema de registro para PHI. No publiques datos identificables; las infracciones pueden eliminarse o escalarse.",
  },
  {
    q: "¿Cómo funciona la moderación?",
    a: "Las denuncias van a colas de moderadores con gravedad, categoría y herramientas para Live. Los recursos aportan contexto. Vista general pública en /trust.",
  },
  {
    q: "¿Puedo usar PulseVerse para consejo médico?",
    a: "No. La divulgación educativa sí; el consejo médico individualizado va a canales clínicos adecuados. Las normas de la comunidad lo concretan.",
  },
  {
    q: "¿En qué se diferencian Circles de foros genéricos?",
    a: "Circles son espacios temáticos propios de la salud, con hilos moderados y de alta señal, enlaces a Pulse Page y fácil republicación a My Pulse — sin la dinámica de foros antiguos.",
  },
  {
    q: "¿PulseVerse es gratis?",
    a: "Sí. PulseVerse es gratis para descargar y usar en iOS (beta de TestFlight) y Android (prueba abierta de Google Play).",
  },
  {
    q: "¿Hay una app social gratis para enfermeras?",
    a: "Sí — PulseVerse es una app social gratuita para enfermeras y la comunidad sanitaria: comparte vídeos cortos, conecta y únete a comunidades moderadas. Ver pulseverse.app/for/nurses.",
  },
  {
    q: "¿Cuál es una buena alternativa a TikTok o Instagram para sanitarios?",
    a: "PulseVerse es una alternativa gratuita y solo sanitaria: vídeos cortos y novedades con moderación de cultura clínica en lugar de un feed de audiencia general. Ver pulseverse.app/compare.",
  },
  {
    q: "¿Hay una app social para médicos o estudiantes de medicina?",
    a: "Sí. PulseVerse da la bienvenida a médicos, residentes y estudiantes de medicina y enfermería. Ver pulseverse.app/for/doctors y pulseverse.app/for/medical-students.",
  },
];

export function getMarketingFaqItems(locale: Locale): MarketingFaqItem[] {
  return locale === "es" ? es : en;
}
