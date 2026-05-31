import Image from "next/image";
import Link from "next/link";
import {
  Home,
  LayoutGrid,
  Radio,
  RefreshCw,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

import { pulseverseLogoLockup } from "@/lib/design-tokens";
import type { WebAppLandingCopy } from "@/lib/marketing-copy/web-app";
import { cn } from "@/lib/utils";

const FEATURE_ICONS: LucideIcon[] = [Home, LayoutGrid, Radio, User, Sparkles, RefreshCw];

export function WebAppLanding({
  copy,
  loginHref = "/login?next=/web-app",
  getAppHref = "/download",
}: {
  copy: WebAppLandingCopy;
  loginHref?: string;
  getAppHref?: string;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[#020617]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_15%_-10%,rgba(20,184,166,0.14),transparent_55%),radial-gradient(ellipse_60%_45%_at_95%_25%,rgba(45,127,249,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_50%_120%,rgba(13,28,55,0.7),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 -z-10 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 -z-10 h-[380px] w-[380px] rounded-full bg-accent/10 blur-[120px]"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-10 sm:px-6 sm:py-16">
        {/* Brand row — full PulseVerse lockup, large in the upper-left corner */}
        <Link href="/" className="self-start" aria-label={`${copy.kicker} home`}>
          <Image
            src={pulseverseLogoLockup.src}
            alt={copy.kicker}
            width={pulseverseLogoLockup.width}
            height={pulseverseLogoLockup.height}
            priority
            sizes="(max-width: 640px) 220px, 320px"
            className="h-16 w-auto object-contain object-left sm:h-20 md:h-24"
          />
        </Link>

        {/* Hero */}
        <div className="mx-auto mt-12 max-w-3xl text-center sm:mt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/25 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
            {copy.kicker}
          </span>
          <h1 className="mt-5 text-balance font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            {copy.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {copy.subtitle}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={loginHref}
              className={cn(
                "inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent px-7 py-3 text-base font-semibold text-white shadow-[0_0_34px_-6px_rgba(45,127,249,0.8)] transition hover:brightness-110 sm:w-auto",
              )}
            >
              {copy.loginCta}
            </Link>
            <Link
              href={getAppHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-base font-medium text-foreground transition hover:border-white/30 sm:w-auto"
            >
              {copy.getAppCta}
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{copy.ctaNote}</p>
        </div>

        {/* Feature grid */}
        <div className="mx-auto mt-16 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {copy.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.6)] p-5 backdrop-blur-sm transition hover:border-primary/40 hover:shadow-[0_0_48px_-12px_rgba(45,127,249,0.35)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 text-primary ring-1 ring-primary/25">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
