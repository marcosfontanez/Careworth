"use client";

import Image from "next/image";

import { pulseAvatarFramePreviewPath } from "@/lib/admin/pulse-avatar-frame-preview";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  prizeTier: string;
  ringColor: string;
  /** Accessibility label for the raster preview. */
  label?: string;
  sizePx?: number;
  className?: string;
};

/** Small catalog thumbnail: bundled PNG when known, else ring-color placeholder. */
export function PulseAvatarFrameThumb({ slug, prizeTier, ringColor, label, sizePx = 44, className }: Props) {
  const src = pulseAvatarFramePreviewPath(slug, prizeTier);
  const border = ringColor?.trim() || "#64748b";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-secondary/80 ring-1 ring-border",
        className,
      )}
      style={{ width: sizePx, height: sizePx }}
    >
      {src ? (
        <Image
          src={src}
          alt={label ? `${label} preview` : "Border preview"}
          fill
          className="object-contain p-0.5"
          sizes={`${sizePx}px`}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-slate-950/40 p-1">
          <div
            className="flex size-[72%] items-center justify-center rounded-full border-[3px] bg-slate-900/90"
            style={{ borderColor: border }}
          >
            <div className="size-[55%] rounded-full bg-slate-800/90" />
          </div>
        </div>
      )}
    </div>
  );
}
