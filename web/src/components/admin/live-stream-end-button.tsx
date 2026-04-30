"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LiveStreamEndButton({ streamId, disabled }: { streamId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {err ? <span className="text-[10px] text-red-300">{err}</span> : null}
      <Button
        size="sm"
        variant="destructive"
        type="button"
        disabled={disabled || pending}
        onClick={async () => {
          if (!window.confirm("End this stream for all viewers?")) return;
          setErr(null);
          setPending(true);
          try {
            const res = await fetch("/api/admin/live/end", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              credentials: "same-origin",
              body: JSON.stringify({ streamId }),
            });
            const data = (await res.json()) as { ok?: boolean; error?: string };
            if (!res.ok || !data.ok) setErr(data.error ?? `Failed (${res.status})`);
            else router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Network error");
          } finally {
            setPending(false);
          }
        }}
      >
        End stream
      </Button>
    </div>
  );
}
