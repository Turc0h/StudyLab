import { db, type CardFsrsRecord, type ReviewLogRecord, type FlashcardRecord } from "../../db/db";
import {
  calculateHalfLife,
  calculateInitialDifficulty,
  calculateInitialStability,
  calculateIntervalDays,
  calculateNextDifficulty,
  calculateNextForgetStability,
  calculateNextRecallStability,
  calculateRetrievability,
  DEFAULT_FSRS_PARAMS,
  type FsrsRating,
} from "./fsrsModel";

export interface ReviewResult {
  updatedCard: CardFsrsRecord;
  reviewLog: ReviewLogRecord;
}

/**
 * Executes a single FSRS review, records detailed millisecond telemetry,
 * and updates card stability, difficulty, state, and due date.
 */
export async function executeFsrsReview(
  cardId: string,
  rating: FsrsRating,
  latencyMs: number,
  now = Date.now(),
): Promise<ReviewResult> {
  const card = await db.cardsFsrs.get(cardId);
  if (!card) {
    throw new Error(`Card not found with id: ${cardId}`);
  }

  const isNew = card.state === "new" || card.lastReview === null;
  const elapsedDays = isNew ? 0 : Math.max(0, (now - card.lastReview!) / (24 * 60 * 60 * 1000));
  const r = isNew ? 1.0 : calculateRetrievability(elapsedDays, card.stability);

  let nextS: number;
  let nextD: number;
  let nextState: CardFsrsRecord["state"];

  if (isNew) {
    nextS = calculateInitialStability(rating);
    nextD = calculateInitialDifficulty(rating);
    nextState = rating === 1 ? "learning" : "review";
  } else {
    nextD = calculateNextDifficulty(card.difficulty, rating);
    if (rating === 1) {
      nextS = calculateNextForgetStability(card.difficulty, card.stability, r);
      nextState = "relearning";
    } else {
      nextS = calculateNextRecallStability(card.difficulty, card.stability, r, rating);
      nextState = "review";
    }
  }

  let scheduledDays: number;
  let nextDueDate: number;

  if (rating === 1) {
    scheduledDays = 0;
    nextDueDate = now + 10 * 60 * 1000; // 10 min
  } else {
    scheduledDays = calculateIntervalDays(nextS, DEFAULT_FSRS_PARAMS.desiredRetention);
    nextDueDate = now + scheduledDays * 24 * 60 * 60 * 1000;
  }

  const updatedCard: CardFsrsRecord = {
    ...card,
    state: nextState,
    stability: nextS,
    difficulty: nextD,
    reps: card.reps + 1,
    lapses: rating === 1 ? card.lapses + 1 : card.lapses,
    lastReview: now,
    dueDate: nextDueDate,
    halfLife: calculateHalfLife(nextS),
  };

  const reviewLog: ReviewLogRecord = {
    id: crypto.randomUUID(),
    cardId: card.id,
    rating,
    reviewTimestamp: now,
    latencyMs,
    stateBefore: card.state,
    stateAfter: nextState,
    stabilityBefore: card.stability,
    stabilityAfter: nextS,
    difficultyBefore: card.difficulty,
    difficultyAfter: nextD,
    scheduledDays,
  };

  await db.transaction("rw", [db.cardsFsrs, db.reviewLogs], async () => {
    await db.cardsFsrs.put(updatedCard);
    await db.reviewLogs.add(reviewLog);
  });

  return { updatedCard, reviewLog };
}

/**
 * Creates a new FSRS card from scratch.
 */
export async function createFsrsCard(params: {
  deckId: string;
  conceptId?: string | null;
  front: string;
  back: string;
}): Promise<CardFsrsRecord> {
  const now = Date.now();
  const card: CardFsrsRecord = {
    id: crypto.randomUUID(),
    deckId: params.deckId,
    conceptId: params.conceptId ?? null,
    front: params.front.trim(),
    back: params.back.trim(),
    state: "new",
    stability: 0.1,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: now,
    halfLife: calculateHalfLife(0.1),
    createdAt: now,
  };

  await db.cardsFsrs.add(card);
  return card;
}

/**
 * Migrates existing Leitner flashcards into the FSRS format seamlessly.
 */
export async function migrateLeitnerToFsrs(deckId?: string): Promise<number> {
  let existingFlashcards: FlashcardRecord[];
  if (deckId) {
    existingFlashcards = await db.flashcards.where("deckId").equals(deckId).toArray();
  } else {
    existingFlashcards = await db.flashcards.toArray();
  }

  const existingFsrsCards = await db.cardsFsrs.toArray();
  const existingFsrsFrontBack = new Set(existingFsrsCards.map((c) => `${c.deckId}:::${c.front}`));

  const newCards: CardFsrsRecord[] = [];

  for (const card of existingFlashcards) {
    const key = `${card.deckId}:::${card.front}`;
    if (existingFsrsFrontBack.has(key)) continue;

    // Estimate initial stability from Leitner box:
    // Box 1 -> 1d, Box 2 -> 3d, Box 3 -> 7d, Box 4 -> 16d, Box 5 -> 35d
    const boxStabilities = [1.0, 3.0, 7.0, 16.0, 35.0];
    const initialStability = boxStabilities[card.box - 1] ?? 1.0;

    newCards.push({
      id: card.id,
      deckId: card.deckId,
      conceptId: null,
      front: card.front,
      back: card.back,
      state: card.box === 1 ? "learning" : "review",
      stability: initialStability,
      difficulty: 5.0,
      reps: card.box,
      lapses: 0,
      lastReview: card.createdAt,
      dueDate: card.dueDate,
      halfLife: calculateHalfLife(initialStability),
      createdAt: card.createdAt,
    });
  }

  if (newCards.length > 0) {
    await db.cardsFsrs.bulkPut(newCards);
  }

  return newCards.length;
}

/**
 * Computes average Knowledge Half-Life (in days) across all or filtered cards.
 */
export function calculateAverageHalfLife(cards: CardFsrsRecord[]): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + (c.halfLife || calculateHalfLife(c.stability)), 0);
  return Number((sum / cards.length).toFixed(2));
}

/**
 * Calculates the Illusion of Competence Index (ICI) in range 0% - 100%.
 *
 * Evaluates the divergence between subjective self-rating confidence
 * (e.g. rating "Easy" 4 with rapid responses) and subsequent lapse rate or high latency variance.
 */
export function calculateIllusionOfCompetenceIndex(logs: ReviewLogRecord[]): {
  indexPct: number;
  level: "optimal" | "moderate" | "high";
  confidenceAvg: number;
  lapseRatePct: number;
} {
  if (logs.length < 5) {
    return {
      indexPct: 0,
      level: "optimal",
      confidenceAvg: 0,
      lapseRatePct: 0,
    };
  }

  // Analyze the last 50 reviews
  const recentLogs = logs.slice(-50);
  let totalRatingScore = 0; // 1..4 -> normalized 0.25..1.0
  let totalLapses = 0;
  let fastOverconfidenceCount = 0;

  for (const log of recentLogs) {
    const normalizedRating = log.rating / 4.0;
    totalRatingScore += normalizedRating;

    if (log.rating === 1) {
      totalLapses++;
    }

    // A review marked "Easy" (4) under 1000ms but preceding a lapse or in unstable card (< 2 days stability)
    if (log.rating === 4 && log.latencyMs < 1200 && log.stabilityBefore < 3.0) {
      fastOverconfidenceCount++;
    }
  }

  const confidenceAvg = totalRatingScore / recentLogs.length; // 0..1
  const lapseRate = totalLapses / recentLogs.length; // 0..1
  const fastOverconfidenceRate = fastOverconfidenceCount / recentLogs.length;

  // ICI formula: High confidence + high lapse rate + high superficial fast overconfidence
  // Weighted composite score:
  const rawIci = (confidenceAvg * 0.4 + lapseRate * 0.4 + fastOverconfidenceRate * 0.2) * 100;
  const indexPct = Math.min(100, Math.max(0, Math.round(rawIci)));

  let level: "optimal" | "moderate" | "high" = "optimal";
  if (indexPct > 65) level = "high";
  else if (indexPct > 35) level = "moderate";

  return {
    indexPct,
    level,
    confidenceAvg: Number((confidenceAvg * 100).toFixed(1)),
    lapseRatePct: Number((lapseRate * 100).toFixed(1)),
  };
}
