"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setAppealStatus } from "@/app/(admin)/admin/appeal-actions";
import { Button } from "@/components/ui/button";

export function AppealRowActions({
  appealId,
  status,
}: {
  appealId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => ReturnType<typeof setAppealStatus>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Update failed");
      else router.refresh();
    });
  }

  const closed = status === "accepted" || status === "denied";

  return (
    <div className="space-y-2">
      {err ? <p className="text-xs text-red-300">{err}</p> : null}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={pending || closed}
          onClick={() => run(() => setAppealStatus(appealId, "reviewed"))}
        >
          Mark reviewing
        </Button>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground"
          type="button"
          disabled={pending || closed}
          onClick={() => run(() => setAppealStatus(appealId, "approved"))}
        >
          Approve / restore
        </Button>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          disabled={pending || closed}
          onClick={() => run(() => setAppealStatus(appealId, "rejected"))}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
