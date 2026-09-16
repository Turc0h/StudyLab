/**
 * Free Spaced Repetition Scheduler (FSRS v4.5/v5) Mathematical Model
 *
 * Implements canonical equations for:
 * - Retrievability: R(t, S) = (1 + 19 * t / S)^(-0.5)
 * - Half-life: t_1/2 = (3 / 19) * S ~= 0.1579 * S
 * - Initial & Updated Stability and Difficulty
 * - Optimal interval calculation given target retrievability (default 90%)
 */

export const FSRS_CANONICAL_WEIGHTS: number[] = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
  1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 0.22695, 0.5698, 2.85535,
];

export type FsrsRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface FsrsParameters {
  weights: number[];
  desiredRetention: number; // e.g. 0.90 (90%)
  maxIntervalDays: number; // e.g. 36500 (100 years)
}

export const DEFAULT_FSRS_PARAMS: FsrsParameters = {
  weights: FSRS_CANONICAL_WEIGHTS,
  desiredRetention: 0.90,
  maxIntervalDays: 36500,
};

/**
 * Calculates Retrievability R(t, S)
 * @param t Elapsed time in days since last review
 * @param s Stability in days
 */
export function calculateRetrievability(t: number, s: number): number {
  if (t <= 0) return 1.0;
  const stability = Math.max(0.01, s);
  const factor = 19.0;
  const r = Math.pow(1.0 + (factor * t) / stability, -0.5);
  return Math.min(1.0, Math.max(0.0, r));
}

/**
 * Calculates Knowledge Half-Life: t_(1/2) in days
 * The time required for retrievability to drop to 50%
 */
export function calculateHalfLife(s: number): number {
  return (3.0 / 19.0) * Math.max(0.01, s);
}

/**
 * Initial Difficulty D_0(G) based on initial rating G in [1..4]
 */
export function calculateInitialDifficulty(rating: FsrsRating, w: number[] = FSRS_CANONICAL_WEIGHTS): number {
  const d0 = w[4] - Math.exp(w[5] * (rating - 1)) + 1.0;
  return Math.min(10.0, Math.max(1.0, d0));
}

/**
 * Initial Stability S_0(G) based on initial rating G in [1..4]
 */
export function calculateInitialStability(rating: FsrsRating, w: number[] = FSRS_CANONICAL_WEIGHTS): number {
  const idx = rating - 1;
  return Math.max(0.1, w[idx] ?? 1.0);
}

/**
 * Updated Difficulty D' after review with mean reversion
 */
export function calculateNextDifficulty(
  currentD: number,
  rating: FsrsRating,
  w: number[] = FSRS_CANONICAL_WEIGHTS,
): number {
  const initD3 = calculateInitialDifficulty(3, w);
  const rawD = currentD - w[6] * (rating - 3);
  const meanReverted = w[7] * initD3 + (1.0 - w[7]) * rawD;
  return Math.min(10.0, Math.max(1.0, meanReverted));
}

/**
 * Updated Stability on Successful Recall (Rating >= 2)
 */
export function calculateNextRecallStability(
  currentD: number,
  currentS: number,
  r: number,
  rating: FsrsRating,
  w: number[] = FSRS_CANONICAL_WEIGHTS,
): number {
  const h = rating === 2 ? w[15] : rating === 4 ? w[16] : 1.0;
  const s = Math.max(0.1, currentS);
  const d = Math.min(10.0, Math.max(1.0, currentD));
  const retrievability = Math.min(1.0, Math.max(0.001, r));

  const delta =
    Math.exp(w[8]) *
    (11.0 - d) *
    Math.pow(s, -w[9]) *
    (Math.exp(w[10] * (1.0 - retrievability)) - 1.0) *
    h;

  return Math.max(0.1, s * (1.0 + delta));
}

/**
 * Updated Stability on Forget / Lapse (Rating == 1: Again)
 */
export function calculateNextForgetStability(
  currentD: number,
  currentS: number,
  r: number,
  w: number[] = FSRS_CANONICAL_WEIGHTS,
): number {
  const s = Math.max(0.1, currentS);
  const d = Math.min(10.0, Math.max(1.0, currentD));
  const retrievability = Math.min(1.0, Math.max(0.001, r));

  const sf =
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1.0, w[13]) - 1.0) *
    Math.exp(w[14] * (1.0 - retrievability));

  return Math.max(0.1, Math.min(s, sf));
}

/**
 * Calculates the next interval in days to reach target retention
 */
export function calculateIntervalDays(
  stability: number,
  desiredRetention = 0.90,
  maxInterval = 36500,
): number {
  const s = Math.max(0.1, stability);
  const r = Math.min(0.99, Math.max(0.50, desiredRetention));
  const rawInterval = (s / 19.0) * (Math.pow(r, -2.0) - 1.0);
  const interval = Math.max(1, Math.round(rawInterval));
  return Math.min(maxInterval, interval);
}

export interface FsrsPrediction {
  rating: FsrsRating;
  nextStability: number;
  nextDifficulty: number;
  intervalDays: number;
  nextDueDate: number; // timestamp ms
  label: string;
}

/**
 * Previews all 4 possible review outcomes for UI buttons
 */
export function previewNextStates(
  currentS: number,
  currentD: number,
  elapsedDays: number,
  isNew: boolean,
  now = Date.now(),
  params = DEFAULT_FSRS_PARAMS,
): Record<FsrsRating, FsrsPrediction> {
  const currentR = isNew ? 1.0 : calculateRetrievability(elapsedDays, currentS);
  const ratings: FsrsRating[] = [1, 2, 3, 4];
  const result = {} as Record<FsrsRating, FsrsPrediction>;

  for (const rating of ratings) {
    let nextS: number;
    let nextD: number;

    if (isNew) {
      nextS = calculateInitialStability(rating, params.weights);
      nextD = calculateInitialDifficulty(rating, params.weights);
    } else {
      nextD = calculateNextDifficulty(currentD, rating, params.weights);
      if (rating === 1) {
        nextS = calculateNextForgetStability(currentD, currentS, currentR, params.weights);
      } else {
        nextS = calculateNextRecallStability(currentD, currentS, currentR, rating, params.weights);
      }
    }

    let intervalDays: number;
    let nextDueDate: number;
    let label: string;

    if (rating === 1) {
      intervalDays = 0;
      nextDueDate = now + 10 * 60 * 1000; // 10 minutes
      label = "10 min";
    } else {
      const scheduled = calculateIntervalDays(nextS, params.desiredRetention, params.maxIntervalDays);
      intervalDays = Math.max(1, scheduled);
      nextDueDate = now + intervalDays * 24 * 60 * 60 * 1000;
      label = intervalDays === 1 ? "1 día" : `${intervalDays} días`;
    }

    result[rating] = {
      rating,
      nextStability: nextS,
      nextDifficulty: nextD,
      intervalDays,
      nextDueDate,
      label,
    };
  }

  return result;
}

/**
 * Calculates Root Mean Square Error (RMSE) between predicted Retrievability
 * and observed recall events (1 = recalled, 0 = forgotten).
 */
export function calculateModelRmse(
  logs: Array<{ rating: FsrsRating; stabilityBefore: number; elapsedDays: number }>,
): number {
  if (logs.length === 0) return 0;
  let sumSquaredError = 0;
  for (const log of logs) {
    const predictedR = calculateRetrievability(log.elapsedDays, log.stabilityBefore);
    const actualOutcome = log.rating >= 2 ? 1.0 : 0.0;
    sumSquaredError += Math.pow(predictedR - actualOutcome, 2);
  }
  return Math.sqrt(sumSquaredError / logs.length);
}

/**
 * FSRS Leech Detection (Section 20-BIS)
 * A card that lapses repeatedly (default >= 6) indicates a structural defect
 * in the card or a deep conceptual misconception, not merely lack of memory repetition.
 */
export interface LeechInfo {
  isLeech: boolean;
  lapses: number;
  threshold: number;
  actionRecommendation: "split" | "audit" | "reword" | "suspend";
  message: string;
}

export function detectCardLeech(lapses: number, threshold = 6): LeechInfo {
  const isLeech = lapses >= threshold;
  if (!isLeech) {
    return {
      isLeech: false,
      lapses,
      threshold,
      actionRecommendation: "reword",
      message: "Tarjeta en ciclo de aprendizaje normal.",
    };
  }

  // Recommended pedagogical action depending on lapse severity
  let actionRecommendation: "split" | "audit" | "reword" | "suspend" = "split";
  if (lapses >= 10) {
    actionRecommendation = "suspend";
  } else if (lapses >= 8) {
    actionRecommendation = "audit";
  } else {
    actionRecommendation = "split";
  }

  return {
    isLeech,
    lapses,
    threshold,
    actionRecommendation,
    message: `Esta tarjeta te falló ${lapses} veces. Probablemente el problema sea la formulación de la tarjeta o una premisa conceptual, no tu memoria.`,
  };
}

