import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Pulse Page · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Pulse Page",
    subtitle: "Your identity home — Current Vibe, My Pulse, and Media Hub together.",
  });
}
