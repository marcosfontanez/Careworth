import Link from "next/link";

import { site } from "@/lib/design-tokens";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20">
      <div className={cn("max-w-md text-center", marketingCardMuted, "p-10")}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That link doesn&apos;t exist on {site.name}. Check the URL or go back home.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.55)]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
