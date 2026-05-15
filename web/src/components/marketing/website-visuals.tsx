/**
 * Shared premium presentation primitives for the PulseVerse marketing site.
 *
 * Aligns with the PulseVerse Visual System rule:
 *   - layered navy/near-black bases, restrained neon-glass surfaces
 *   - subtle cyan/teal accent glow only where hierarchy needs it
 *   - editorial spacing, no edge-to-edge packs, no flat black
 *
 * Use these primitives whenever you place screenshots or compose
 * cinematic sections — do not hand-roll one-off cards.
 */

import Image from "next/image";
import type { ReactNode } from "react";

import { marketingEyebrow } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Tone tokens — keeps glow + accent + ring colors per asset consistent.
 * ------------------------------------------------------------------------- */

export type ScreenshotTone = "cyan" | "blue" | "gold" | "none";

const TONE = {
  cyan: {
    glow: "shadow-[0_40px_120px_-30px_rgba(20,184,166,0.55),0_24px_70px_-20px_rgba(45,127,249,0.30)]",
    halo: "bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(20,184,166,0.22),transparent_60%)]",
    border: "border-[rgba(20,184,166,0.30)]",
    text: "text-[var(--accent)]",
    chipBg: "bg-[rgba(20,184,166,0.10)]",
    chipRing: "ring-[rgba(20,184,166,0.35)]",
  },
  blue: {
    glow: "shadow-[0_40px_120px_-30px_rgba(45,127,249,0.55),0_24px_70px_-20px_rgba(20,184,166,0.25)]",
    halo: "bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(45,127,249,0.22),transparent_60%)]",
    border: "border-primary/35",
    text: "text-primary",
    chipBg: "bg-primary/10",
    chipRing: "ring-primary/35",
  },
  gold: {
    glow: "shadow-[0_40px_120px_-30px_rgba(229,184,75,0.45),0_24px_70px_-20px_rgba(45,127,249,0.30)]",
    halo: "bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(229,184,75,0.22),transparent_60%)]",
    border: "border-[rgba(229,184,75,0.35)]",
    text: "text-[#E5B84B]",
    chipBg: "bg-[rgba(229,184,75,0.10)]",
    chipRing: "ring-[rgba(229,184,75,0.35)]",
  },
  none: {
    glow: "shadow-[0_24px_70px_-20px_rgba(0,0,0,0.7)]",
    halo: "bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(255,255,255,0.05),transparent_60%)]",
    border: "border-white/10",
    text: "text-foreground",
    chipBg: "bg-white/5",
    chipRing: "ring-white/10",
  },
} as const;

/* ---------------------------------------------------------------------------
 * Page background — radial cosmic veil for cinematic depth on dark sections.
 * ------------------------------------------------------------------------- */

export function WebsiteSectionBackdrop({
  variant = "deep",
  className,
}: {
  variant?: "deep" | "soft" | "spotlight";
  className?: string;
}) {
  const layers: Record<string, string> = {
    deep: "bg-[radial-gradient(ellipse_75%_55%_at_15%_-10%,rgba(20,184,166,0.10),transparent_55%),radial-gradient(ellipse_60%_45%_at_95%_30%,rgba(45,127,249,0.10),transparent_50%),radial-gradient(ellipse_60%_45%_at_50%_120%,rgba(13,28,55,0.7),transparent_60%)]",
    soft: "bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(45,127,249,0.07),transparent_55%)]",
    spotlight:
      "bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgba(20,184,166,0.10),transparent_60%)]",
  };
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10", layers[variant], className)}
    />
  );
}

/* ---------------------------------------------------------------------------
 * SectionHeader (premium variant) — used by all new homepage sections.
 * ------------------------------------------------------------------------- */

export function PremiumSectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  accent,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  /** Optional gold/cyan accent word styling overrides. */
  accent?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow && (
        <p className={cn(marketingEyebrow, "tracking-[0.22em] text-[var(--accent)]/90")}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          "text-balance font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]",
          eyebrow ? "mt-3" : "mt-0",
          accent,
        )}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * ScreenshotHalo — positioned glow halo to seat a screenshot on a section.
 * Drop-in element. Place inside a `relative` parent next to the screenshot.
 * ------------------------------------------------------------------------- */

export function ScreenshotHalo({
  tone = "cyan",
  size = "md",
  className,
}: {
  tone?: ScreenshotTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap: Record<string, string> = {
    sm: "inset-x-8 top-12 h-[70%]",
    md: "inset-x-4 top-8 h-[80%]",
    lg: "inset-x-0 top-4 h-[88%]",
  };
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 rounded-[3rem] blur-2xl",
        sizeMap[size],
        TONE[tone].halo,
        className,
      )}
    />
  );
}

/* ---------------------------------------------------------------------------
 * SpotlightBeam — cinematic light beam from above, behind a hero asset.
 *
 * The flagship treatment: a softly-blurred elongated ellipse that reads as a
 * stage spotlight illuminating the screenshot. Tone-aware. Drop-in element —
 * place inside a `relative` parent BEHIND the screenshot.
 * ------------------------------------------------------------------------- */

export function SpotlightBeam({
  tone = "cyan",
  intensity = "normal",
  className,
}: {
  tone?: ScreenshotTone;
  intensity?: "soft" | "normal" | "strong";
  className?: string;
}) {
  const opacityMap = { soft: "opacity-60", normal: "opacity-80", strong: "opacity-100" }[intensity];
  const colorStop =
    tone === "gold"
      ? "rgba(229,184,75,0.45)"
      : tone === "blue"
        ? "rgba(45,127,249,0.45)"
        : tone === "none"
          ? "rgba(255,255,255,0.10)"
          : "rgba(20,184,166,0.45)";
  const ambientStop =
    tone === "gold"
      ? "rgba(45,127,249,0.18)"
      : tone === "blue"
        ? "rgba(20,184,166,0.18)"
        : tone === "none"
          ? "rgba(255,255,255,0.04)"
          : "rgba(45,127,249,0.18)";

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-20 overflow-hidden", className)}>
      {/* Hot beam — narrow, top-anchored, blurred, slightly skewed for cinematic feel. */}
      <div
        className={cn("absolute left-1/2 top-[-22%] h-[120%] w-[55%] -translate-x-1/2 blur-3xl", opacityMap)}
        style={{
          background: `radial-gradient(ellipse 65% 55% at 50% 30%, ${colorStop}, transparent 60%)`,
          transform: "translateX(-50%) skewX(-6deg)",
        }}
      />
      {/* Ambient bloom — wider, fainter, fills the rest of the section behind the asset. */}
      <div
        className="absolute inset-x-[-10%] top-[10%] h-[100%] blur-[80px]"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${ambientStop}, transparent 65%)`,
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * OrbitDots — subtle floating glowing dots placed around a screenshot.
 *
 * Suggests connection / community / signal without resorting to noisy FX.
 * Use sparingly — never more than ~6 dots, never animated by default.
 * ------------------------------------------------------------------------- */

const ORBIT_PRESETS: Record<string, { left: string; top: string; size: number; intensity: number }[]> = {
  circles: [
    { left: "-3%", top: "12%", size: 8, intensity: 0.7 },
    { left: "104%", top: "26%", size: 6, intensity: 0.55 },
    { left: "-6%", top: "70%", size: 5, intensity: 0.6 },
    { left: "108%", top: "78%", size: 9, intensity: 0.7 },
    { left: "50%", top: "-3%", size: 4, intensity: 0.5 },
  ],
  hero: [
    { left: "-5%", top: "18%", size: 7, intensity: 0.65 },
    { left: "104%", top: "44%", size: 5, intensity: 0.55 },
    { left: "-2%", top: "78%", size: 6, intensity: 0.6 },
  ],
  creator: [
    { left: "-4%", top: "22%", size: 7, intensity: 0.7 },
    { left: "106%", top: "36%", size: 8, intensity: 0.7 },
    { left: "-6%", top: "68%", size: 5, intensity: 0.6 },
    { left: "108%", top: "76%", size: 6, intensity: 0.65 },
  ],
  pulse: [
    { left: "-3%", top: "30%", size: 6, intensity: 0.6 },
    { left: "103%", top: "50%", size: 8, intensity: 0.7 },
    { left: "50%", top: "-4%", size: 5, intensity: 0.55 },
  ],
};

export function OrbitDots({
  tone = "cyan",
  preset = "hero",
  className,
}: {
  tone?: ScreenshotTone;
  preset?: keyof typeof ORBIT_PRESETS;
  className?: string;
}) {
  const dotColor =
    tone === "gold"
      ? "rgba(229,184,75,0.85)"
      : tone === "blue"
        ? "rgba(77,159,255,0.85)"
        : tone === "none"
          ? "rgba(255,255,255,0.7)"
          : "rgba(45,212,191,0.85)";
  const haloColor =
    tone === "gold"
      ? "rgba(229,184,75,0.45)"
      : tone === "blue"
        ? "rgba(77,159,255,0.45)"
        : tone === "none"
          ? "rgba(255,255,255,0.30)"
          : "rgba(45,212,191,0.45)";

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-[3]", className)}>
      {ORBIT_PRESETS[preset].map((dot, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            background: dotColor,
            boxShadow: `0 0 ${dot.size * 3}px ${dot.size * 0.5}px ${haloColor}`,
            opacity: dot.intensity,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * PosterCaptionStrip — branded credit caption below a flagship screenshot.
 * Replaces a flat figcaption with a premium pill-styled product credit.
 * ------------------------------------------------------------------------- */

export function PosterCaptionStrip({
  device,
  context,
  tone = "cyan",
  className,
}: {
  device: string;
  context?: string;
  tone?: ScreenshotTone;
  className?: string;
}) {
  return (
    <div className={cn("mt-5 flex items-center justify-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "h-px w-10",
          tone === "gold"
            ? "bg-gradient-to-r from-transparent to-[#E5B84B]/40"
            : tone === "blue"
              ? "bg-gradient-to-r from-transparent to-primary/40"
              : "bg-gradient-to-r from-transparent to-[var(--accent)]/40",
        )}
      />
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border bg-[rgba(8,14,26,0.92)] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur",
          TONE[tone].border,
          TONE[tone].text,
        )}
      >
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE[tone].chipBg, "ring-2", TONE[tone].chipRing)} />
        {device}
        {context && <span className="text-muted-foreground/80">· {context}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "h-px w-10",
          tone === "gold"
            ? "bg-gradient-to-l from-transparent to-[#E5B84B]/40"
            : tone === "blue"
              ? "bg-gradient-to-l from-transparent to-primary/40"
              : "bg-gradient-to-l from-transparent to-[var(--accent)]/40",
        )}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * PosterCornerTrace — decorative SVG corner accents around a screenshot frame.
 * Subtle premium product-launch motif; never overpowering.
 * ------------------------------------------------------------------------- */

export function PosterCornerTrace({
  tone = "cyan",
  position = "all",
  className,
}: {
  tone?: ScreenshotTone;
  position?: "all" | "top" | "corners";
  className?: string;
}) {
  const stroke =
    tone === "gold"
      ? "stroke-[#E5B84B]/40"
      : tone === "blue"
        ? "stroke-primary/40"
        : "stroke-[var(--accent)]/40";

  const showAll = position === "all" || position === "corners";
  const showTop = position === "all" || position === "top";

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-[5]", className)}>
      {showAll && (
        <>
          <Corner className={cn("absolute -left-3 -top-3 h-10 w-10", stroke)} pos="tl" />
          <Corner className={cn("absolute -right-3 -top-3 h-10 w-10", stroke)} pos="tr" />
          <Corner className={cn("absolute -left-3 -bottom-3 h-10 w-10", stroke)} pos="bl" />
          <Corner className={cn("absolute -right-3 -bottom-3 h-10 w-10", stroke)} pos="br" />
        </>
      )}
      {showTop && (
        <svg
          viewBox="0 0 200 12"
          className={cn("absolute left-1/2 top-0 h-1.5 w-40 -translate-x-1/2 -translate-y-1/2", stroke)}
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M 0 6 L 200 6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function Corner({
  pos,
  className,
}: {
  pos: "tl" | "tr" | "bl" | "br";
  className?: string;
}) {
  const paths: Record<string, string> = {
    tl: "M 1 16 L 1 1 L 16 1",
    tr: "M 16 1 L 31 1 L 31 16",
    bl: "M 1 16 L 1 31 L 16 31",
    br: "M 31 16 L 31 31 L 16 31",
  };
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <path d={paths[pos]} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * ScreenshotShowcaseCard — premium framed screenshot. Backward-compatible.
 * Use everywhere a marketing render needs to be placed on a dark section.
 *
 * New props:
 *  - tag: small floating eyebrow chip (e.g. "Real product render")
 *  - cornerTrace: decorative corner accents
 *  - topHighlight: subtle accent line at the very top edge
 *  - haloIntensity: controls the in-frame veil
 * ------------------------------------------------------------------------- */

export function ScreenshotShowcaseCard({
  src,
  alt,
  priority,
  width,
  height,
  className,
  glow = "cyan",
  caption,
  sizes,
  tag,
  cornerTrace = false,
  topHighlight = true,
  haloIntensity = "normal",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  glow?: ScreenshotTone;
  caption?: ReactNode;
  sizes?: string;
  tag?: { label: string; tone?: ScreenshotTone };
  cornerTrace?: boolean;
  topHighlight?: boolean;
  haloIntensity?: "soft" | "normal" | "strong";
}) {
  const tone = TONE[glow];
  const veilOpacity = {
    soft: "opacity-50",
    normal: "opacity-75",
    strong: "opacity-100",
  }[haloIntensity];

  return (
    <figure className={cn("relative", className)}>
      {cornerTrace && <PosterCornerTrace tone={glow} position="corners" />}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(8,14,26,0.7)] ring-1 ring-white/[0.04] backdrop-blur-md",
          tone.glow,
        )}
      >
        {/* Top accent edge highlight (very faint cyan/blue/gold line). */}
        {topHighlight && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-12 top-0 z-20 h-px opacity-70",
              glow === "gold"
                ? "bg-gradient-to-r from-transparent via-[#E5B84B]/55 to-transparent"
                : glow === "blue"
                  ? "bg-gradient-to-r from-transparent via-primary/55 to-transparent"
                  : "bg-gradient-to-r from-transparent via-[var(--accent)]/55 to-transparent",
            )}
          />
        )}

        {/* Inner cinematic gradient veil to lift the asset edges. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_85%_80%_at_50%_-10%,rgba(255,255,255,0.06),transparent_55%)]",
            veilOpacity,
          )}
        />

        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1180px"}
          className="relative z-0 block h-auto w-full"
        />
      </div>

      {tag && (
        <span
          className={cn(
            "absolute -top-3 left-6 z-20 inline-flex items-center gap-1.5 rounded-full border bg-[rgba(8,14,26,0.92)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur",
            TONE[tag.tone ?? glow].border,
            TONE[tag.tone ?? glow].text,
          )}
        >
          <span
            aria-hidden
            className={cn("h-1.5 w-1.5 rounded-full", TONE[tag.tone ?? glow].chipBg, "ring-2", TONE[tag.tone ?? glow].chipRing)}
          />
          {tag.label}
        </span>
      )}

      {caption && (
        <figcaption className="mt-3 text-center text-xs text-muted-foreground/80">{caption}</figcaption>
      )}
    </figure>
  );
}

/* ---------------------------------------------------------------------------
 * PosterFrame — full-width "centerpiece" treatment for the strongest assets.
 * Larger radius, dramatic glow halo behind, optional caption strip.
 * Use for hero or comparison-style screenshots that carry the entire section.
 * ------------------------------------------------------------------------- */

export function PosterFrame({
  src,
  alt,
  width,
  height,
  glow = "cyan",
  tag,
  caption,
  sizes,
  className,
  priority,
  cornerTrace = true,
  size = "default",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  glow?: ScreenshotTone;
  tag?: { label: string; tone?: ScreenshotTone };
  caption?: ReactNode;
  sizes?: string;
  className?: string;
  priority?: boolean;
  cornerTrace?: boolean;
  /** "dramatic" amplifies the glow and adds a brighter top edge — use for true flagship images. */
  size?: "default" | "dramatic";
}) {
  const tone = TONE[glow];
  const dramaticGlow: Record<string, string> = {
    cyan: "shadow-[0_60px_180px_-30px_rgba(20,184,166,0.70),0_36px_100px_-20px_rgba(45,127,249,0.45)]",
    blue: "shadow-[0_60px_180px_-30px_rgba(45,127,249,0.70),0_36px_100px_-20px_rgba(20,184,166,0.40)]",
    gold: "shadow-[0_60px_180px_-30px_rgba(229,184,75,0.65),0_36px_100px_-20px_rgba(45,127,249,0.35)]",
    none: "shadow-[0_36px_100px_-24px_rgba(0,0,0,0.85)]",
  };
  const glowClass = size === "dramatic" ? dramaticGlow[glow] : tone.glow;

  return (
    <figure className={cn("relative", className)}>
      {/* Big positioned glow halo behind the frame. */}
      <ScreenshotHalo tone={glow} size="lg" />
      {cornerTrace && <PosterCornerTrace tone={glow} position="all" />}

      <div
        className={cn(
          "relative overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(8,14,26,0.7)] ring-1 ring-white/[0.04] backdrop-blur-md sm:rounded-[2.25rem]",
          glowClass,
        )}
      >
        {/* Top accent edge line — brighter for dramatic. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-16 top-0 z-20 h-px",
            size === "dramatic" ? "opacity-100" : "opacity-80",
            glow === "gold"
              ? "bg-gradient-to-r from-transparent via-[#E5B84B]/80 to-transparent"
              : glow === "blue"
                ? "bg-gradient-to-r from-transparent via-primary/80 to-transparent"
                : "bg-gradient-to-r from-transparent via-[var(--accent)]/80 to-transparent",
          )}
        />
        {/* Cinematic veil. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_85%_80%_at_50%_-10%,rgba(255,255,255,0.08),transparent_55%)]"
        />
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1180px"}
          className="relative z-0 block h-auto w-full"
        />
      </div>

      {tag && (
        <span
          className={cn(
            "absolute -top-3 left-8 z-20 inline-flex items-center gap-1.5 rounded-full border bg-[rgba(8,14,26,0.92)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur",
            TONE[tag.tone ?? glow].border,
            TONE[tag.tone ?? glow].text,
          )}
        >
          <span
            aria-hidden
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              TONE[tag.tone ?? glow].chipBg,
              "ring-2",
              TONE[tag.tone ?? glow].chipRing,
            )}
          />
          {tag.label}
        </span>
      )}

      {caption && (
        <figcaption className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ---------------------------------------------------------------------------
 * SplitFeatureRow — image on one side, copy on the other. Premium spacing.
 * ------------------------------------------------------------------------- */

export function SplitFeatureRow({
  children,
  reversed = false,
  className,
}: {
  children: ReactNode;
  reversed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
        reversed && "lg:[&>*:first-child]:order-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * FeatureTile — premium glass card for the core feature grid.
 * ------------------------------------------------------------------------- */

export function FeatureTile({
  icon: Icon,
  title,
  desc,
  accentColor = "cyan",
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  desc: string;
  accentColor?: "cyan" | "blue" | "gold";
  className?: string;
}) {
  const accent = TONE[accentColor];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.65)] p-6 ring-1 ring-white/[0.04] backdrop-blur-md transition duration-200 hover:border-[var(--accent)]/40 hover:shadow-[0_28px_70px_-28px_rgba(20,184,166,0.45)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 transition group-hover:opacity-100"
      />
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl ring-1",
          accent.text,
          accent.chipBg,
          accent.chipRing,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * TrustChip — small premium credential row for the trust band.
 * ------------------------------------------------------------------------- */

export function TrustChip({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.55)] p-5 ring-1 ring-white/[0.03] backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
