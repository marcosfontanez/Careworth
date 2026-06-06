"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createCircleThreadAction } from "@/app/web-app/actions";
import type { CircleFlairTag } from "@/lib/circles/flairs";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

import { WebCircleComposerFlairPicker } from "./web-circle-composer-flair-picker";

const TITLE_MAX = 500;
const BODY_MAX = 12000;

export function WebCircleThreadComposer({
  slug,
  categories,
  isConfession,
  copy,
  postType = "thread",
  defaultFlair = null,
  initialTitle,
  initialBody,
  onCancel,
}: {
  slug: string;
  categories: string[];
  isConfession: boolean;
  copy: WebAppCirclesCopy;
  postType?: "thread" | "question";
  defaultFlair?: CircleFlairTag | null;
  initialTitle?: string;
  initialBody?: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [title, setTitle] = useState(() => initialTitle?.trim() ?? "");
  const [body, setBody] = useState(() => initialBody?.trim() ?? "");
  const [flair, setFlair] = useState<CircleFlairTag | null>(
    defaultFlair ?? (postType === "question" ? "question" : null),
  );
  const [validation, setValidation] = useState<"title" | "body" | null>(null);
  const [errored, setErrored] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [pending, startTransition] = useTransition();

  const titleTrim = title.trim();
  const bodyTrim = body.trim();
  const titleOver = title.length > TITLE_MAX;
  const bodyOver = body.length > BODY_MAX;
  const canSubmit =
    titleTrim.length > 0 &&
    bodyTrim.length > 0 &&
    !titleOver &&
    !bodyOver &&
    !pending;

  function submit() {
    if (!canSubmit) {
      if (!titleTrim) setValidation("title");
      else if (!bodyTrim) setValidation("body");
      return;
    }
    setValidation(null);
    setErrored(false);
    setMembersOnly(false);
    startTransition(async () => {
      const res = await createCircleThreadAction(slug, {
        title: titleTrim,
        body: bodyTrim,
        flairTag: flair,
        postType,
      });
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? `/web-app/circles/${slug}`)}`);
          return;
        }
        if (res.reason === "not_member") {
          setMembersOnly(true);
          return;
        }
        if (res.reason === "empty") {
          setValidation(!titleTrim ? "title" : "body");
          return;
        }
        setErrored(true);
        return;
      }
      router.push(`/web-app/circles/${encodeURIComponent(slug)}/thread/${res.threadId}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl border border-primary/25 bg-[rgba(12,18,32,0.88)] p-4 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold text-foreground">{copy.threadComposerTitle}</h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          {copy.threadComposerCancel}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validation === "title") setValidation(null);
              if (errored) setErrored(false);
            }}
            maxLength={TITLE_MAX + 20}
            placeholder={copy.threadComposerTitlePlaceholder}
            aria-label={copy.threadComposerTitlePlaceholder}
            disabled={pending}
            className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between px-1 text-[11px]">
            <span className="text-amber-300/90">
              {validation === "title" ? copy.threadComposerTitleRequired : ""}
            </span>
            <span className={titleOver ? "text-amber-400" : "text-muted-foreground"}>
              {title.length}/{TITLE_MAX}
            </span>
          </div>
        </div>

        <div>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (validation === "body") setValidation(null);
              if (errored) setErrored(false);
            }}
            rows={4}
            maxLength={BODY_MAX + 100}
            placeholder={copy.threadComposerBodyPlaceholder}
            aria-label={copy.threadComposerBodyPlaceholder}
            disabled={pending}
            className="w-full resize-y rounded-2xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between px-1 text-[11px]">
            <span className="text-amber-300/90">
              {validation === "body" ? copy.threadComposerBodyRequired : ""}
            </span>
            <span className={bodyOver ? "text-amber-400" : "text-muted-foreground"}>
              {body.length}/{BODY_MAX}
            </span>
          </div>
        </div>

        <WebCircleComposerFlairPicker
          slug={slug}
          categories={categories}
          selected={flair}
          onSelect={setFlair}
          isConfession={isConfession}
          copy={copy}
          disabled={pending}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] text-amber-300/90">
          {membersOnly
            ? copy.replyMembersOnly
            : errored
              ? copy.threadComposerError
              : pending
                ? copy.threadComposerPosting
                : ""}
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-5 py-2 text-sm font-semibold text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] transition enabled:hover:brightness-110 disabled:opacity-45"
        >
          {pending ? copy.threadComposerPosting : copy.threadComposerSubmit}
        </button>
      </div>
    </div>
  );
}
