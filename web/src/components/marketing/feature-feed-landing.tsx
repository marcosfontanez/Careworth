import Link from "next/link";
import {
  ArrowRight,
  Check,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Radio,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  OrbitDots,
  PosterCaptionStrip,
  PosterFrame,
  SpotlightBeam,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { feedForYouTags, feedFormatPills, feedTrustPoints } from "@/mock/marketing";

export function FeatureFeedLanding() {
  return (
    <>
      <section className="relative isolate overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16">
        <WebsiteSectionBackdrop variant="deep" />
        <div className={cn(marketingGutterX, "relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16")}>
          <div>
            <p className={marketingEyebrow}>Feed</p>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.15rem]">
              Stay current with healthcare culture —{" "}
              <span className="bg-linear-to-r from-accent to-primary bg-clip-text text-transparent">
                not generic noise.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
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
              <Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/4 px-7 font-semibold">
                <Link href="/features/circles">Explore Circles</Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {feedForYouTags.map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    t === "For you"
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/4 text-muted-foreground",
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative lg:-mr-6 xl:-mr-12">
            <SpotlightBeam tone="cyan" intensity="strong" />
            <OrbitDots tone="cyan" preset="hero" />
            <PosterFrame
              src="/marketing/hero-healthcare-home.png"
              alt="PulseVerse Feed — short-form video, images, and threads tuned for healthcare on iPhone."
              width={1024}
              height={576}
              glow="cyan"
              size="dramatic"
              priority
              sizes="(max-width: 1024px) 100vw, 760px"
              tag={{ label: "Feed · iPhone" }}
            />
            <PosterCaptionStrip
              device="iPhone"
              context="Home  ·  For you  ·  Following  ·  Topic-tuned discovery"
              tone="cyan"
            />
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
