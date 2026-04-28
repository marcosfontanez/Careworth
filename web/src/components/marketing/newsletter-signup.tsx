"use client";

import { useActionState } from "react";

import { subscribeNewsletter, type MarketingFormState } from "@/app/actions/marketing-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: MarketingFormState = {};

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, initial);

  if (state?.ok) {
    return (
      <p className="mt-4 text-sm text-[var(--accent)]" role="status">
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="source" value={source} />
      <input type="text" name="company_website" autoComplete="off" tabIndex={-1} className="hidden" aria-hidden />
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <Input
          type="email"
          name="email"
          required
          placeholder="Email"
          disabled={pending}
          className="border-white/10 bg-white/[0.04] placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={pending}
          size="icon"
          className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Subscribe"
        >
          {pending ? "…" : "→"}
        </Button>
      </div>
      {state?.error && <p className="mt-2 text-xs text-red-300">{state.error}</p>}
    </form>
  );
}
