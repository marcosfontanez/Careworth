import Link from "next/link";
import { ArrowUpRight, Circle, LayoutList, Radio, Rss, ShoppingBag, UserCircle } from "lucide-react";

import { PremiumSectionHeader, WebsiteSectionBackdrop } from "@/components/marketing/website-visuals";
import type { Locale } from "@/lib/i18n";
import { getHomeFeatureShowcaseCopy } from "@/lib/marketing-copy/home-feature-showcase";
import { marketingGutterX } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Compact platform-map strip — replaces the previous 6-tile feature grid.
 *
 * The deep-dive sections (Pulse Duo, Circles, Creator Hub) cover four of these
 * surfaces in detail with their own posters. This section's only job now is to
 * give the user a quick scannable map of all six surfaces — name + icon, no
 * descriptions — so the deep-dives don't have to compete with them.
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
    <section className="relative isolate border-t border-white/5 py-16 sm:py-20">
      <WebsiteSectionBackdrop variant="soft" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

        <ul
          className={cn(
            "mt-12 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-3 ring-1 ring-white/4 backdrop-blur-md",
            "sm:grid-cols-3 sm:p-4 lg:grid-cols-6 lg:gap-2",
            "shadow-[0_24px_70px_-30px_rgba(20,184,166,0.30)]",
          )}
        >
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
                  className={cn(
                    "group relative flex h-full items-center gap-3 rounded-xl px-3 py-3 transition",
                    "hover:bg-white/4",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
                      accentBg,
                      accentText,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">
                    {card.title}
                  </span>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
