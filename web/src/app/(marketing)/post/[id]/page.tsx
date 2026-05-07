import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostShareAppGate } from "@/components/marketing/post-share-app-gate";
import { PostShareWebPreview } from "@/components/marketing/post-share-web-preview";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { absoluteUrl } from "@/lib/breadcrumbs";
import {
  buildPostShareOg,
  loadPostSharePublic,
  POST_SHARE_UUID_RE,
} from "@/lib/marketing/post-share-public";
import { getPublicSiteUrl } from "@/lib/site-url";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const base = getPublicSiteUrl();
  const canonical = `${base}/post/${encodeURIComponent(id)}`;

  const row = await loadPostSharePublic(id);
  if (!row) {
    return {
      title: "Clip · PulseVerse",
      description: "Watch this clip in the PulseVerse app.",
      alternates: { canonical },
      openGraph: {
        url: canonical,
        siteName: "PulseVerse",
        type: "website",
        title: "Clip · PulseVerse",
        description: "Watch this clip in the PulseVerse app.",
      },
      twitter: {
        card: "summary_large_image",
        title: "Clip · PulseVerse",
        description: "Watch this clip in the PulseVerse app.",
      },
    };
  }

  const { title, description } = buildPostShareOg(row, base);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "PulseVerse",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PostSharePage({ params }: Props) {
  const { id } = await params;
  if (!POST_SHARE_UUID_RE.test(id)) notFound();

  const row = await loadPostSharePublic(id);

  const base = getPublicSiteUrl().replace(/\/$/, "");
  const httpsOpenUrl = absoluteUrl(`/post/${id}`);
  const appDeepLink = `pulseverse://post/${id}`;
  const downloadUrl = `${base}/download`;

  return (
    <MarketingPageShell width="medium" breadcrumbPath={`/post/${id}`}>
      <SectionHeader
        eyebrow="PulseVerse"
        title={row ? "Watch this in the app" : "Open this clip in PulseVerse"}
        description={
          row
            ? "Preview below — tap View to open this clip in PulseVerse. No app yet? Get PulseVerse first, then open this link again."
            : "Clips play in the PulseVerse app. Install below if you need it, then open this same link — it will jump straight to the video."
        }
      />

      <div className="mt-8 space-y-10">
        {row ? (
          <PostShareWebPreview post={row} httpsOpenUrl={httpsOpenUrl} downloadUrl={downloadUrl} />
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/3 p-8">
          <PostShareAppGate appDeepLink={appDeepLink} downloadUrl={downloadUrl} />
        </div>
      </div>
    </MarketingPageShell>
  );
}
