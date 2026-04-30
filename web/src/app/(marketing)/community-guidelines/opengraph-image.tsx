import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Community guidelines · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Community guidelines",
    subtitle: "Respectful, accurate participation on the healthcare culture network.",
  });
}
