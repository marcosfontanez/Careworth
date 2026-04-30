"use client";

import { useState, useTransition } from "react";

import { createPartnerApiKeyAction } from "@/app/(admin)/admin/(console)/platform/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePartnerKeyForm() {
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setErr(null);
    setSecret(null);
    start(async () => {
      const r = await createPartnerApiKeyAction(label);
      if (r.error) setErr(r.error);
      else if (r.secret) {
        setSecret(r.secret);
        setLabel("");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="partner-label">New key label</Label>
        <Input
          id="partner-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Agency reporting — Q2"
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
      <Button type="button" size="sm" disabled={pending || !label.trim()} onClick={submit}>
        {pending ? "Creating…" : "Create key"}
      </Button>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      {secret ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold text-amber-100">Copy this secret now — it will not be shown again.</p>
          <code className="mt-2 block break-all text-xs text-foreground/90">{secret}</code>
        </div>
      ) : null}
    </div>
  );
}
