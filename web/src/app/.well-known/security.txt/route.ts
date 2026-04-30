import { getSecurityEmail } from "@/lib/site-constants";
import { getPublicSiteUrl } from "@/lib/site-url";

/** RFC 9116 — served dynamically so the contact tracks env in each deployment. */
export function GET() {
  const base = getPublicSiteUrl();
  const contact = getSecurityEmail();
  const body = [
    `Contact: mailto:${contact}`,
    "Expires: 2027-12-31T23:59:59.000Z",
    "Preferred-Languages: en",
    `Canonical: ${base}/.well-known/security.txt`,
    `Policy: ${base}/trust`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
