"use client";

import { useActionState } from "react";

import { submitContactForm, type MarketingFormState } from "@/app/actions/marketing-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { marketingCardMuted } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const initial: MarketingFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initial);

  return (
    <form action={formAction} className={cn("mt-10 space-y-4 rounded-2xl p-6 sm:p-8", marketingCardMuted)}>
      {/* Honeypot */}
      <input type="text" name="company_website" autoComplete="off" tabIndex={-1} className="hidden" aria-hidden />
      {state?.error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Your name"
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@health.org"
          className="border-white/10 bg-white/[0.04]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="msg">Message</Label>
        <Textarea
          id="msg"
          name="message"
          required
          placeholder="How can we help?"
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
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
