export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/** Unified radii: cards 20–24, chips 12–16, buttons 14–18, sheets 24+ */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  card: 22,
  chip: 14,
  button: 16,
  sheet: 28,
  full: 9999,
} as const;
