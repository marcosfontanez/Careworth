"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  PenLine,
  Sparkles,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

import { createWebThoughtAction } from "@/app/web-app/actions";
import type { WebAppCreateCopy } from "@/lib/marketing-copy/web-app";

const BODY_MAX = 500;
const MOOD_MAX = 60;

function OpenInAppTile({
  href,
  icon: Icon,
  title,
  body,
  cta,
  external,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  cta: string;
  external: boolean;
}) {
  const externalProps = external ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <a
      href={href}
      {...externalProps}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(12,18,32,0.7)] p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-[rgba(18,26,44,0.85)]"
    >
      <div className="min-w-0">
        <div className="mb-1 inline-flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--accent)]">
          <Icon className="size-4" aria-hidden />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 self-end rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition group-hover:border-white/25">
        {cta}
        <ChevronRight className="size-3.5" aria-hidden />
      </span>
    </a>
  );
}

export function WebCreate({
  copy,
  myPulseHref,
  imageHref,
  videoHref,
  circleHref,
  isExternalApp,
}: {
  copy: WebAppCreateCopy;
  myPulseHref: string;
  imageHref: string;
  videoHref: string;
  circleHref: string;
  isExternalApp: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mood, setMood] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = body.trim();
  const overLimit = body.length > BODY_MAX;
  const canSubmit = trimmed.length > 0 && !overLimit && !pending;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const res = await createWebThoughtAction({ body: trimmed, mood: mood.trim() });
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent("/web-app/create")}`);
          return;
        }
        setError(
          res.reason === "empty"
            ? copy.emptyError
            : res.reason === "tooLong"
              ? copy.tooLongError
              : copy.errorGeneric,
        );
        return;
      }
      setBody("");
      setMood("");
      setDone(true);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </header>

      {/* Text / Pulse update composer */}
      <section className="mb-7 rounded-3xl border border-white/10 bg-gradient-to-br from-[rgba(18,26,44,0.92)] to-[rgba(12,18,32,0.82)] p-5 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.95)] backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[var(--accent)]">
            <PenLine className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">{copy.textTitle}</h2>
            <p className="text-xs text-muted-foreground">{copy.textBody}</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5 text-center">
            <CheckCircle2 className="mx-auto size-7 text-emerald-300" aria-hidden />
            <p className="mt-2 text-sm font-bold text-foreground">{copy.successTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy.successBody}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <Link
                href={myPulseHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_0_28px_-8px_rgba(45,127,249,0.9)] transition hover:brightness-110"
              >
                {copy.viewMyPulse}
              </Link>
              <button
                type="button"
                onClick={() => setDone(false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-foreground/90 transition hover:border-white/25"
              >
                {copy.composeAnother}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={[
                "rounded-2xl border bg-white/[0.04] px-3.5 py-3 transition focus-within:border-primary/40",
                error ? "border-amber-400/60" : "border-white/12",
              ].join(" ")}
            >
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (error) setError(null);
                }}
                rows={4}
                maxLength={BODY_MAX + 40}
                placeholder={copy.textPlaceholder}
                aria-label={copy.textPlaceholder}
                disabled={pending}
                className="min-h-[5rem] w-full resize-y bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
              />
              <div className="mt-2 border-t border-white/8 pt-2">
                <input
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  maxLength={MOOD_MAX}
                  placeholder={copy.moodPlaceholder}
                  aria-label={copy.moodPlaceholder}
                  disabled={pending}
                  className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-amber-300/90">{error ?? ""}</span>
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "text-[11px] tabular-nums",
                    overLimit ? "text-amber-400" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {body.length}/{BODY_MAX}
                </span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_0_28px_-8px_rgba(45,127,249,0.9)] transition enabled:hover:brightness-110 disabled:opacity-40"
                >
                  {pending ? copy.postingCta : copy.postCta}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Advanced creation — open in app */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Sparkles className="size-4" aria-hidden />
          {copy.openInApp}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <OpenInAppTile href={imageHref} icon={ImagePlus} title={copy.imageTitle} body={copy.imageBody} cta={copy.openInApp} external={isExternalApp} />
          <OpenInAppTile href={videoHref} icon={Video} title={copy.videoTitle} body={copy.videoBody} cta={copy.openInApp} external={isExternalApp} />
          <OpenInAppTile href={circleHref} icon={Users} title={copy.circleTitle} body={copy.circleBody} cta={copy.openInApp} external={isExternalApp} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{copy.inAppNote}</p>
      </section>
    </div>
  );
}
