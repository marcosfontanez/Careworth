import Link from "next/link";
import { ArrowUpRight, Circle, LayoutList, Radio, Rss, ShoppingBag, UserCircle } from "lucide-react";

import { PremiumSectionHeader, WebsiteSectionBackdrop } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeFeatureShowcaseCopy } from "@/lib/marketing-copy/home-feature-showcase";
import { marketingGutterX, marketingSection, marketingSurfaceTile } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Compact platform-map strip — the homepage's single product overview.
 * Deeper stories live on /features; identity, creator, and trust sections follow below.
 */
export function HomeFeatureShowcase({ locale }: { locale: Locale }) {
  const t = getHomeFeatureShowcaseCopy(locale);

  const tiles = [
    { id: "feed", icon: Rss, href: "/features/feed", tone: "cyan" as const },
    { id: "circles", icon: Circle, href: "/features/circles", tone: "blue" as const },
    { id: "live", icon: Radio, href: "/features/live", tone: "blue" as const },
    { id: "pulsePage", icon: UserCircle, href: "/features/pulse-page", tone: "cyan" as const },
    { id: "myPulse", icon: LayoutList, href: "/features/my-pulse", tone: "cyan" as const },
    { id: "creator", icon: ShoppingBag, href: "/features", tone: "gold" as const },
  ] as const;

  return (
    <section className={marketingSection}>
      <WebsiteSectionBackdrop variant="soft" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile) => {
            const card = t.cards[tile.id];
            const accentText =
              tile.tone === "gold"
                ? "text-[#E5B84B]"
                : tile.tone === "blue"
                  ? "text-primary"
                  : "text-[var(--accent)]";
            const accentBg =
              tile.tone === "gold"
                ? "bg-[rgba(229,184,75,0.10)] ring-[rgba(229,184,75,0.30)]"
                : tile.tone === "blue"
                  ? "bg-primary/10 ring-primary/30"
                  : "bg-accent/10 ring-[var(--accent)]/30";
            const Icon = tile.icon;
            return (
              <li key={tile.id}>
                <Link
                  href={tile.href}
                  aria-label={`${card.title} — ${t.explore}`}
                  className={cn(
                    marketingSurfaceTile,
                    "group flex min-h-[5.5rem] flex-col justify-between p-4 sm:min-h-[6.5rem]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                      accentBg,
                      accentText,
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="mt-3 flex items-end justify-between gap-2">
                    <span className="text-sm font-semibold tracking-tight text-foreground">{card.title}</span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
