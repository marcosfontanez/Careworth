import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Contact · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Contact",
    subtitle: "Partnerships, press, trust & safety, and early access.",
  });
}
