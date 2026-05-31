"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Phone-framed, click-to-play player for vertical (9:16) marketing films.
 * Stays at zero bandwidth (no preload) until the viewer clicks play, then swaps
 * the poster for the real <video>. The parent controls width via `className`.
 */
export function MarketingVerticalVideo({
  src,
  poster,
  playLabel,
  durationLabel,
  glowClassName = "shadow-[0_40px_120px_-40px_rgba(20,184,166,0.45),0_0_0_1px_rgba(255,255,255,0.04)]",
  className,
}: {
  src: string;
  poster: string;
  playLabel: string;
  durationLabel?: string;
  glowClassName?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={cn("w-full max-w-[340px]", className)}>
      <div
        className={cn(
          "relative aspect-[9/16] overflow-hidden rounded-[2rem] border border-white/12 bg-[#05080f]",
          glowClassName,
        )}
      >
        {playing ? (
          <video
            src={src}
            poster={poster}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="size-full object-cover"
          >
            <track kind="captions" />
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={playLabel}
            className="group absolute inset-0 size-full"
          >
            <Image
              src={poster}
              alt=""
              fill
              sizes="340px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20"
            />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-[4.5rem] place-items-center rounded-full border border-white/30 bg-white/10 text-white shadow-[0_0_40px_-6px_rgba(20,184,166,0.9)] backdrop-blur-md transition group-hover:scale-105 group-hover:bg-white/20">
                <Play className="size-7 translate-x-0.5 fill-current" aria-hidden />
              </span>
            </span>
            <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Play className="size-3 fill-current" aria-hidden />
              {playLabel}
              {durationLabel ? <span className="text-white/60">· {durationLabel}</span> : null}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
