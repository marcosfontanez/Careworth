"use client";

import { Check, UserPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleCircleMembershipAction } from "@/app/web-app/actions";
import type { WebAppCirclesCopy } from "@/lib/marketing-copy/web-app";

/**
 * Join / leave toggle for a Circle room header. Optimistic with rollback; on
 * success it `router.refresh()`es so the server reconciles member count and any
 * membership-gated affordances (e.g. thread replies). Membership writes go
 * straight to `community_members` under the "manage own memberships" RLS policy.
 */
export function WebCircleJoinButton({
  slug,
  initialJoined,
  copy,
}: {
  slug: string;
  initialJoined: boolean;
  copy: WebAppCirclesCopy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [joined, setJoined] = useState(initialJoined);
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    setErrored(false);
    const next = !joined;
    setJoined(next); // optimistic
    startTransition(async () => {
      const res = await toggleCircleMembershipAction(slug);
      if (!res.ok) {
        setJoined(!next); // rollback
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? `/web-app/circles/${slug}`)}`);
          return;
        }
        setErrored(true);
        return;
      }
      setJoined(res.joined);
      router.refresh();
    });
  }

  const label = errored ? copy.joinError : joined ? copy.joinedCta : copy.joinCta;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={joined}
      className={[
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
        joined
          ? "border border-white/15 bg-white/5 text-foreground/90 hover:border-white/25"
          : "bg-gradient-to-r from-teal-400 to-sky-500 text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] hover:brightness-110",
        errored ? "ring-1 ring-amber-400/60" : "",
      ].join(" ")}
    >
      {joined ? <Check className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
      {label}
    </button>
  );
}
