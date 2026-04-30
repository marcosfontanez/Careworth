"use client";

import { useEffect, useRef } from "react";
import { track } from "@vercel/analytics";

import { MARKETING_EVENTS } from "@/lib/marketing-analytics";

/** Fire once per full page load when user lands on thank-you state (contact uses server redirect). */
export function ContactSuccessTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(MARKETING_EVENTS.contactSuccess, { surface: "contact_form" });
  }, []);

  return null;
}
