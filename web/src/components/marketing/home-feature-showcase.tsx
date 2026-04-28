import Link from "next/link";
import { ArrowRight, Circle, Radio, Rss, UserCircle } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { marketingGutterX, marketingCardInteractive } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const cards = [
  {
    href: "/features/feed",
    title: "Feed",
    desc: "Short-form discovery tuned for healthcare — stay close to what matters on shift.",
    icon: Rss,
    preview: (
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
    ),
  },
  {
    href: "/features/circles",
    title: "Circles",
    desc: "Topic rooms for your specialty, shift, and humor — communities that get the job.",
    icon: Circle,
    preview: (
      <div className="space-y-1.5 rounded-lg bg-black/30 p-2 text-[10px] text-muted-foreground">
        {["#Cardiology", "#Nursing Life", "#Night Shift"].map((t) => (
          <div key={t} className="flex justify-between rounded-md bg-white/[0.04] px-2 py-1.5">
            <span className="font-medium text-foreground">{t}</span>
            <span>12.4K</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    href: "/features/live",
    title: "Live",
    desc: "Go live for AMAs, teaching moments, and ward stories with chat built for clinicians.",
    icon: Radio,
    preview: (
      <div className="overflow-hidden rounded-lg bg-black/30">
        <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-violet-950/80 to-background">
          <span className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Live</span>
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 text-[10px] text-white">1.2K</span>
        </div>
      </div>
    ),
  },
  {
    href: "/features/pulse-page",
    title: "My Pulse · Pulse Page",
    desc: "Your professional surface and private hub — presence that feels human, not corporate.",
    icon: UserCircle,
    preview: (
      <div className="rounded-lg bg-black/30 p-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/50 to-[var(--accent)]/30" />
          <div className="flex-1 space-y-1">
            <div className="h-2 w-2/3 rounded bg-white/15" />
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>1.2K followers</span>
              <span>·</span>
              <span>86 posts</span>
            </div>
          </div>
        </div>
        <div className="mt-2 h-12 rounded-md bg-white/[0.04]" />
      </div>
    ),
  },
] as const;

export function HomeFeatureShowcase() {
  return (
    <section className="border-t border-[rgba(148,163,184,0.08)] py-20 sm:py-24">
      <div className={marketingGutterX}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for healthcare culture — end to end.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Feed, Circles, Live, and Pulse layers that share one account, one trust model, one premium dark experience.
          </p>
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
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    Explore{" "}
                    {c.href.includes("pulse-page")
                      ? "Pulse Page"
                      : c.href.includes("my-pulse")
                        ? "My Pulse"
                        : c.title.split("·")[0].trim()}
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
