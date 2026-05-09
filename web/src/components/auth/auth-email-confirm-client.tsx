"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { getSupabaseBrowserClient } from "@/components/auth/supabase-browser-client";

type UiState =
  | { status: "working" }
  | { status: "success" }
  | { status: "error"; message: string };

/**
 * Handles Supabase email confirmation redirects (signup, etc.).
 * Supabase sends users here with either `?code=` (PKCE) or `#access_token=` (implicit)
 * after clicking the link in their inbox — must be an **https** URL so the browser
 * can load it (custom schemes like `pulseverse://` fail in mail apps).
 */
export function AuthEmailConfirmClient() {
  const [state, setState] = useState<UiState>({ status: "working" });

  const stripSensitiveUrl = useCallback(() => {
    if (typeof window === "undefined" || !window.history?.replaceState) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let supabase: ReturnType<typeof getSupabaseBrowserClient>;
      try {
        supabase = getSupabaseBrowserClient();
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "This site is not fully connected. If this keeps happening, contact support.",
          });
        }
        return;
      }

      const search = new URLSearchParams(window.location.search);
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setState({ status: "error", message: error.message });
          return;
        }
        stripSensitiveUrl();
        setState({ status: "success" });
        return;
      }

      const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(rawHash);
      const hashError =
        hashParams.get("error_description")?.replace(/\+/g, " ") ||
        hashParams.get("error") ||
        "";
      if (hashError) {
        if (!cancelled) {
          setState({
            status: "error",
            message: hashError || "This verification link is not valid. Try signing up again or request a new email.",
          });
        }
        return;
      }
      const access = hashParams.get("access_token");
      const refresh = hashParams.get("refresh_token");
      if (access && refresh) {
        const { error } = await supabase.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
        if (cancelled) return;
        if (error) {
          setState({ status: "error", message: error.message });
          return;
        }
        stripSensitiveUrl();
        setState({ status: "success" });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setState({ status: "success" });
        return;
      }

      setState({
        status: "error",
        message:
          "This link may be expired or already used. Open the PulseVerse app and try signing up again, or request a new confirmation email.",
      });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [stripSensitiveUrl]);

  if (state.status === "working") {
    return (
      <div className="rounded-2xl border border-white/10 bg-[rgba(12,21,36,0.85)] p-8 text-center backdrop-blur-md">
        <h1 className="font-heading text-xl font-semibold text-foreground">Email verification</h1>
        <p className="mt-3 font-medium text-muted-foreground">Verifying your email…</p>
        <p className="mt-1 text-sm text-muted-foreground">This only takes a moment.</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-[rgba(12,21,36,0.85)] p-8 text-center backdrop-blur-md">
        <h1 className="font-heading text-xl font-semibold text-foreground">Could not verify</h1>
        <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-teal-400 underline-offset-4 hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-500/25 bg-[rgba(12,21,36,0.85)] p-8 text-center backdrop-blur-md">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-500/15 ring-2 ring-teal-500/40">
        <CircleCheck className="h-8 w-8 text-teal-400" aria-hidden />
      </div>
      <h1 className="font-heading mt-5 text-2xl font-bold tracking-tight text-foreground">
        You&apos;re verified
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Your email is confirmed and your PulseVerse account is ready.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Open the <strong className="text-foreground">PulseVerse</strong> app on your phone and sign in with the
        email and password you used to register.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        You can close this browser tab when you&apos;re done.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500"
      >
        Sign in on the web
      </Link>
    </div>
  );
}
