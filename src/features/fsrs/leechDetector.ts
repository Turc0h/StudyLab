/**
 * Leech detector and retrievability calculation for FSRS cards.
 * Sanguijuela: lapses >= 6.
 */
export function detectLeech(lapses: number, threshold = 6): boolean {
  return lapses >= threshold;
}

export function calculateR(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1.0;
  return Math.pow(1 + (19 * elapsedDays) / Math.max(0.1, stability), -0.5);
}
