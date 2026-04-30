"use client";

import { useActionState, useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

import { subscribeNewsletter, type MarketingFormState } from "@/app/actions/marketing-forms";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { MARKETING_EVENTS } from "@/lib/marketing-analytics";
import { getNewsletterFormUi } from "@/lib/marketing-copy/forms";
import { Input } from "@/components/ui/input";

const initial: MarketingFormState = {};

export function NewsletterSignup({ source = "footer", locale = "en" }: { source?: string; locale?: Locale }) {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, initial);
  const ui = getNewsletterFormUi(locale);
  const trackedSuccess = useRef(false);

  useEffect(() => {
    if (!state?.ok || trackedSuccess.current) return;
    trackedSuccess.current = true;
    track(MARKETING_EVENTS.newsletterSignup, { source });
  }, [state?.ok, source]);

  if (state?.ok) {
    return (
      <p className="mt-4 text-sm text-[var(--accent)]" role="status">
        {ui.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      <input type="text" name="company_website" autoComplete="off" tabIndex={-1} className="hidden" aria-hidden />
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
        <Input
          type="email"
          name="email"
          required
          placeholder={ui.placeholder}
          disabled={pending}
          autoComplete="email"
          className="border-white/10 bg-white/[0.04] placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          disabled={pending}
          size="icon"
          className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label={ui.subscribeAria}
        >
          {pending ? "…" : "→"}
        </Button>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">{ui.disclaimer}</p>
      {state?.error && <p className="mt-2 text-xs text-red-300">{state.error}</p>}
    </form>
  );
}
