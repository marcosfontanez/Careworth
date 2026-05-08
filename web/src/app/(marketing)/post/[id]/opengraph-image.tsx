import { ImageResponse } from "next/og";

import {
  loadPostSharePublic,
  postShareVisualPreviewUrl,
} from "@/lib/marketing/post-share-public";
import { getPublicSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const alt = "PulseVerse clip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function clampLine(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    if (!mime.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * PNG for iMessage / social: real thumbnail (or image media) when available,
 * plus caption overlay so recipients see what the clip is before opening.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await loadPostSharePublic(id);
  const siteBase = getPublicSiteUrl();

  const previewUrl = row ? postShareVisualPreviewUrl(row, siteBase) : null;
  const bgDataUrl = previewUrl ? await fetchImageAsDataUrl(previewUrl) : null;

  const headline = row?.is_anonymous
    ? "Anonymous clip on PulseVerse"
    : row?.caption?.trim()
      ? clampLine(row.caption, 130)
      : "Watch this clip on PulseVerse";

  const stats = row
    ? `${Math.max(0, Math.floor(Number(row.like_count) || 0)).toLocaleString("en-US")} likes · ${Math.max(0, Math.floor(Number(row.comment_count) || 0)).toLocaleString("en-US")} comments`
    : "Open in the PulseVerse app";

  const byline = row?.creatorLine ?? "PulseVerse";
  const isVideo = row?.postType?.toLowerCase() === "video";
  const showPlay = Boolean(bgDataUrl && isVideo && !row?.is_anonymous);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          flexDirection: "column",
          background: "linear-gradient(155deg, #0b1224 0%, #020617 40%, #111a2e 100%)",
        }}
      >
        {bgDataUrl ? (
          <img
            alt=""
            src={bgDataUrl}
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1200,
              height: 630,
              objectFit: "cover",
            }}
          />
        ) : null}

        {bgDataUrl ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0.15) 100%)",
            }}
          />
        ) : null}

        {showPlay ? (
          <div
            style={{
              position: "absolute",
              left: 500,
              top: 215,
              width: 200,
              height: 200,
              borderRadius: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.5)",
              border: "4px solid rgba(255,255,255,0.55)",
              fontSize: 88,
              color: "rgba(255,255,255,0.95)",
              paddingLeft: 16,
            }}
          >
            ▶
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            bottom: 44,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 1050,
          }}
        >
          <div
            style={{
              fontSize: row?.caption && !row.is_anonymous ? 46 : 44,
              fontWeight: 700,
              color: "#f8fafc",
              lineHeight: 1.2,
              letterSpacing: -0.5,
              textShadow: "0 2px 20px rgba(0,0,0,0.85)",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(248,250,252,0.92)",
              fontWeight: 500,
              textShadow: "0 1px 12px rgba(0,0,0,0.8)",
            }}
          >
            {stats}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#93c5fd",
              fontWeight: 600,
              textShadow: "0 1px 12px rgba(0,0,0,0.8)",
            }}
          >
            {byline}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
