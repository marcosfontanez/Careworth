import { SectionHeader } from "@/components/marketing/section-header";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";
import { getHomeProductOverviewCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX, marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function HomeProductOverview({ locale }: { locale: Locale }) {
  const { eyebrow, title, description, pillars } = getHomeProductOverviewCopy(locale);
  return (
    <section
      className={cn(
        "border-b border-border/80 bg-gradient-to-b from-background to-pv-navy-deep/20 py-20 sm:py-24",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:fill-mode-both",
      )}
    >
      <div className={marketingGutterX}>
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <Card
              key={p.title}
              className={cn(marketingCardMuted, "shadow-[0_0_40px_-20px_rgba(25,211,197,0.15)]")}
            >
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
