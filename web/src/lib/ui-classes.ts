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
  "border border-[rgba(148,163,184,0.12)] bg-[rgba(12,21,36,0.55)] ring-1 ring-white/[0.03] backdrop-blur-sm";

export const shadowPrimaryCta = "shadow-[0_0_32px_-4px_rgba(45,127,249,0.65)]";

export const adminPanelSurface =
  "border-border/80 bg-card/85 shadow-sm ring-1 ring-white/[0.05] backdrop-blur-sm";

export const marketingElevatedFrame =
  "rounded-2xl border border-[rgba(148,163,184,0.14)] bg-[rgba(12,21,36,0.75)] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-md";

/** Marketing primary CTA — pill, mock style */
export const marketingCtaPrimary =
  "rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90";
