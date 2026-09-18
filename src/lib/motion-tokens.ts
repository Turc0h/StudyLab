/**
 * Tokens de animación unificados para StudyLab / CognitiveOS (FASE 5)
 * Reglas de consistencia:
 * - Duraciones: micro (100ms), standard (200ms), complex (300ms).
 * - Curvas de Bézier: entrada (easeIn), salida (easeOut), énfasis (easeEmphasis).
 * - Propiedades animables prioritarias: transform y opacity (aceleradas por GPU sin layout reflow).
 */

export const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_STANDARD = [0.2, 0, 0, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const EASE_OUT = [0, 0, 0.2, 1] as const;
export const EASE_EMPHASIS = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  micro: 0.1,    // 100ms: micro-interacciones de hover, foco, switch
  standard: 0.2, // 200ms: transiciones de navegación, dropdowns, modales
  complex: 0.3,  // 300ms: paneles laterales, drawers de organización
  instant: 0.1,  // alias compatibilidad
  fast: 0.2,     // alias compatibilidad
  base: 0.3,     // alias compatibilidad
  slow: 0.4,     // alias compatibilidad
} as const;

export const STAGGER = {
  tight: 0.02,
  base: 0.04,
  loose: 0.06,
} as const;
