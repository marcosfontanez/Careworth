/**
 * PulseVerse web — Tailwind class bundles for visual consistency.
 * Aligned to mockups: royal blue primary, cyan accents, glass cards.
 */

import { cn } from "@/lib/utils";

const marketingPageInset = "mx-auto w-full px-4 py-16 sm:px-6 md:py-20";

export const marketingGutterX = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export const marketingShell = cn(marketingPageInset, "max-w-6xl");

export const marketingShellNarrow = cn(marketingPageInset, "max-w-3xl");

export const marketingShellTight = cn(marketingPageInset, "max-w-2xl");

export const marketingShellForm = cn(marketingPageInset, "max-w-xl");

export const marketingEyebrow =
  "text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] sm:text-sm";

export const marketingSectionTitle = "text-2xl font-bold tracking-tight text-foreground sm:text-3xl";

export const marketingCardInteractive =
  "border border-[rgba(148,163,184,0.14)] bg-[rgba(12,21,36,0.65)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition duration-200 hover:border-primary/45 hover:shadow-[0_0_48px_-12px_rgba(45,127,249,0.35)]";

export const marketingCardMuted =
  "border border-[rgba(148,163,184,0.12)] bg-[rgba(12,21,36,0.55)] ring-1 ring-white/3 backdrop-blur-sm";

export const shadowPrimaryCta = "shadow-[0_0_32px_-4px_rgba(45,127,249,0.65)]";

export const adminPanelSurface =
  "border-border/80 bg-card/85 shadow-sm ring-1 ring-white/5 backdrop-blur-sm";

export const marketingElevatedFrame =
  "rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(12,21,36,0.75)] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md";

/** Shared focus ring for marketing interactive surfaces (WCAG-visible on dark navy). */
export const marketingFocusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a14]";

/** Inline links on dark marketing surfaces — sky-300 meets ~4.5:1 on navy/footer (#030712); primary blue did not. */
export const marketingInlineLink = cn(
  "font-medium text-sky-300 underline decoration-sky-300/70 underline-offset-[3px] hover:text-sky-200 hover:decoration-sky-200",
  marketingFocusRing,
  "rounded-sm",
);

/** Heavier weight for card “Explore” links (same contrast token as `marketingInlineLink`). */
export const marketingInlineLinkStrong = cn(
  "font-semibold text-sky-300 underline decoration-sky-300/70 underline-offset-[3px] hover:text-sky-200 hover:decoration-sky-200",
  marketingFocusRing,
  "rounded-sm",
);

/** Marketing primary CTA — pill, mock style */
export const marketingCtaPrimary =
  "rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90";

/** Standard marketing section rhythm — border, spacing, isolation. */
export const marketingSection =
  "relative isolate border-t border-white/5 py-12 sm:py-16 lg:py-20";

/** Glass product / feature tile — app-like surface with hover + focus. */
export const marketingSurfaceTile = cn(
  marketingCardInteractive,
  "rounded-2xl ring-1 ring-white/4",
  marketingFocusRing,
);

/** Primary gradient CTA button (Join Beta / Get the app). */
export const marketingCtaPrimaryClasses = cn(
  "h-11 min-h-11 rounded-full px-6 text-sm font-semibold sm:h-12 sm:px-7 sm:text-base",
  "bg-gradient-to-r from-primary via-[#2d7ff9] to-[#00a8cc] text-primary-foreground",
  "transition-[transform,filter,box-shadow] duration-200 hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.98] active:brightness-95",
  shadowPrimaryCta,
  marketingFocusRing,
);

/** Secondary glass CTA button. */
export const marketingCtaSecondaryClasses = cn(
  "h-11 min-h-11 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-foreground sm:h-12 sm:px-7 sm:text-base",
  "transition-[transform,background-color,border-color] duration-200 hover:border-white/25 hover:bg-white/8 hover:-translate-y-0.5 active:scale-[0.98]",
  marketingFocusRing,
);

/** Gradient frame used for closing CTAs and feature heroes. */
export const marketingGradientFrame = cn(
  "relative overflow-hidden rounded-[1.75rem] p-px",
  "bg-linear-to-r from-[#0c1f4a] via-primary to-[#00a8cc]",
  "shadow-[0_30px_90px_-24px_rgba(45,127,249,0.45)]",
);

export const marketingGradientFrameInner =
  "relative overflow-hidden rounded-[calc(1.75rem-1px)] bg-[rgba(5,10,20,0.93)]";
