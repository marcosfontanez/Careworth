/** Slugs for anonymous Confessions rooms — public web must not preview thread body/title. */
const CONFESSIONS_SLUGS = new Set(["confessions", "shift-confessions"]);

export function isConfessionsCommunitySlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return CONFESSIONS_SLUGS.has(slug.trim().toLowerCase());
}

export const CONFESSIONS_THREAD_WEB_TITLE = "Anonymous discussion in Confessions";
export const CONFESSIONS_THREAD_WEB_DESCRIPTION =
  "Open PulseVerse to view this discussion.";
