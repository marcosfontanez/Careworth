import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OpenInPulseverseCta } from "@/components/marketing/open-in-pulseverse-cta";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { SectionHeader } from "@/components/marketing/section-header";
import { absoluteUrl } from "@/lib/breadcrumbs";
import { createPublicSupabaseAnonClient } from "@/lib/supabase/public-anon";
import { getPublicSiteUrl } from "@/lib/site-url";
import { marketingInlineLink } from "@/lib/ui-classes";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/i;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const base = getPublicSiteUrl();
  const canonical = `${base}/communities/${encodeURIComponent(slug)}`;
  let title = `${humanizeSlug(slug)} · PulseVerse Circle`;
  let description = "Open this Circle in PulseVerse — peer communities built for healthcare workers.";

  const supabase = createPublicSupabaseAnonClient();
  if (supabase && SLUG_RE.test(slug)) {
    const { data } = await supabase.from("communities").select("name, description").eq("slug", slug).maybeSingle();
    if (data?.name) {
      title = `${data.name} · PulseVerse`;
      if (data.description?.trim()) description = clampText(data.description, 160);
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

export default async function CommunitySharePage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();

  const supabase = createPublicSupabaseAnonClient();
  let name = humanizeSlug(slug);
  let blurb =
    "Join this Circle in the PulseVerse app — discussions, shifts, and support from people who get the work.";
  let icon: string | null = null;

  if (supabase) {
    const { data, error } = await supabase.from("communities").select("name, description, icon").eq("slug", slug).maybeSingle();
    if (error || !data) notFound();
    const community = data;
    name = community.name;
    if (community.description?.trim()) blurb = clampText(community.description, 320);
    icon = community.icon ?? null;
  }

  const base = getPublicSiteUrl();
  const httpsUrl = absoluteUrl(`/communities/${slug}`);
  const appDeepLink = `pulseverse://communities/${slug}`;

  return (
    <MarketingPageShell width="medium" breadcrumbPath={`/communities/${slug}`}>
      <SectionHeader eyebrow="PulseVerse Circles" title={name} description={blurb} />
      {icon ? <p className="mt-6 text-5xl leading-none">{icon}</p> : null}
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <OpenInPulseverseCta httpsUrl={httpsUrl} appDeepLink={appDeepLink} />
      </div>
      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        New to PulseVerse?{" "}
        <a href={`${base}/download`} className={marketingInlineLink}>
          Download or request access
        </a>
        .
      </p>
    </MarketingPageShell>
  );
}
