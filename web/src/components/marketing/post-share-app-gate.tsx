"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { shadowPrimaryCta } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

function isLikelyMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Intermediate page for `/post/[id]` shares: clips are meant to open in the native app
 * (Universal Link / App Link). Web shows CTAs only — no inline media playback.
 */
export function PostShareAppGate({
  appDeepLink,
  downloadUrl,
}: {
  /** `pulseverse://post/...` fallback when the https handoff does not fire (in-app browsers, etc.). */
  appDeepLink: string;
  /** Absolute URL to the marketing download flow (e.g. `https://…/download`). */
  downloadUrl: string;
}) {
  const autoOpenAttempted = useRef(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!isLikelyMobile()) return;
    if (autoOpenAttempted.current) return;
    autoOpenAttempted.current = true;

    const t = window.setTimeout(() => {
      window.location.href = appDeepLink;
      window.setTimeout(() => setHintVisible(true), 2800);
    }, 500);
    return () => clearTimeout(t);
  }, [appDeepLink]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/10 bg-white/3 p-6">
        <p className="text-sm font-semibold text-foreground">Need PulseVerse?</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Clips from the feed play inside the app. If you don&apos;t have it yet, download PulseVerse first — then
          open this link again from your message or email.
        </p>
        <Button size="lg" className={cn("mt-5 w-full bg-primary text-primary-foreground", shadowPrimaryCta)} asChild>
          <a href={downloadUrl}>Get PulseVerse</a>
        </Button>
      </div>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Button didn&apos;t open the app?{" "}
        <a href={appDeepLink} className="font-semibold text-primary underline underline-offset-2">
          Try the direct app link
        </a>
        .
      </p>

      {hintVisible ? (
        <p className="text-center text-xs text-muted-foreground">
          Still here? Tap <strong className="text-foreground">Get PulseVerse</strong>, install, then return to this
          page and tap <strong className="text-foreground">View</strong>.
        </p>
      ) : null}
    </div>
  );
}
