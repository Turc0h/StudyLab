import type { RatingOption } from "./FlipCard";

/**
 * Determina si un evento de teclado debe ser ignorado porque el usuario
 * está interactuando con un control de formulario editable (input, textarea, select, contenteditable).
 */
export function shouldIgnoreKeyboardEvent(target: any): boolean {
  if (!target) return false;
  const tagName = target.tagName?.toUpperCase();
  if (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable === true
  ) {
    return true;
  }
  if (typeof target.closest === "function") {
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }
  return false;
}

/**
 * Resuelve la opción de calificación asociada a una tecla según los keyHints.
 */
export function resolveRatingKey<T = any>(
  key: string,
  ratings: RatingOption<T>[],
): RatingOption<T> | undefined {
  return ratings.find((r) => r.keyHint === key);
}

/**
 * Limita el ratio de partición entre los umbrales mínimos y máximos configurados.
 */
export function clampSplitRatio(ratio: number, minRatio: number = 20, maxRatio: number = 80): number {
  return Math.min(maxRatio, Math.max(minRatio, ratio));
}

/**
 * Valida la transición entre pasos evaluando canAdvance si el usuario avanza hacia adelante.
 */
export async function validateStepTransition(
  currentIndex: number,
  targetIndex: number,
  canAdvance?: (stepIndex: number) => boolean | Promise<boolean>,
): Promise<boolean> {
  if (targetIndex > currentIndex && canAdvance) {
    try {
      return Boolean(await canAdvance(currentIndex));
    } catch (err) {
      console.error("Error validando paso del Stepper:", err);
      return false;
    }
  }
  return true;
}
