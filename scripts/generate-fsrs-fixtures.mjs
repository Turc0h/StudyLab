import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FSRS_CANONICAL_WEIGHTS,
  DEFAULT_FSRS_PARAMS,
  calculateRetrievability,
  calculateHalfLife,
  calculateInitialDifficulty,
  calculateInitialStability,
  calculateNextDifficulty,
  calculateNextRecallStability,
  calculateNextForgetStability,
  calculateIntervalDays,
  previewNextStates,
  calculateModelRmse,
  detectCardLeech,
} from "../src/features/fsrs/fsrsModel.ts";
import { calculateR, detectLeech } from "../src/features/fsrs/leechDetector.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const fixturesDir = path.join(root, "scripts", "fixtures");

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// B1 Requirement: Reference date injected as a fixed timestamp.
// NEVER use Date.now() or local timezone.
const REFERENCE_NOW = new Date("2026-09-24T12:00:00.000Z").getTime(); // 1727179200000
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

console.log("Generando fixtures oficiales de FSRS (B1) desde código TypeScript original...");
console.log(`Fecha de referencia: ${new Date(REFERENCE_NOW).toISOString()} (${REFERENCE_NOW})`);

// -----------------------------------------------------------------------------
// 1. Initial States (Ratings 1..4)
// -----------------------------------------------------------------------------
const initialStates = [1, 2, 3, 4].map((rating) => ({
  rating,
  initialStability: calculateInitialStability(rating),
  initialDifficulty: calculateInitialDifficulty(rating),
}));

// -----------------------------------------------------------------------------
// 2. Retrievability Edge Cases & calculateRetrievability vs calculateR
// -----------------------------------------------------------------------------
const testStabilities = [0.01, 0.05, 0.08, 0.1, 0.5, 1.0, 3.173, 15.69, 50.0];
const testElapsedDays = [0.0, 0.25, 0.5, 1.0, 2.0, 3.0, 7.0, 14.0, 30.0, 60.0];

const retrievabilityCases = [];
for (const s of testStabilities) {
  for (const t of testElapsedDays) {
    const fsrsRetrievability = calculateRetrievability(t, s);
    const leechR = calculateR(t, s);
    const halfLife = calculateHalfLife(s);
    retrievabilityCases.push({
      elapsedDays: t,
      stability: s,
      halfLife,
      fsrsRetrievability,
      leechR,
      divergence: Math.abs(fsrsRetrievability - leechR),
      hasStabilityFloorDivergence: s < 0.1,
    });
  }
}

// -----------------------------------------------------------------------------
// 3. Rounding & Interval Calculations (.5 edge cases)
// -----------------------------------------------------------------------------
// Formula: rawInterval = (s / 19.0) * (r^-2 - 1)
// With r = 0.90, factor is (0.9^-2 - 1) / 19.0 = (19/81) / 19 = 1 / 81.
// Values of s that produce near x.5 rawIntervals:
// s = 40.5 -> raw = 0.5
// s = 121.5 -> raw = 1.5
// s = 202.5 -> raw = 2.5
// Also testing s around thresholds (x.4999999 vs x.5000001)
const intervalStabilities = [
  0.1, 0.5, 1.0, 2.0, 3.173, 5.0, 10.0, 15.69, 20.0,
  40.4999, 40.5, 40.5001,
  81.0,
  121.4999, 121.5, 121.5001,
  202.5,
  300.0, 1000.0, 36500.0,
];
const desiredRetentions = [0.70, 0.80, 0.85, 0.90, 0.95, 0.97];

const intervalCases = [];
for (const s of intervalStabilities) {
  for (const r of desiredRetentions) {
    const sClamped = Math.max(0.1, s);
    const rClamped = Math.min(0.99, Math.max(0.50, r));
    const rawInterval = (sClamped / 19.0) * (Math.pow(rClamped, -2.0) - 1.0);
    const intervalDays = calculateIntervalDays(s, r);
    intervalCases.push({
      stability: s,
      desiredRetention: r,
      rawInterval,
      intervalDays,
      isHalfBoundary: Math.abs((rawInterval % 1) - 0.5) < 0.001,
    });
  }
}

// -----------------------------------------------------------------------------
// 4. Preview Next States Scenarios
// -----------------------------------------------------------------------------
const previewScenarios = [
  {
    name: "new_card_default",
    currentS: 0.1,
    currentD: 5.0,
    elapsedDays: 0,
    isNew: true,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "first_review_good",
    currentS: 3.173,
    currentD: 5.2825,
    elapsedDays: 1,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "review_after_10_days",
    currentS: 15.69,
    currentD: 4.5,
    elapsedDays: 10,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "severe_lapse_card",
    currentS: 0.8,
    currentD: 8.5,
    elapsedDays: 2,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "same_day_review_elapsed_zero",
    currentS: 4.2,
    currentD: 5.0,
    elapsedDays: 0,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "high_retention_target_097",
    currentS: 12.0,
    currentD: 4.0,
    elapsedDays: 5,
    isNew: false,
    now: REFERENCE_NOW,
    params: {
      ...DEFAULT_FSRS_PARAMS,
      desiredRetention: 0.97,
    },
  },
  {
    name: "low_retention_target_070",
    currentS: 12.0,
    currentD: 4.0,
    elapsedDays: 5,
    isNew: false,
    now: REFERENCE_NOW,
    params: {
      ...DEFAULT_FSRS_PARAMS,
      desiredRetention: 0.70,
    },
  },
  {
    name: "difficulty_boundary_max",
    currentS: 1.0,
    currentD: 10.0,
    elapsedDays: 3,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
  {
    name: "difficulty_boundary_min",
    currentS: 25.0,
    currentD: 1.0,
    elapsedDays: 7,
    isNew: false,
    now: REFERENCE_NOW,
    params: DEFAULT_FSRS_PARAMS,
  },
];

const previewCases = previewScenarios.map((scenario) => {
  const result = previewNextStates(
    scenario.currentS,
    scenario.currentD,
    scenario.elapsedDays,
    scenario.isNew,
    scenario.now,
    scenario.params,
  );
  return {
    scenario: scenario.name,
    input: {
      currentS: scenario.currentS,
      currentD: scenario.currentD,
      elapsedDays: scenario.elapsedDays,
      isNew: scenario.isNew,
      now: scenario.now,
      desiredRetention: scenario.params.desiredRetention,
      maxIntervalDays: scenario.params.maxIntervalDays,
    },
    expected: result,
  };
});

// -----------------------------------------------------------------------------
// 5. Long Sequential Reviews (5 Cards x 22 Reviews each = 110 reviews)
// -----------------------------------------------------------------------------
function simulateCardHistory(cardId, ratingsPattern, initialNow = REFERENCE_NOW) {
  let now = initialNow;
  let currentCard = {
    id: cardId,
    state: "new",
    stability: 0.1,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: now,
  };

  const steps = [];

  for (let i = 0; i < ratingsPattern.length; i++) {
    const rating = ratingsPattern[i];
    const isNew = currentCard.state === "new" || currentCard.lastReview === null;
    const elapsedDays = isNew ? 0 : Math.max(0, (now - currentCard.lastReview) / ONE_DAY_MS);
    const r = isNew ? 1.0 : calculateRetrievability(elapsedDays, currentCard.stability);

    let nextS;
    let nextD;
    let nextState;

    if (isNew) {
      nextS = calculateInitialStability(rating);
      nextD = calculateInitialDifficulty(rating);
      nextState = rating === 1 ? "learning" : "review";
    } else {
      nextD = calculateNextDifficulty(currentCard.difficulty, rating);
      if (rating === 1) {
        nextS = calculateNextForgetStability(currentCard.difficulty, currentCard.stability, r);
        nextState = "relearning";
      } else {
        nextS = calculateNextRecallStability(currentCard.difficulty, currentCard.stability, r, rating);
        nextState = "review";
      }
    }

    let scheduledDays;
    let nextDueDate;

    if (rating === 1) {
      scheduledDays = 0;
      nextDueDate = now + 10 * 60 * 1000;
    } else {
      scheduledDays = calculateIntervalDays(nextS, DEFAULT_FSRS_PARAMS.desiredRetention);
      nextDueDate = now + scheduledDays * ONE_DAY_MS;
    }

    const stateBefore = currentCard.state;
    const stabilityBefore = currentCard.stability;
    const difficultyBefore = currentCard.difficulty;

    currentCard = {
      ...currentCard,
      state: nextState,
      stability: nextS,
      difficulty: nextD,
      reps: currentCard.reps + 1,
      lapses: rating === 1 ? currentCard.lapses + 1 : currentCard.lapses,
      lastReview: now,
      dueDate: nextDueDate,
      halfLife: calculateHalfLife(nextS),
    };

    steps.push({
      step: i + 1,
      rating,
      elapsedDays,
      currentR: r,
      stateBefore,
      stateAfter: nextState,
      stabilityBefore,
      stabilityAfter: nextS,
      difficultyBefore,
      difficultyAfter: nextD,
      repsAfter: currentCard.reps,
      lapsesAfter: currentCard.lapses,
      scheduledDays,
      reviewTimestamp: now,
      nextDueDate,
    });

    // Advance simulated time to next due date (or at least 1 day for non-lapses, 10 min for lapses)
    if (rating === 1) {
      now += 10 * 60 * 1000;
    } else {
      now += scheduledDays * ONE_DAY_MS;
    }
  }

  return {
    cardId,
    totalReviews: ratingsPattern.length,
    finalCard: currentCard,
    steps,
  };
}

const longSequences = [
  // Card 1: Consistent "Good" (3) reviews
  simulateCardHistory("card_1_all_good", [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
  // Card 2: Alternating "Hard" (2) and "Good" (3)
  simulateCardHistory("card_2_alternating", [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2]),
  // Card 3: Early lapse, then recovery ("Again" 1, then "Good" 3, "Easy" 4...)
  simulateCardHistory("card_3_early_lapse", [1, 3, 3, 1, 3, 4, 3, 4, 3, 4, 1, 3, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4]),
  // Card 4: Frequent lapses (card becomes a leech)
  simulateCardHistory("card_4_frequent_lapses", [1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1]),
  // Card 5: High performance ("Easy" 4 all the way)
  simulateCardHistory("card_5_all_easy", [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
];

// -----------------------------------------------------------------------------
// 6. Leech Detection Cases (Lapses 0..12)
// -----------------------------------------------------------------------------
const leechCases = [];
for (let lapses = 0; lapses <= 12; lapses++) {
  const resultModel = detectCardLeech(lapses, 6);
  const isLeechSimple = detectLeech(lapses, 6);
  leechCases.push({
    lapses,
    threshold: 6,
    isLeechSimple,
    ...resultModel,
  });
}

// -----------------------------------------------------------------------------
// 7. Model RMSE Cases
// -----------------------------------------------------------------------------
const sampleLogsBatch1 = [
  { rating: 3, stabilityBefore: 3.17, elapsedDays: 1.0 },
  { rating: 3, stabilityBefore: 4.5, elapsedDays: 2.0 },
  { rating: 1, stabilityBefore: 5.0, elapsedDays: 10.0 },
  { rating: 4, stabilityBefore: 12.0, elapsedDays: 3.0 },
  { rating: 2, stabilityBefore: 2.0, elapsedDays: 1.5 },
];

const sampleLogsBatch2 = [
  ...sampleLogsBatch1,
  { rating: 1, stabilityBefore: 1.0, elapsedDays: 5.0 },
  { rating: 3, stabilityBefore: 8.0, elapsedDays: 8.0 },
  { rating: 3, stabilityBefore: 15.0, elapsedDays: 12.0 },
  { rating: 4, stabilityBefore: 20.0, elapsedDays: 14.0 },
  { rating: 1, stabilityBefore: 3.0, elapsedDays: 4.0 },
];

const rmseCases = [
  {
    name: "empty_logs",
    logs: [],
    expectedRmse: calculateModelRmse([]),
  },
  {
    name: "batch_5_logs",
    logs: sampleLogsBatch1,
    expectedRmse: calculateModelRmse(sampleLogsBatch1),
  },
  {
    name: "batch_10_logs",
    logs: sampleLogsBatch2,
    expectedRmse: calculateModelRmse(sampleLogsBatch2),
  },
];

// -----------------------------------------------------------------------------
// 8. Pure Load Balancer Scenarios (Deterministic transformations)
// -----------------------------------------------------------------------------
// Algorithms matching loadBalancer.ts deterministic logic
const loadBalancerScenarios = {
  // Scenario A: Postpone reviews (due <= now)
  postpone: {
    days: 3,
    maxCards: 4,
    now: REFERENCE_NOW,
    cards: [
      { id: "c1", dueDate: REFERENCE_NOW - 2 * ONE_DAY_MS },
      { id: "c2", dueDate: REFERENCE_NOW - 1 * ONE_DAY_MS },
      { id: "c3", dueDate: REFERENCE_NOW },
      { id: "c4", dueDate: REFERENCE_NOW + 1 * ONE_DAY_MS }, // Future: not postponed
      { id: "c5", dueDate: REFERENCE_NOW - 5 * ONE_HOUR_MS },
      { id: "c6", dueDate: REFERENCE_NOW - 12 * ONE_HOUR_MS },
    ],
    // Deterministic base shift without jitter: now + days * ONE_DAY_MS
    expectedShiftBaseMs: 3 * ONE_DAY_MS,
    expectedCandidateIds: ["c1", "c2", "c3", "c5"], // First 4 due <= now
  },

  // Scenario B: Advance reviews (now < dueDate <= now + daysAhead * ONE_DAY_MS)
  advance: {
    daysAhead: 2,
    maxCards: 3,
    now: REFERENCE_NOW,
    cards: [
      { id: "c10", dueDate: REFERENCE_NOW - 1000 }, // Past: not eligible for advance
      { id: "c11", dueDate: REFERENCE_NOW + 12 * ONE_HOUR_MS }, // Eligible
      { id: "c12", dueDate: REFERENCE_NOW + 24 * ONE_HOUR_MS }, // Eligible
      { id: "c13", dueDate: REFERENCE_NOW + 36 * ONE_HOUR_MS }, // Eligible
      { id: "c14", dueDate: REFERENCE_NOW + 72 * ONE_HOUR_MS }, // 3 days: outside window
    ],
    expectedCandidateIds: ["c11", "c12", "c13"],
    expectedNewDueDate: REFERENCE_NOW - 60000,
  },

  // Scenario C: Load Balancing distribution across buckets
  balanceBuckets: {
    windowDays: 7,
    targetMaxPerDay: 2,
    now: REFERENCE_NOW,
    // Cards distributed into day buckets:
    // Day 0: 4 cards (excess: 2)
    // Day 1: 1 card
    // Day 2: 0 cards
    // Day 3: 3 cards (excess: 1)
    // Day 4: 0 cards
    // Day 5: 0 cards
    // Day 6: 0 cards
    cards: [
      { id: "b0_1", dueDate: REFERENCE_NOW + 2 * ONE_HOUR_MS },
      { id: "b0_2", dueDate: REFERENCE_NOW + 4 * ONE_HOUR_MS },
      { id: "b0_3", dueDate: REFERENCE_NOW + 6 * ONE_HOUR_MS },
      { id: "b0_4", dueDate: REFERENCE_NOW + 8 * ONE_HOUR_MS },
      { id: "b1_1", dueDate: REFERENCE_NOW + 26 * ONE_HOUR_MS },
      { id: "b3_1", dueDate: REFERENCE_NOW + 74 * ONE_HOUR_MS },
      { id: "b3_2", dueDate: REFERENCE_NOW + 76 * ONE_HOUR_MS },
      { id: "b3_3", dueDate: REFERENCE_NOW + 78 * ONE_HOUR_MS },
    ],
  },

  // Scenario D: Disperse Siblings
  disperseSiblings: {
    now: REFERENCE_NOW,
    cards: [
      // Concept A: 3 sibling cards due in same 18h window
      { id: "sib_a1", conceptId: "concept_A", dueDate: REFERENCE_NOW + 2 * ONE_HOUR_MS },
      { id: "sib_a2", conceptId: "concept_A", dueDate: REFERENCE_NOW + 5 * ONE_HOUR_MS },
      { id: "sib_a3", conceptId: "concept_A", dueDate: REFERENCE_NOW + 9 * ONE_HOUR_MS },
      // Concept B: 2 sibling cards separated by 48 hours (no dispersion needed)
      { id: "sib_b1", conceptId: "concept_B", dueDate: REFERENCE_NOW + 10 * ONE_HOUR_MS },
      { id: "sib_b2", conceptId: "concept_B", dueDate: REFERENCE_NOW + 60 * ONE_HOUR_MS },
      // Concept C: Single card (no dispersion)
      { id: "sib_c1", conceptId: "concept_C", dueDate: REFERENCE_NOW + 4 * ONE_HOUR_MS },
    ],
    // Expected dispersion:
    // sib_a2 is index 1 -> offset is (1 % 2 === 0 ? 1 : 2) * dayMs = 2 days
    // sib_a2 due date is updated to now + 53h.
    // For sib_a3 (index 2), diff with previous (sib_a2 at 53h) is |9h - 53h| = 44h > 18h, so it is not shifted.
    expectedDispersedIds: ["sib_a2"],
  },
};

// -----------------------------------------------------------------------------
// Assembly and Output
// -----------------------------------------------------------------------------
const goldenFixtures = {
  metadata: {
    generator: "scripts/generate-fsrs-fixtures.mjs",
    generatedAt: new Date(REFERENCE_NOW).toISOString(),
    referenceNow: REFERENCE_NOW,
    fsrsCanonicalWeights: FSRS_CANONICAL_WEIGHTS,
    fsrsDecayFactorCurrent: 19.0,
    fsrsDecayFactorCanonical: 19.0 / 81.0,
    totalInitialCases: initialStates.length,
    totalRetrievabilityCases: retrievabilityCases.length,
    totalIntervalCases: intervalCases.length,
    totalPreviewScenarios: previewCases.length,
    totalLongSequences: longSequences.length,
    totalLeechCases: leechCases.length,
  },
  initialStates,
  retrievabilityCases,
  intervalCases,
  previewCases,
  longSequences,
  leechCases,
  rmseCases,
  loadBalancerScenarios,
};

const outputPath = path.join(fixturesDir, "fsrs-golden.json");
fs.writeFileSync(outputPath, JSON.stringify(goldenFixtures, null, 2), "utf-8");

console.log(`Fixtures generadas con éxito en: ${outputPath}`);
console.log(`Tamaño del archivo: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log("Resumen de casos incluidos:");
console.log(`- Estados iniciales: ${initialStates.length}`);
console.log(`- Casos de Retrievability (con divergenica s=0.05): ${retrievabilityCases.length}`);
console.log(`- Casos de Intervalo (con borde .5): ${intervalCases.length}`);
console.log(`- Previews de 4 ratings: ${previewCases.length}`);
console.log(`- Secuencias largas (5 tarjetas x 22 reviews): ${longSequences.length}`);
console.log(`- Casos de Leech: ${leechCases.length}`);
console.log(`- Casos de RMSE: ${rmseCases.length}`);
console.log(`- Escenarios de Load Balancer: 4`);
