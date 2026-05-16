"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type MarketingExpandableMediaProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** When false, renders children only (no overlay / dialog). */
  expandable?: boolean;
  priority?: boolean;
  children: ReactNode;
};

/**
 * Wraps marketing figures so taps/clicks open a large, readable dialog (same asset at higher visual size).
 */
export function MarketingExpandableMedia({
  src,
  alt,
  width,
  height,
  expandable = true,
  priority,
  children,
}: MarketingExpandableMediaProps) {
  const [open, setOpen] = useState(false);

  if (!expandable) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="relative">
        {children}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "absolute inset-0 z-[38] cursor-zoom-in rounded-[inherit] border-0 bg-transparent p-0",
            "transition-colors duration-200 hover:bg-white/[0.05]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(5,10,20,0.92)]",
          )}
          aria-label={`Open larger view: ${alt}`}
          title="Click to enlarge"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          backdropClassName="bg-black/78 supports-backdrop-filter:backdrop-blur-[3px]"
          className={cn(
            "max-h-[98vh] w-[min(98vw,3200px)] max-w-[min(98vw,3200px)] gap-0 overflow-hidden border-white/10 bg-[rgba(6,10,22,0.97)] p-1 sm:p-2",
            /** Wins over default dialog `sm:max-w-sm` so the lightbox can use the full viewport width. */
            "sm:max-w-[min(98vw,3200px)]",
          )}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex max-h-[min(96dvh,96vh)] w-full items-center justify-center overflow-auto overscroll-contain">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={open ? priority : false}
              className="h-auto w-auto max-h-[min(94dvh,94vh)] max-w-[min(96vw,3000px)] object-contain"
              sizes="(max-width: 3000px) 96vw, 3000px"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
