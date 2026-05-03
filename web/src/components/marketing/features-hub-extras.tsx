import type { FeaturesComparisonRow } from "@/lib/marketing-copy/features-hub";
import { Check } from "lucide-react";
import { marketingGutterX, marketingEyebrow, marketingCardMuted, marketingSectionTitle } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export function FeaturesHubBanner({ message }: { message: string }) {
  return (
    <div className={cn(marketingGutterX, "py-10")}>
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center text-base font-medium leading-relaxed text-foreground ring-1 ring-white/[0.05] sm:text-lg">
        {message}
      </p>
    </div>
  );
}

function Cell({
  variant,
  limitedLabel,
  includedAria,
  dashLabel,
}: {
  variant: "full" | "partial" | "no" | "limited";
  limitedLabel: string;
  includedAria: string;
  dashLabel: string;
}) {
  if (variant === "full") {
    return (
      <div className="flex justify-center">
        <Check className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} aria-label={includedAria} />
      </div>
    );
  }
  if (variant === "partial" || variant === "limited") {
    return <p className="text-center text-xs font-medium text-muted-foreground">{limitedLabel}</p>;
  }
  return <p className="text-center text-sm text-muted-foreground/70">{dashLabel}</p>;
}

export function FeaturesComparisonSection({
  eyebrow,
  title,
  body,
  tableTitle,
  colUs,
  colThem,
  rows,
  cellLimited,
  cellDash,
  includedAria,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tableTitle: string;
  colUs: string;
  colThem: string;
  rows: readonly FeaturesComparisonRow[];
  cellLimited: string;
  cellDash: string;
  includedAria: string;
}) {
  return (
    <div className={cn(marketingGutterX, "py-16")}>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
        <div>
          <p className={marketingEyebrow}>{eyebrow}</p>
          <h2 className={cn(marketingSectionTitle, "mt-2")}>{title}</h2>
          <p className="mt-4 max-w-md text-muted-foreground">{body}</p>
        </div>
        <div className={cn("rounded-2xl p-6 sm:p-8", marketingCardMuted)}>
          <h3 className="text-center text-lg font-bold text-foreground">{tableTitle}</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground" />
                  <th className="w-24 pb-2 text-center text-xs font-semibold text-[var(--accent)]">{colUs}</th>
                  <th className="w-24 pb-2 text-center text-xs font-semibold text-muted-foreground">{colThem}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.06]">
                    <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                    <td className="py-3">
                      <Cell variant={row.us} limitedLabel={cellLimited} includedAria={includedAria} dashLabel={cellDash} />
                    </td>
                    <td className="py-3">
                      <Cell variant={row.them} limitedLabel={cellLimited} includedAria={includedAria} dashLabel={cellDash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
