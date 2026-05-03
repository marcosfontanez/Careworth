"use client";

import { Button } from "@/components/ui/button";
import { shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/**
 * Universal-link primary (`https`) for iOS/Android App Links; `pulseverse://` fallback
 * when the HTTPS handoff does not open the installed app.
 */
export function OpenInPulseverseCta({
  httpsUrl,
  appDeepLink,
  className,
}: {
  httpsUrl: string;
  appDeepLink: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Button size="lg" className={cn("bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
        <a href={httpsUrl}>Open in PulseVerse</a>
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        If the app doesn&apos;t open, try the{" "}
        <a href={appDeepLink} className="font-semibold text-primary underline underline-offset-2">
          direct app link
        </a>
        .
      </p>
    </div>
  );
}
