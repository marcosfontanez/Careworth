"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { setMarketingLocale } from "@/app/(marketing)/marketing-locale-actions";
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

function MarketingLocaleSwitcherInner({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  const next = qs ? `${pathname}?${qs}` : pathname;

  return (
    <form action={setMarketingLocale} className="inline-flex items-center gap-2">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="pv-marketing-locale" className="sr-only">
        Language
      </label>
      <select
        id="pv-marketing-locale"
        name="locale"
        defaultValue={locale}
        className="h-9 max-w-[11rem] rounded-md border border-white/15 bg-white/5 px-2 text-xs text-foreground"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </form>
  );
}

export function MarketingLocaleSwitcher({ locale }: { locale: Locale }) {
  return (
    <Suspense
      fallback={
        <form action={setMarketingLocale} className="inline-flex items-center gap-2">
          <input type="hidden" name="next" value="/" />
          <select
            name="locale"
            defaultValue={locale}
            className="h-9 max-w-[11rem] rounded-md border border-white/15 bg-white/5 px-2 text-xs text-foreground"
            disabled
            aria-label="Language"
          >
            {SUPPORTED_LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_LABELS[code]}
              </option>
            ))}
          </select>
        </form>
      }
    >
      <MarketingLocaleSwitcherInner locale={locale} />
    </Suspense>
  );
}
