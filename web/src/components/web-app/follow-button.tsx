"use client";

import { Check, UserPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { toggleFollowAction } from "@/app/web-app/actions";

type Labels = { follow: string; following: string; error: string };

/**
 * Follow / unfollow toggle for native web Pulse Pages. Optimistic with rollback;
 * on success it refreshes the route so the follower count (kept by a DB trigger)
 * reconciles. Auth failures route to login. Only rendered when the loader marks
 * the profile as followable (not owner, visible, not blocked).
 */
export function FollowButton({
  targetUserId,
  initialFollowing,
  labels,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [errored, setErrored] = useState(false);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (pending) return;
    setErrored(false);
    const next = !following;
    setFollowing(next); // optimistic

    startTransition(async () => {
      const res = await toggleFollowAction(targetUserId);
      if (!res.ok) {
        setFollowing(!next); // rollback
        if (res.reason === "auth") {
          router.push(`/login?next=${encodeURIComponent(pathname ?? "/web-app/feed")}`);
          return;
        }
        setErrored(true);
        return;
      }
      setFollowing(res.active);
      // Reconcile follower count (DB trigger) without a full reload.
      router.refresh();
    });
  }

  const label = errored ? labels.error : following ? labels.following : labels.follow;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
        following
          ? "border border-white/15 bg-white/5 text-foreground/90 hover:border-white/25"
          : "bg-gradient-to-r from-teal-400 to-sky-500 text-[#04121f] shadow-[0_10px_30px_-12px_rgba(20,184,166,0.8)] hover:brightness-110",
        errored ? "ring-1 ring-amber-400/60" : "",
      ].join(" ")}
    >
      {following ? <Check className="size-4" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
      {label}
    </button>
  );
}
