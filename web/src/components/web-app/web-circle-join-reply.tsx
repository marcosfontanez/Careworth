"use client";

import { UserPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleCircleMembershipAction } from "@/app/web-app/actions";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

/**
 * Join-to-reply prompt for signed-in non-members on a Circle thread. The thread
 * route is auth-gated, so anyone seeing this is signed in but not yet a member —
 * and Circle reply RLS (`is_member_of_community`) blocks posting until they join.
 * On a successful join we `router.refresh()` so the server re-renders the thread
 * with `canReply = true`, revealing the real reply composer.
 */
export function WebCircleJoinReply({
  slug,
  copy,
}: {
  slug: string;
  copy: WebAppCirclesCopy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  function join() {
    if (pending) return;
    setErrored(false);
    startTransition(async () => {
      const res = await toggleCircleMembershipAction(slug);
      if (!res.ok) {
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? `/web-app/circles/${slug}`)}`);
          return;
        }
        setErrored(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{copy.joinToReplyTitle}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy.joinToReplyBody}</p>
        </div>
        <button
          type="button"
          onClick={join}
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-500 px-4 py-2 text-sm font-semibold text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] transition enabled:hover:brightness-110 disabled:opacity-60"
        >
          <UserPlus className="size-4" aria-hidden />
          {pending ? copy.joinPending : copy.joinCta}
        </button>
      </div>
      {errored ? <p className="mt-2 text-[11px] text-amber-300/90">{copy.joinError}</p> : null}
    </div>
  );
}
