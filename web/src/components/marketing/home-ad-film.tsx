import {
  PremiumSectionHeader,
  WebsiteSectionBackdrop,
} from "@/components/marketing/website-visuals";
import { MarketingVerticalVideo } from "@/components/marketing/marketing-vertical-video";
import type { Locale } from "@/lib/i18n";
import { getHomeAdFilmCopy } from "@/lib/marketing-copy/home-page-sections";
import { marketingGutterX } from "@/lib/ui-classes";

export function HomeAdFilm({ locale }: { locale: Locale }) {
  const c = getHomeAdFilmCopy(locale);

  return (
    <section className="relative isolate border-t border-white/5 py-20 sm:py-24">
      <WebsiteSectionBackdrop variant="spotlight" />
      <div className={marketingGutterX}>
        <PremiumSectionHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

        <MarketingVerticalVideo
          src="/media/extraction-ad.mp4"
          poster="/media/extraction-ad-poster.jpg"
          playLabel={c.playLabel}
          durationLabel={c.durationLabel}
          className="mx-auto mt-12"
        />

        <p className="mt-6 text-center text-sm text-muted-foreground/85">{c.caption}</p>
      </div>
    </section>
  );
}
