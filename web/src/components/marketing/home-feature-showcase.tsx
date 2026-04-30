import Link from "next/link";
import { ArrowRight, Circle, LayoutList, Radio, Rss } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";
import { getHomeFeatureShowcaseCopy } from "@/lib/marketing-copy/home-feature-showcase";
import { marketingGutterX, marketingCardInteractive, marketingInlineLinkStrong } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function FeedPreview() {
  return (
    <div className="space-y-2 rounded-lg bg-black/30 p-2">
      <div className="flex gap-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/30" />
        <div className="flex-1 space-y-1">
          <div className="h-2 rounded bg-white/15" />
          <div className="h-2 w-[80%] rounded bg-white/5" />
        </div>
      </div>
      <div className="h-16 rounded-md bg-gradient-to-r from-primary/20 to-transparent" />
    </div>
  );
}

function CirclesPreview() {
  return (
    <div className="space-y-1.5 rounded-lg bg-black/30 p-2 text-[10px] text-muted-foreground">
      {["#Cardiology", "#Nursing Life", "#Night Shift"].map((t) => (
        <div key={t} className="flex justify-between rounded-md bg-white/[0.04] px-2 py-1.5">
          <span className="font-medium text-foreground">{t}</span>
          <span>12.4K</span>
        </div>
      ))}
    </div>
  );
}

function LivePreview({ liveLabel }: { liveLabel: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-black/30">
      <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-violet-950/80 to-background">
        <span
          className="rounded-md bg-red-900 px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ color: "#ffffff" }}
        >
          {liveLabel}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 text-[10px] text-white">1.2K</span>
      </div>
    </div>
  );
}

function MyPulsePreview({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-black/30 p-2">
      {rows.map(([tag, line]) => (
        <div
          key={`${tag}-${line}`}
          className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 text-[10px]"
        >
          <span className="rounded bg-primary/20 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-primary">
            {tag}
          </span>
          <span className="truncate text-muted-foreground">{line}</span>
        </div>
      ))}
    </div>
  );
}

export function HomeFeatureShowcase({ locale }: { locale: Locale }) {
  const t = getHomeFeatureShowcaseCopy(locale);

  const cards = [
    {
      href: "/features/feed",
      icon: Rss,
      title: t.cards.feed.title,
      desc: t.cards.feed.desc,
      preview: <FeedPreview />,
    },
    {
      href: "/features/circles",
      icon: Circle,
      title: t.cards.circles.title,
      desc: t.cards.circles.desc,
      preview: <CirclesPreview />,
    },
    {
      href: "/features/live",
      icon: Radio,
      title: t.cards.live.title,
      desc: t.cards.live.desc,
      preview: <LivePreview liveLabel={t.liveLabel} />,
    },
    {
      href: "/features/my-pulse",
      icon: LayoutList,
      title: t.cards.myPulse.title,
      desc: t.cards.myPulse.desc,
      preview: <MyPulsePreview rows={t.myPulseRows} />,
    },
  ];

  return (
    <section
      className={cn(
        "border-t border-[rgba(148,163,184,0.08)] py-20 sm:py-24",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:fill-mode-both",
      )}
    >
      <div className={marketingGutterX}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">{t.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.href} className={cn("overflow-hidden", marketingCardInteractive)}>
                <CardHeader className="pb-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{c.desc}</CardDescription>
                </CardHeader>
                <div className="px-5 pb-5">{c.preview}</div>
                <div className="border-t border-white/5 px-5 py-3">
                  <Link
                    href={c.href}
                    className={cn("inline-flex items-center gap-1 text-sm", marketingInlineLinkStrong)}
                  >
                    {t.explore} {c.title}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
