import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { signOutUser } from "@/app/(marketing)/login/actions";
import { Button } from "@/components/ui/button";
import { getMePageCopy } from "@/lib/marketing-copy/me-page";
import { getMarketingLocale } from "@/lib/marketing-locale-server";
import { marketingGutterX, marketingInlineLink } from "@/lib/ui-classes";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingLocale();
  const c = getMePageCopy(locale);
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    robots: { index: false, follow: false },
  };
}

export default async function MePage() {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const locale = await getMarketingLocale();
  const c = getMePageCopy(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, username, bio, avatar_url, follower_count, following_count, pulse_score_current, pulse_tier",
    )
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name?.trim() || user.email?.split("@")[0] || "Creator";
  const handle = profile?.username?.trim();
  const bio = profile?.bio?.trim();
  const avatarUrl = profile?.avatar_url?.trim();
  const pulseScore =
    typeof profile?.pulse_score_current === "number" ? Math.round(profile.pulse_score_current) : null;

  return (
    <div className={cn(marketingGutterX, "mx-auto max-w-2xl py-12 sm:py-16")}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-[0_24px_80px_-48px_rgba(20,184,166,0.35)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-white/15 bg-secondary/50 sm:size-28">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl font-bold text-muted-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {c.title}
            </h1>
            <p className="mt-1 text-lg text-foreground/90">{displayName}</p>
            {handle ? (
              <p className="text-sm text-muted-foreground">
                @{handle}
                {profile?.pulse_tier ? (
                  <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {profile.pulse_tier}
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {bio && bio.length > 0 ? bio : c.bioFallback}
            </p>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-8">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.pulseScore}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{pulseScore ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.followers}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {profile?.follower_count ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.following}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {profile?.following_count ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-10">
          <Button variant="outline" className="rounded-full border-white/15 bg-transparent" asChild>
            <Link href="/web-app">{c.browseWebApp}</Link>
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-8 text-sm">
          <form action={signOutUser}>
            <button type="submit" className={cn(marketingInlineLink, "bg-transparent font-medium")}>
              {c.signInDifferent}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
