"use client";

import { ExternalLink } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WebAppFrameCopy } from "@/lib/marketing-copy/web-app";
import { cn } from "@/lib/utils";

/** CSS logical width matching common Expo / iPhone layout breakpoints */
const VIEWPORT_W = 390;
const VIEWPORT_H = 844;
const BEZEL = 14;
const R_OUT = 44;
const R_IN = 34;

export function PulseverseWebDeviceFrame({
  appUrl,
  copy,
  className,
}: {
  appUrl: string | null;
  copy: WebAppFrameCopy;
  className?: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const gap = 32;
      const frameW = VIEWPORT_W + BEZEL * 2;
      const frameH = VIEWPORT_H + BEZEL * 2 + 32;
      const sx = (rect.width - gap) / frameW;
      const sy = (rect.height - gap) / frameH;
      const s = Math.min(1, sx, sy);
      setScale(Number.isFinite(s) && s > 0 ? Math.max(0.52, Math.min(1, s)) : 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!appUrl) {
    return (
      <div
        className={cn(
          "mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center",
          className,
        )}
      >
        <p className="text-lg font-semibold text-foreground">{copy.noUrlTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.noUrlBody}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-6", className)}>
      <div
        ref={shellRef}
        className="flex w-full max-w-[min(100%,520px)] flex-1 items-center justify-center px-2 sm:max-w-none"
        style={{ minHeight: "min(88dvh, 920px)" }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
          <div
            className="relative bg-zinc-900 shadow-[0_28px_90px_rgba(0,0,0,0.78),0_0_0_1px_rgba(255,255,255,0.09),inset_0_1px_0_rgba(255,255,255,0.06)]"
            style={{
              padding: BEZEL,
              borderRadius: R_OUT,
            }}
          >
            <div
              className="pointer-events-none absolute -left-px top-[5.5rem] z-20 h-10 w-[3px] rounded-r bg-gradient-to-b from-zinc-600 to-zinc-800"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-px top-[8.25rem] z-20 h-16 w-[3px] rounded-r bg-gradient-to-b from-zinc-600 to-zinc-800"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-px top-[6.5rem] z-20 h-[4.5rem] w-[3px] rounded-l bg-gradient-to-b from-zinc-600 to-zinc-800"
              aria-hidden
            />

            <div
              className="relative overflow-hidden bg-black"
              style={{
                width: VIEWPORT_W,
                height: VIEWPORT_H,
                borderRadius: R_IN,
              }}
            >
              <div
                className="pointer-events-none absolute left-1/2 top-3 z-10 h-7 w-[108px] -translate-x-1/2 rounded-full bg-black/95 shadow-inner shadow-black/80 ring-1 ring-white/[0.07]"
                aria-hidden
              />

              <iframe
                src={appUrl}
                title={copy.iframeTitle}
                className="absolute inset-0 size-full border-0 bg-[#020617]"
                allow="clipboard-read; clipboard-write; fullscreen; microphone; camera; autoplay"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" className="rounded-full border-white/15 bg-white/[0.02]" asChild>
          <a href={appUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 size-4" aria-hidden />
            {copy.openNewTab}
          </a>
        </Button>
      </div>

      <p className="max-w-lg px-4 text-center text-xs leading-relaxed text-muted-foreground">{copy.hint}</p>
    </div>
  );
}
