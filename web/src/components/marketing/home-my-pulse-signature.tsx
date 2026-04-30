import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { SectionHeader } from "@/components/marketing/section-header";
import { Button } from "@/components/ui/button";
import { myPulseFeedSlots } from "@/mock/marketing";
import { cn } from "@/lib/utils";

export function HomeMyPulseSignature() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="My Pulse"
          title="Keep your Pulse fresh — five slots, zero clutter."
          description="Thought. Clip. Link. Pics. Only your newest five updates stay visible on Pulse Page; add a sixth and the oldest quietly rolls off so your identity always reads as current."
        />
        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3 rounded-2xl border border-border/80 bg-card/40 p-6 ring-1 ring-white/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Newest first · illustrative order</p>
            <ul className="space-y-2">
              {myPulseFeedSlots.map((slot, i) => (
                <li
                  key={`${slot.type}-${i}`}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm",
                    i === 0 && "ring-1 ring-primary/30",
                  )}
                >
                  <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {slot.type}
                  </span>
                  <span className="text-muted-foreground">{slot.preview}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center space-y-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <Layers className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Built for healthcare identity, not dashboards.</h3>
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Clips</span> come from PulseVerse — your posts or moments you saved from the Feed.
              </li>
              <li>
                <span className="font-medium text-foreground">Links</span> head outward with optional commentary so context travels with the URL.
              </li>
              <li>
                <span className="font-medium text-foreground">Pics</span> capture day-to-day human moments the way clinicians already share off-shift.
              </li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-full font-semibold" asChild>
                <Link href="/features/my-pulse" className="inline-flex items-center gap-2">
                  How My Pulse works
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" className="rounded-full border-primary/30 font-semibold" asChild>
                <Link href="/features/pulse-page">See Pulse Page</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
