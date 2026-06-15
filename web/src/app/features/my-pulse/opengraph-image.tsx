import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "My Pulse · PulseVerse";

export default function Image() {
  return pulseVerseOgImageResponse({
    title: "My Pulse",
    subtitle: "Your latest five updates — Thought, Clip, Link, Pics — always fresh on Pulse Page.",
  });
}
