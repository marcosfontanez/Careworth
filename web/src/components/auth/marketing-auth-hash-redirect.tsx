"use client";

import { useEffect } from "react";

/**
 * Supabase email verification often uses the project's **Site URL** (frequently `https://yourdomain/`)
 * with `#access_token=…&refresh_token=…` or `?code=…` on the root path.`/` does not mount the confirm
 * flow, so users see a blank or irrelevant page.`/auth/confirm` handles the exchange and success UI —
 * send them there while preserving hash/query (hash is never sent to the server).
 */
export function MarketingAuthHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const path = window.location.pathname;
    if (path.startsWith("/auth/confirm")) return;

    const search = window.location.search ?? "";
    const hash = window.location.hash ?? "";

    const hasPkce = new URLSearchParams(search).has("code");

    const rawHash = hash.startsWith("#") ? hash.slice(1) : hash;
    const hashParams = new URLSearchParams(rawHash);
    const hasImplicit =
      Boolean(hashParams.get("access_token")) && Boolean(hashParams.get("refresh_token"));

    if (hasPkce || hasImplicit) {
      window.location.replace(`/auth/confirm${search}${hash}`);
    }
  }, []);

  return null;
}
