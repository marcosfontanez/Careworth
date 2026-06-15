import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Child safety standards · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "Child safety standards",
    subtitle:
      "Standards against CSAE and CSAM, in-app reporting, enforcement, and compliance commitments.",
  });
}
