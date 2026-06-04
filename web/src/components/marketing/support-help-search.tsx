"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketingFaqItem } from "@/lib/marketing-copy/faq";
import type { SupportHelpTile } from "@/lib/marketing-copy/support-center";
import { marketingInlineLink, shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type SupportHelpSearchProps = {
  placeholder: string;
  searchButton: string;
  popularLabel: string;
  popularLinks: { href: string; label: string }[];
  faqItems: MarketingFaqItem[];
  helpTiles: SupportHelpTile[];
  resultsTitle: string;
  noResults: string;
};

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

export function SupportHelpSearch({
  placeholder,
  searchButton,
  popularLabel,
  popularLinks,
  faqItems,
  helpTiles,
  resultsTitle,
  noResults,
}: SupportHelpSearchProps) {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const normalized = activeQuery.trim().toLowerCase();

  const results = useMemo(() => {
    if (normalized.length < 2) return null;

    const faqMatches = faqItems.filter(
      (item) => matchesQuery(item.q, normalized) || matchesQuery(item.a, normalized),
    );
    const tileMatches = helpTiles.filter(
      (tile) =>
        matchesQuery(tile.title, normalized) ||
        matchesQuery(tile.body, normalized) ||
        matchesQuery(tile.linkLabel, normalized),
    );

    return { faqMatches, tileMatches };
  }, [faqItems, helpTiles, normalized]);

  function runSearch() {
    setActiveQuery(query.trim());
  }

  return (
    <div>
      <form
        className="flex gap-2 rounded-2xl border border-white/10 bg-white/4 p-1.5 ring-1 ring-white/5"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-[rgba(5,10,20,0.6)] px-4 py-3 text-sm text-muted-foreground">
          <Search className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="sr-only">{placeholder}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <Button
          type="submit"
          className={cn("shrink-0 rounded-xl px-6 font-semibold", shadowPrimaryCta, "bg-primary")}
        >
          {searchButton}
        </Button>
      </form>

      {results ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{resultsTitle}</p>
          {results.faqMatches.length === 0 && results.tileMatches.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{noResults}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {results.tileMatches.map((tile) => (
                <li key={tile.title}>
                  <Link href={tile.href} className={cn("text-sm font-semibold", marketingInlineLink)}>
                    {tile.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tile.body}</p>
                </li>
              ))}
              {results.faqMatches.map((item) => (
                <li key={item.q}>
                  <Link
                    href={`/faq?q=${encodeURIComponent(item.q)}`}
                    className={cn("text-sm font-semibold", marketingInlineLink)}
                  >
                    {item.q}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.a}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {popularLabel}{" "}
        {popularLinks.map((l) => (
          <Link key={l.href + l.label} href={l.href} className={marketingInlineLink}>
            {l.label}
          </Link>
        ))}
      </p>
    </div>
  );
}
