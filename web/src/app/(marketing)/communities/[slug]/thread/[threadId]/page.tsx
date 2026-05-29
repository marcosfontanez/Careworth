import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { OpenInPulseverseCta } from "@/components/marketing/open-in-pulseverse-cta";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { absoluteUrl } from "@/lib/breadcrumbs";
import {
  CONFESSIONS_THREAD_WEB_DESCRIPTION,
  CONFESSIONS_THREAD_WEB_TITLE,
  isConfessionsCommunitySlug,
} from "@/lib/marketing/confessions-share";
import { createPublicSupabaseAnonClient } from "@/lib/supabase/public-anon";
import { getPublicSiteUrl } from "@/lib/site-url";
import { marketingInlineLink } from "@/lib/ui-classes";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ slug: string; threadId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, threadId } = await params;
  const base = getPublicSiteUrl();
  const canonical = `${base}/communities/${encodeURIComponent(slug)}/thread/${encodeURIComponent(threadId)}`;
  const confessionsShare = isConfessionsCommunitySlug(slug);
  let title = confessionsShare
    ? `${CONFESSIONS_THREAD_WEB_TITLE} · PulseVerse`
    : `Discussion · ${humanizeSlug(slug)} · PulseVerse`;
  let description = confessionsShare
    ? CONFESSIONS_THREAD_WEB_DESCRIPTION
    : "Open this Circle discussion in PulseVerse.";

  const supabase = createPublicSupabaseAnonClient();
  if (supabase && !confessionsShare && SLUG_RE.test(slug) && UUID_RE.test(threadId)) {
    const { data: thread } = await supabase
      .from("circle_threads_viewer_safe")
      .select("title, body")
      .eq("id", threadId)
      .maybeSingle();
    if (thread?.title) {
      title = `${thread.title} · PulseVerse`;
      if (thread.body?.trim()) description = clampText(thread.body, 160);
    }
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", siteName: "PulseVerse" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function humanizeSlug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function clampText(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default async function CircleThreadSharePage({ params }: Props) {
  const { slug, threadId } = await params;
  if (!SLUG_RE.test(slug) || !UUID_RE.test(threadId)) notFound();

  const supabase = createPublicSupabaseAnonClient();
  if (!supabase) {
    const base = getPublicSiteUrl();
    const httpsUrl = absoluteUrl(`/communities/${slug}/thread/${threadId}`);
    const appDeepLink = `pulseverse://communities/${slug}/thread/${threadId}`;
    return (
      <MarketingPageShell width="medium" breadcrumbPath={`/communities/${slug}/thread/${threadId}`}>
        <SectionHeader eyebrow="PulseVerse Circles" title="Circle discussion" description="Open this thread in the app." />
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/3 p-8">
          <OpenInPulseverseCta httpsUrl={httpsUrl} appDeepLink={appDeepLink} />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          <a href={`${base}/download`} className={marketingInlineLink}>
            Get PulseVerse
          </a>
        </p>
      </MarketingPageShell>
    );
  }

  const { data: threadRow, error: threadErr } = await supabase
    .from("circle_threads_viewer_safe")
    .select("id, title, body, community_id")
    .eq("id", threadId)
    .maybeSingle();
  if (threadErr || !threadRow) notFound();

  const { data: communityRow, error: commErr } = await supabase
    .from("communities")
    .select("slug, name")
    .eq("id", threadRow.community_id)
    .maybeSingle();
  if (commErr || !communityRow) notFound();
  if (communityRow.slug !== slug) {
    redirect(`/communities/${communityRow.slug}/thread/${threadId}`);
  }

  const confessionsShare =
    isConfessionsCommunitySlug(communityRow.slug) || isConfessionsCommunitySlug(slug);
  const teaserSnippet = confessionsShare
    ? CONFESSIONS_THREAD_WEB_DESCRIPTION
    : threadRow.body?.trim()
      ? clampText(threadRow.body, 240)
      : "Join the conversation in PulseVerse.";
  const pageTitle = confessionsShare
    ? CONFESSIONS_THREAD_WEB_TITLE
    : threadRow.title;
  const base = getPublicSiteUrl();
  const httpsUrl = absoluteUrl(`/communities/${slug}/thread/${threadId}`);
  const appDeepLink = `pulseverse://communities/${slug}/thread/${threadId}`;

  return (
    <MarketingPageShell width="medium" breadcrumbPath={`/communities/${slug}/thread/${threadId}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {confessionsShare ? "Confessions" : communityRow.name}
      </p>
      <SectionHeader
        eyebrow={confessionsShare ? "Anonymous discussion" : "Circle discussion"}
        title={pageTitle}
        description={teaserSnippet}
      />
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/3 p-8">
        <OpenInPulseverseCta httpsUrl={httpsUrl} appDeepLink={appDeepLink} />
      </div>
      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        <a href={absoluteUrl(`/communities/${slug}`)} className={marketingInlineLink}>
          About this Circle
        </a>
        {" · "}
        <a href={`${base}/download`} className={marketingInlineLink}>
          Get the app
        </a>
      </p>
    </MarketingPageShell>
  );
}
