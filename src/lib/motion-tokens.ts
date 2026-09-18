export const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.3,
  slow: 0.45,
} as const;

export const STAGGER = {
  tight: 0.03,
  base: 0.05,
  loose: 0.08,
} as const;
