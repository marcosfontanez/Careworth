"use client";

import Link from "next/link";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/components/auth/supabase-browser-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LoginPageCopy } from "@/lib/marketing-copy/login-page";
import { marketingInlineLink } from "@/lib/ui-classes";
import type { Locale } from "@/lib/i18n";

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("confirm your email")) {
    return "Confirm your email first (check your inbox for the link from PulseVerse).";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  return "Sign-in failed. Check your email and password.";
}

export function MarketingLoginForm({ locale: _locale, c, nextPath }: { locale: Locale; c: LoginPageCopy; nextPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");
    if (!email || !password) {
      setError("Enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) {
        setError(mapAuthError(signErr.message));
        setLoading(false);
        return;
      }
      const dest = nextPath && nextPath.startsWith("/") ? nextPath : "/me";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <>
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{c.emailLabel}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder={c.emailPlaceholder}
            disabled={loading}
            className="border-white/10 bg-white/[0.04]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{c.passwordLabel}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={loading}
            className="border-white/10 bg-white/[0.04]"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary font-semibold text-primary-foreground shadow-[0_0_24px_-8px_rgba(45,127,249,0.8)]"
        >
          {loading ? "…" : c.submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {c.newUser}{" "}
        <Link href="/download" className={marketingInlineLink}>
          {c.getTheApp}
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link href="/admin/login" className={marketingInlineLink}>
          {c.staffLink}
        </Link>
      </p>
    </>
  );
}
