import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";
import { site } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Download · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Join PulseVerse free",
    subtitle: "iOS TestFlight · Android open testing · Web beta",
    detail: site.description,
  });
}
