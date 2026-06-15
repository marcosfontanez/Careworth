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
        className="h-9 min-w-[9.5rem] rounded-lg border border-white/15 bg-[rgba(12,21,36,0.65)] px-3 text-xs font-medium text-foreground shadow-inner"
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
            className="h-9 min-w-[9.5rem] rounded-lg border border-white/15 bg-[rgba(12,21,36,0.65)] px-3 text-xs font-medium text-foreground shadow-inner"
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
