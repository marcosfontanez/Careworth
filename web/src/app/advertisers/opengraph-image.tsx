import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";
import { site } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Advertisers · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Advertisers",
    subtitle: "Brand-safe healthcare audience partnerships across Feed, Live, and Circles.",
    detail: site.description,
  });
}
