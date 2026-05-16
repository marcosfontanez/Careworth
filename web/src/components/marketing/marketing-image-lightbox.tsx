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
            "max-h-[92vh] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden border-white/10 bg-[rgba(6,10,22,0.97)] p-2 sm:max-w-[min(96vw,1440px)] sm:p-4",
          )}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="flex max-h-[88vh] items-center justify-center overflow-auto">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={open ? priority : false}
              className="h-auto max-h-[85vh] w-auto max-w-full object-contain"
              sizes="(max-width: 1440px) 96vw, 1440px"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
