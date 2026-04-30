import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "About · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "About PulseVerse",
    subtitle: "Mission, vision, and how we build healthcare culture with trust.",
  });
}
