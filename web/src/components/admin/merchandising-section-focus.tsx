"use client";

import { useEffect } from "react";

/** Scrolls the combined merchandising page to the section from `?section=` on mount. */
export function MerchandisingSectionFocus({ section }: { section: "shop" | "frames" }) {
  useEffect(() => {
    const id = section === "frames" ? "merch-avatar-frames" : "merch-pulse-shop";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [section]);
  return null;
}
