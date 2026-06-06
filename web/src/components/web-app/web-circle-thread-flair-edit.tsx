"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { updateCircleThreadFlairAction } from "@/app/web-app/actions";
import type { CircleFlairTag, CircleThreadKind } from "@/lib/circles/flairs";
import { flairLabelForThread } from "@/lib/circles/flairs";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

import { WebCircleComposerFlairPicker } from "./web-circle-composer-flair-picker";

export function WebCircleThreadFlairEdit({
  slug,
  threadId,
  categories,
  isConfession,
  initialFlairTag,
  initialKind,
  canEdit,
  copy,
}: {
  slug: string;
  threadId: string;
  categories: string[];
  isConfession: boolean;
  initialFlairTag: CircleFlairTag | null;
  initialKind: CircleThreadKind;
  canEdit: boolean;
  copy: WebAppCirclesCopy;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [flairTag, setFlairTag] = useState<CircleFlairTag | null>(initialFlairTag);
  const [kind, setKind] = useState(initialKind);
  const [draft, setDraft] = useState<CircleFlairTag | null>(initialFlairTag);
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  const label = flairLabelForThread({ kind, flairTag });

  if (!canEdit) {
    return (
      <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
        {label}
      </span>
    );
  }

  function save() {
    if (pending || draft === flairTag) {
      setEditing(false);
      return;
    }
    setErrored(false);
    startTransition(async () => {
      const res = await updateCircleThreadFlairAction(slug, threadId, draft);
      if (!res.ok) {
        setErrored(true);
        return;
      }
      setFlairTag(res.flairTag);
      setKind(res.kind);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          {label}
        </span>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(flairTag);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition hover:border-white/20 hover:text-foreground"
          >
            <Pencil className="size-3" aria-hidden />
            {copy.editFlairLabel}
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <WebCircleComposerFlairPicker
            slug={slug}
            categories={categories}
            selected={draft}
            onSelect={setDraft}
            isConfession={isConfession}
            copy={copy}
            disabled={pending}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-amber-300/90">{errored ? copy.editFlairError : ""}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={pending}
                className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                {copy.editFlairCancel}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-3 py-1 text-xs font-semibold text-[#04121f] disabled:opacity-50"
              >
                {pending ? copy.editFlairSaving : copy.editFlairSave}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
