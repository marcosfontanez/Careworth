import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  /** Dark placeholder while loading — avoids layout shift without blur hash generation. */
  placeholderClassName?: string;
};

/** Optimized landing still — always lazy except hero (priority). */
export function LandingImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 560px",
  placeholderClassName,
}: LandingImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(8,14,26,0.85)] ring-1 ring-white/5",
        placeholderClassName,
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? undefined : "lazy"}
        sizes={sizes}
        className="block h-auto w-full"
      />
    </div>
  );
}
