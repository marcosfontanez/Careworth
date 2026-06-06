"use client";

import { useEffect } from "react";

import { setCircleLastVisitAt } from "@/lib/circles/circle-visit";

/** Records last visit when the viewer leaves a Circle room (mirrors native blur/leave). */
export function WebCircleVisitTracker({ communityId }: { communityId: string }) {
  useEffect(() => {
    if (!communityId) return;
    return () => {
      setCircleLastVisitAt(communityId);
    };
  }, [communityId]);

  return null;
}
