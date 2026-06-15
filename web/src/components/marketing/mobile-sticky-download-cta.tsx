"use client";

import { usePathname } from "next/navigation";

import { MarketingDestinationLink } from "@/components/marketing/marketing-destination-link";
import { Button } from "@/components/ui/button";
import { marketingCtaPrimaryClasses } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/** Sticky mobile download CTA — homepage only. */
export function MobileStickyDownloadCta() {
  const pathname = usePathname() ?? "";
  if (pathname !== "/") return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[rgba(5,10,20,0.92)] p-3 backdrop-blur-xl",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden",
      )}
    >
      <Button size="lg" className={cn("pointer-events-auto w-full", marketingCtaPrimaryClasses)} asChild>
        <MarketingDestinationLink href="/download" analyticsSource="mobile_sticky_download">
          Download free
        </MarketingDestinationLink>
      </Button>
    </div>
  );
}
