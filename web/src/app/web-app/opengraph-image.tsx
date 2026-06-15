import { site } from "@/lib/design-tokens";
import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = `${site.name} Web Beta`;

export default function OpenGraphImage() {
  return pulseVerseOgImageResponse({
    title: "PulseVerse Web Beta",
    subtitle: "Browse Feed and more in your browser.",
    detail: site.description,
  });
}
