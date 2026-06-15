"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type HomeDemoContextValue = {
  /** Register the demo modal opener (called from HomeDemoVideo on mount). */
  registerDemoOpener: (open: (() => void) | null) => void;
  /** Open the demo video modal from anywhere on the homepage. */
  openDemoVideo: () => void;
};

const HomeDemoContext = createContext<HomeDemoContextValue | null>(null);

export function HomeDemoProvider({ children }: { children: ReactNode }) {
  const openerRef = useRef<(() => void) | null>(null);

  const registerDemoOpener = useCallback((open: (() => void) | null) => {
    openerRef.current = open;
  }, []);

  const openDemoVideo = useCallback(() => {
    openerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerDemoOpener, openDemoVideo }),
    [registerDemoOpener, openDemoVideo],
  );

  return <HomeDemoContext.Provider value={value}>{children}</HomeDemoContext.Provider>;
}

export function useHomeDemo(): HomeDemoContextValue {
  const ctx = useContext(HomeDemoContext);
  if (!ctx) {
    throw new Error("useHomeDemo must be used within HomeDemoProvider");
  }
  return ctx;
}
