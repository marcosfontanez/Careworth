import { site } from "@/lib/design-tokens";
import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, pulseVerseOgImageResponse } from "@/lib/og-image";

export const runtime = "nodejs";

export const alt = site.name;

export const size = OG_IMAGE_SIZE;

export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return pulseVerseOgImageResponse({
    title: site.name,
    subtitle: site.tagline,
    detail: site.description,
  });
}
