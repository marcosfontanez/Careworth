import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "FAQ · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "FAQ",
    subtitle: "Pulse Page, My Pulse, Media Hub, Live, and safety — quick answers for clinicians.",
  });
}
