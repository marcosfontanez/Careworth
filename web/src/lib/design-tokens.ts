/** PulseVerse brand — source of truth for non–CSS-module references. Tailwind class bundles: see `ui-classes.ts`. */
export const pv = {
  navy: "#0B1F3A",
  navyDeep: "#060E1A",
  electric: "#2563EB",
  teal: "#19D3C5",
  aqua: "#0FA3B1",
  gold: "#E5B84B",
  white: "#FFFFFF",
  coolGray: "#F4F7FB",
  slate: "#5B6B7F",
  darkText: "#111827",
} as const;

export const site = {
  name: "PulseVerse",
  tagline: "Healthcare culture, all in one place.",
  description: "The social platform for the global healthcare community.",
} as const;

/** Full-color 3D lockup; background removed (transparent PNG). */
export const pulseverseLogoLockup = {
  src: "/brand/pulseverse-logo-lockup.png" as const,
  width: 1024,
  height: 682,
} as const;
