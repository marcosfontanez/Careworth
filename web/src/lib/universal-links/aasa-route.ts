import { buildAppleAppSiteAssociation } from "@/lib/universal-links/apple-app-site-association";

const AASA_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
} as const;

export function appleAppSiteAssociationResponse(): Response {
  const appId = process.env.APPLE_UNIVERSAL_LINKS_APP_ID?.trim();
  if (!appId) {
    return new Response(
      JSON.stringify({
        error: "APPLE_UNIVERSAL_LINKS_APP_ID is not configured",
        hint: "Set to <TEAM_ID>.com.pulseverse.app on your host (e.g. Vercel env).",
      }),
      { status: 503, headers: { ...AASA_HEADERS, "Cache-Control": "no-store" } },
    );
  }
  return new Response(JSON.stringify(buildAppleAppSiteAssociation(appId)), { headers: AASA_HEADERS });
}
