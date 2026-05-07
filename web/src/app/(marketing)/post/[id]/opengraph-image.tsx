import { ImageResponse } from "next/og";

import { loadPostSharePublic } from "@/lib/marketing/post-share-public";

export const runtime = "nodejs";
export const alt = "PulseVerse clip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function clampLine(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Rich preview image for iMessage / social (alongside `generateMetadata` title + description). */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await loadPostSharePublic(id);

  const headline = row?.is_anonymous
    ? "Anonymous clip on PulseVerse"
    : row?.caption?.trim()
      ? clampLine(row.caption, 140)
      : "Watch this clip on PulseVerse";

  const stats = row
    ? `${Math.max(0, Math.floor(Number(row.like_count) || 0)).toLocaleString("en-US")} likes · ${Math.max(0, Math.floor(Number(row.comment_count) || 0)).toLocaleString("en-US")} comments`
    : "Open in the PulseVerse app";

  const byline = row?.creatorLine ?? "PulseVerse";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(155deg, #0b1224 0%, #020617 40%, #111a2e 100%)",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: row?.caption && !row.is_anonymous ? 52 : 48,
              fontWeight: 700,
              color: "#f8fafc",
              lineHeight: 1.2,
              letterSpacing: -0.5,
            }}
          >
            {headline}
          </div>
          <div style={{ fontSize: 30, color: "rgba(248,250,252,0.88)", fontWeight: 500 }}>{stats}</div>
          <div style={{ fontSize: 28, color: "#93c5fd", fontWeight: 600 }}>{byline}</div>
          <div style={{ marginTop: 8, fontSize: 26, color: "rgba(148,163,184,0.95)" }}>
            Tap View to watch in the app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
