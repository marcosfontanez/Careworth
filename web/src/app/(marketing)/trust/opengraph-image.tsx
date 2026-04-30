import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Trust & safety · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Trust & safety",
    subtitle: "Moderation, reporting, and how we protect healthcare culture on PulseVerse.",
  });
}
