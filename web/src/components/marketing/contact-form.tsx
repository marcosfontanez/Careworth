"use client";

import { useActionState } from "react";

import { submitContactForm, type MarketingFormState } from "@/app/actions/marketing-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import { formatContactTopicSnippet, getContactFormCopy } from "@/lib/marketing-copy/contact";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const initial: MarketingFormState = {};

export function ContactForm({ initialTopic = "", locale }: { initialTopic?: string; locale: Locale }) {
  const [state, formAction, pending] = useActionState(submitContactForm, initial);
  const t = getContactFormCopy(locale);
  const topicHuman = initialTopic ? formatContactTopicSnippet(initialTopic) : "";
  const messagePlaceholder = initialTopic
    ? t.messagePlaceholderTopic.replace("{topic}", topicHuman)
    : t.messagePlaceholderDefault;

  return (
    <form action={formAction} className={cn("mt-10 space-y-4 rounded-2xl p-6 sm:p-8", marketingCardMuted)}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="topic" value={initialTopic} />
      {/* Honeypot */}
      <input type="text" name="company_website" autoComplete="off" tabIndex={-1} className="hidden" aria-hidden />
      {state?.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">{t.nameLabel}</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder={t.namePlaceholder}
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder={t.emailPlaceholder}
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="msg">{t.messageLabel}</Label>
        <Textarea
          id="msg"
          name="message"
          required
          placeholder={messagePlaceholder}
          className="min-h-28 border-white/10 bg-white/[0.04]"
        />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className={cn(
          "w-full font-semibold",
          "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.55)]",
        )}
      >
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
