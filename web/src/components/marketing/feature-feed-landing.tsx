import Link from "next/link";
import {
  ArrowRight,
  Check,
  Film,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Radio,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { feedForYouTags, feedFormatPills, feedMockPosts, feedTrustPoints } from "@/mock/marketing";

function MiniWave() {
  return (
    <svg className="h-8 w-full text-primary/60" viewBox="0 0 120 24" fill="none" aria-hidden>
      <path
        d="M0 12 H20 L24 4 L28 20 L32 6 L36 18 L40 10 H120"
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FeatureFeedLanding() {
  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full bg-primary/12 blur-[90px]" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-14 lg:grid-cols-2")}>
          <div>
            <p className={marketingEyebrow}>Feed</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem]">
              Stay current with healthcare culture —{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-primary bg-clip-text text-transparent">
                not generic noise.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Short-form video, images, and threads tuned for specialty, shift, and credibility. Discovery that respects
              how you work — with safety rails that understand medicine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className={cn("h-12 rounded-full px-7 font-semibold", shadowPrimaryCta, "bg-primary text-primary-foreground")}>
                <Link href="/download" className="inline-flex items-center gap-2">
                  Join PulseVerse
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.04] px-7 font-semibold">
                <Link href="/features/circles">Explore Circles</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {feedForYouTags.map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    t === "For you"
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className={cn("space-y-3 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.85)] p-4 ring-1 ring-white/[0.06] backdrop-blur-md")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feed preview</p>
            {feedMockPosts.map((post) => (
              <div key={post.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-[#0066ff]/40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{post.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{post.excerpt}</p>
                  </div>
                </div>
                <MiniWave />
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    {post.hearts}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-16")}>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Formats clinicians already love.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {feedFormatPills.map((f) => (
            <div key={f.title} className={cn("rounded-2xl p-6", marketingCardMuted)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                {f.title.startsWith("Video") ? <Film className="h-5 w-5" /> : null}
                {f.title.startsWith("Images") ? <ImageIcon className="h-5 w-5" /> : null}
                {f.title.startsWith("Threads") ? <MessageSquare className="h-5 w-5" /> : null}
              </div>
              <p className="mt-4 font-semibold text-foreground">{f.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={cn(marketingGutterX, "pb-20")}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={marketingEyebrow}>Trust &amp; discovery</p>
            <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">A feed that passes the ward-room test.</h2>
            <ul className="mt-6 space-y-3">
              {feedTrustPoints.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn("rounded-2xl p-8", marketingCardMuted)}>
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Radio className="h-5 w-5" />
              <span className="text-sm font-semibold">Live → Feed</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Clips and highlights from Live sessions can surface in feed with host context — so teaching moments don’t
              disappear when the stream ends.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Remix-friendly attribution
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
