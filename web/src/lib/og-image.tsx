import { ImageResponse } from "next/og";

import { site } from "@/lib/design-tokens";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const OG_CONTENT_TYPE = "image/png";

type OgOpts = {
  /** Main headline (e.g. page title). */
  title: string;
  /** Secondary line (e.g. tagline or short description). */
  subtitle?: string;
  /** Optional third line, smaller — clipped in layout if long. */
  detail?: string;
};

/** Shared PulseVerse marketing OG frame (PNG via ImageResponse). */
export function pulseVerseOgImageResponse({ title, subtitle, detail }: OgOpts) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(145deg, #050a14 0%, #0c1524 42%, #111c2e 100%)",
          padding: 56,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, color: "#64748b", letterSpacing: "0.08em" }}>{site.name}</div>
        <div style={{ marginTop: 14, fontSize: 52, fontWeight: 700, color: "#f8fafc", letterSpacing: -0.02, maxWidth: 1000, lineHeight: 1.1 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 18, fontSize: 26, color: "#94a3b8", maxWidth: 980, lineHeight: 1.35 }}>{subtitle}</div>
        ) : null}
        {detail ? (
          <div style={{ marginTop: 12, fontSize: 20, color: "#64748b", maxWidth: 960, lineHeight: 1.4 }}>{detail}</div>
        ) : null}
        <div
          style={{
            marginTop: 36,
            padding: "10px 22px",
            borderRadius: 999,
            background: "#2563eb",
            color: "#ffffff",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          {site.tagline}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
