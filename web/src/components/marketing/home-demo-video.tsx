"use client";

import { Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { LandingImage } from "@/components/marketing/landing-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { HomeLandingCopy } from "@/lib/marketing-copy/home-landing";
import { LANDING } from "@/lib/marketing-landing-assets";
import { marketingCtaPrimaryClasses, marketingFocusRing, marketingGutterX, marketingSection } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

type Props = {
  copy: HomeLandingCopy["demo"];
};

/**
 * Demo section — poster first, video sources injected only after the user
 * opens the modal (no MP4/WebM on initial page load).
 */
export function HomeDemoVideo({ copy }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onOpen = useCallback(() => {
    setOpen(true);
    setLoaded(true);
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
    videoRef.current?.pause();
  }, []);

  return (
    <section id="demo" className={cn(marketingSection, "scroll-mt-24")}>
      <div className={marketingGutterX}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent/90">{copy.eyebrow}</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            {copy.body}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-sm">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "group relative block w-full overflow-hidden rounded-[1.75rem] border border-white/10 ring-1 ring-white/5",
              "shadow-[0_40px_100px_-30px_rgba(20,184,166,0.45)] transition duration-200 hover:border-accent/40",
              marketingFocusRing,
            )}
            aria-label={copy.button}
          >
            <LandingImage
              src={LANDING.demoPoster.src}
              alt={LANDING.demoPoster.alt}
              width={LANDING.demoPoster.width}
              height={LANDING.demoPoster.height}
              sizes="(max-width: 640px) 80vw, 360px"
              className="border-0 ring-0"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 transition group-hover:bg-black/45">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-[0_0_40px_rgba(0,210,255,0.5)]">
                <Play className="ml-1 h-7 w-7 fill-white text-white" aria-hidden />
              </span>
            </span>
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground/80">{copy.footnote}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <Button size="lg" className={marketingCtaPrimaryClasses} onClick={onOpen}>
            {copy.button}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? onOpen() : onClose())}>
        <DialogContent
          showCloseButton
          className="max-h-[96vh] w-[min(96vw,420px)] gap-0 overflow-hidden border-white/10 bg-[rgba(6,10,22,0.98)] p-0 sm:max-w-[420px]"
        >
          <DialogTitle className="sr-only">{copy.title}</DialogTitle>
          {loaded ? (
            <video
              ref={videoRef}
              className="max-h-[90vh] w-full bg-black"
              controls
              playsInline
              preload="none"
              poster={LANDING.demoPoster.src}
            >
              <source src={LANDING.demoWebm} type="video/webm" />
              <source src={LANDING.demoMp4} type="video/mp4" />
            </video>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
