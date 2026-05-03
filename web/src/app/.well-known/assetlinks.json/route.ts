import { buildAndroidAssetLinks } from "@/lib/universal-links/android-asset-links";

const HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
} as const;

const PACKAGE = "com.pulseverse.app";

/**
 * Android Digital Asset Links — must return 200 + JSON array when fingerprints are configured,
 * or an empty array is valid if you have not added signing certs yet (links won’t verify).
 */
export function GET() {
  const raw = process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS?.trim();
  const fingerprints = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const body = buildAndroidAssetLinks(PACKAGE, fingerprints);
  return new Response(JSON.stringify(body), { headers: HEADERS });
}
