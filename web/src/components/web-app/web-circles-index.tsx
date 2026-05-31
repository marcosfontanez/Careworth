import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";
import type { WebCirclesIndexResult } from "@/lib/web-app/circles-data";

import { WebCircleCard } from "./web-circle-card";

export function WebCirclesIndex({
  result,
  copy,
}: {
  result: WebCirclesIndexResult;
  copy: WebAppCirclesCopy;
}) {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.indexTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.indexSubtitle}</p>
      </header>

      {result.state === "error" ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.errorTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.errorBody}</p>
        </div>
      ) : result.circles.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[rgba(12,18,32,0.8)] p-8 text-center backdrop-blur-sm">
          <p className="text-base font-semibold text-foreground">{copy.indexEmptyTitle}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.indexEmptyBody}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.circles.map((circle) => (
            <WebCircleCard key={circle.id} circle={circle} copy={copy} />
          ))}
        </div>
      )}
    </div>
  );
}
