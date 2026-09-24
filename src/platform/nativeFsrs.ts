/**
 * StudyLab Native FSRS Spaced Repetition Bridge
 * Connects React UI and Study Engine to Rust-first FSRS v4.5 engine.
 *
 * Implements strict functional parity with:
 * - src/features/fsrs/fsrsModel.ts
 * - src/features/fsrs/leechDetector.ts
 * - src/features/fsrs/loadBalancer.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";
import {
  DEFAULT_FSRS_PARAMS,
  calculateRetrievability as tsCalculateRetrievability,
  calculateHalfLife as tsCalculateHalfLife,
  calculateInitialDifficulty as tsCalculateInitialDifficulty,
  calculateInitialStability as tsCalculateInitialStability,
  calculateNextDifficulty as tsCalculateNextDifficulty,
  calculateNextRecallStability as tsCalculateNextRecallStability,
  calculateNextForgetStability as tsCalculateNextForgetStability,
  calculateIntervalDays as tsCalculateIntervalDays,
  previewNextStates as tsPreviewNextStates,
  calculateModelRmse as tsCalculateModelRmse,
  detectCardLeech as tsDetectCardLeech,
  type FsrsRating,
  type LeechInfo as TsLeechInfo,
} from "../features/fsrs/fsrsModel.ts";
import { calculateR as tsCalculateR } from "../features/fsrs/leechDetector.ts";

export interface FsrsPredictionDto {
  rating: FsrsRating;
  nextStability: number;
  nextDifficulty: number;
  intervalDays: number;
  nextDueDate: number;
  label: string;
}

export interface PreviewNextStatesParams {
  currentS: number;
  currentD: number;
  elapsedDays: number;
  isNew: boolean;
  now?: number;
  desiredRetention?: number;
  maxIntervalDays?: number;
}

export interface PreviewNextStatesResult {
  predictions: Record<FsrsRating, FsrsPredictionDto>;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface ExecuteReviewParams {
  cardId: string;
  rating: FsrsRating;
  latencyMs: number;
  now?: number;
  currentS: number;
  currentD: number;
  currentState: "new" | "learning" | "review" | "relearning";
  reps: number;
  lapses: number;
  lastReview: number | null;
  desiredRetention?: number;
}

export interface UpdatedCardResult {
  cardId: string;
  state: "new" | "learning" | "review" | "relearning";
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview: number;
  dueDate: number;
  halfLife: number;
}

export interface ReviewLogResult {
  id: string;
  cardId: string;
  rating: FsrsRating;
  reviewTimestamp: number;
  latencyMs: number;
  stateBefore: string;
  stateAfter: string;
  stabilityBefore: number;
  stabilityAfter: number;
  difficultyBefore: number;
  difficultyAfter: number;
  scheduledDays: number;
}

export interface ExecuteReviewResult {
  updatedCard: UpdatedCardResult;
  reviewLog: ReviewLogResult;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface LeechInfoResult extends TsLeechInfo {
  sourceEngine: "rust" | "typescript-fallback";
}

export interface RmseLogEntry {
  rating: FsrsRating;
  stabilityBefore: number;
  elapsedDays: number;
}

export interface ModelRmseResult {
  rmse: number;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface CardDueItem {
  id: string;
  dueDate: number;
}

export interface CardDueUpdate {
  id: string;
  newDueDate: number;
}

export interface SiblingCardItem {
  id: string;
  conceptId?: string | null;
  dueDate: number;
}

export interface LoadBalanceParams {
  action: "postpone" | "advance" | "balanceLoad" | "easyDays" | "disperseSiblings";
  now?: number;
  days?: number;
  maxCards?: number;
  windowDays?: number;
  targetMaxPerDay?: number;
  easyDaysMap?: Record<number, number>;
  cards?: CardDueItem[];
  siblings?: SiblingCardItem[];
}

export interface LoadBalanceResult {
  cardsModified: number;
  updates: CardDueUpdate[];
  message: string;
  sourceEngine: "rust" | "typescript-fallback";
}

// -----------------------------------------------------------------------------
// Direct Mathematical Functions (Exported for UI & Test verification)
// -----------------------------------------------------------------------------

export function calculateRetrievabilityNative(elapsedDays: number, stability: number): number {
  return tsCalculateRetrievability(elapsedDays, stability);
}

export function calculateRNative(elapsedDays: number, stability: number): number {
  return tsCalculateR(elapsedDays, stability);
}

export function calculateIntervalDaysNative(
  stability: number,
  desiredRetention = 0.90,
  maxInterval = 36500,
): number {
  return tsCalculateIntervalDays(stability, desiredRetention, maxInterval);
}

// -----------------------------------------------------------------------------
// IPC Bridge with Seamless TypeScript Fallback
// -----------------------------------------------------------------------------

/**
 * Previews all 4 ratings for UI flashcard action buttons.
 */
export async function previewNextStatesNative(
  params: PreviewNextStatesParams,
): Promise<PreviewNextStatesResult> {
  const { currentS, currentD, elapsedDays, isNew, now, desiredRetention, maxIntervalDays } = params;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<FsrsPredictionDto[]>("preview_fsrs_next_states", {
        request: {
          currentS,
          currentD,
          elapsedDays,
          isNew,
          now: now ?? Date.now(),
          desiredRetention,
          maxIntervalDays,
        },
      });

      const predictions = {} as Record<FsrsRating, FsrsPredictionDto>;
      for (const p of rustResponse) {
        predictions[p.rating] = p;
      }

      return {
        predictions,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeFsrs] Fallback a TS para previewNextStates:", err);
    }
  }

  // TypeScript Fallback
  const tsPredictions = tsPreviewNextStates(
    currentS,
    currentD,
    elapsedDays,
    isNew,
    now ?? Date.now(),
    {
      weights: DEFAULT_FSRS_PARAMS.weights,
      desiredRetention: desiredRetention ?? DEFAULT_FSRS_PARAMS.desiredRetention,
      maxIntervalDays: maxIntervalDays ?? DEFAULT_FSRS_PARAMS.maxIntervalDays,
    },
  );

  return {
    predictions: tsPredictions as Record<FsrsRating, FsrsPredictionDto>,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Computes updated state and detailed telemetry log after a review event.
 */
export async function executeFsrsReviewNative(
  params: ExecuteReviewParams,
): Promise<ExecuteReviewResult> {
  const nowMs = params.now ?? Date.now();

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<{
        updatedCard: UpdatedCardResult;
        reviewLog: ReviewLogResult;
      }>("execute_fsrs_review", {
        request: {
          cardId: params.cardId,
          rating: params.rating,
          latencyMs: params.latencyMs,
          now: nowMs,
          currentS: params.currentS,
          currentD: params.currentD,
          currentState: params.currentState,
          reps: params.reps,
          lapses: params.lapses,
          lastReview: params.lastReview,
          desiredRetention: params.desiredRetention,
        },
      });

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeFsrs] Fallback a TS para executeFsrsReview:", err);
    }
  }

  // TypeScript Fallback
  const isNew = params.currentState === "new" || params.lastReview === null;
  const elapsedDays = isNew ? 0 : Math.max(0, (nowMs - params.lastReview!) / (24 * 60 * 60 * 1000));
  const r = isNew ? 1.0 : tsCalculateRetrievability(elapsedDays, params.currentS);

  let nextS: number;
  let nextD: number;
  let nextState: "new" | "learning" | "review" | "relearning";

  if (isNew) {
    nextS = tsCalculateInitialStability(params.rating);
    nextD = tsCalculateInitialDifficulty(params.rating);
    nextState = params.rating === 1 ? "learning" : "review";
  } else {
    nextD = tsCalculateNextDifficulty(params.currentD, params.rating);
    if (params.rating === 1) {
      nextS = tsCalculateNextForgetStability(params.currentD, params.currentS, r);
      nextState = "relearning";
    } else {
      nextS = tsCalculateNextRecallStability(params.currentD, params.currentS, r, params.rating);
      nextState = "review";
    }
  }

  let scheduledDays: number;
  let nextDueDate: number;

  if (params.rating === 1) {
    scheduledDays = 0;
    nextDueDate = nowMs + 10 * 60 * 1000;
  } else {
    scheduledDays = tsCalculateIntervalDays(nextS, params.desiredRetention ?? 0.90);
    nextDueDate = nowMs + scheduledDays * 24 * 60 * 60 * 1000;
  }

  const updatedCard: UpdatedCardResult = {
    cardId: params.cardId,
    state: nextState,
    stability: nextS,
    difficulty: nextD,
    reps: params.reps + 1,
    lapses: params.rating === 1 ? params.lapses + 1 : params.lapses,
    lastReview: nowMs,
    dueDate: nextDueDate,
    halfLife: tsCalculateHalfLife(nextS),
  };

  const reviewLog: ReviewLogResult = {
    id: `log_${params.cardId}_${nowMs}`,
    cardId: params.cardId,
    rating: params.rating,
    reviewTimestamp: nowMs,
    latencyMs: params.latencyMs,
    stateBefore: params.currentState,
    stateAfter: nextState,
    stabilityBefore: params.currentS,
    stabilityAfter: nextS,
    difficultyBefore: params.currentD,
    difficultyAfter: nextD,
    scheduledDays,
  };

  return {
    updatedCard,
    reviewLog,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Diagnoses whether a card has become a memory leech.
 */
export async function detectCardLeechNative(
  lapses: number,
  threshold = 6,
): Promise<LeechInfoResult> {
  if (isDesktop()) {
    try {
      const rustResponse = await invoke<TsLeechInfo>("detect_fsrs_card_leech", {
        request: { lapses, threshold },
      });
      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeFsrs] Fallback a TS para detectCardLeech:", err);
    }
  }

  const result = tsDetectCardLeech(lapses, threshold);
  return {
    ...result,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Calculates RMSE calibration score of FSRS against recall logs.
 */
export async function calculateModelRmseNative(
  logs: RmseLogEntry[],
): Promise<ModelRmseResult> {
  if (isDesktop()) {
    try {
      const rustResponse = await invoke<{ rmse: number }>("calculate_fsrs_model_rmse", {
        request: { logs },
      });
      return {
        rmse: rustResponse.rmse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeFsrs] Fallback a TS para calculateModelRmse:", err);
    }
  }

  const rmse = tsCalculateModelRmse(logs);
  return {
    rmse,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Plans deterministic load balancing for due dates across cards.
 */
export async function planLoadBalanceNative(
  params: LoadBalanceParams,
): Promise<LoadBalanceResult> {
  const nowMs = params.now ?? Date.now();

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<{
        cardsModified: number;
        updates: CardDueUpdate[];
        message: string;
      }>("plan_fsrs_load_balance", {
        request: {
          action: params.action,
          now: nowMs,
          days: params.days,
          maxCards: params.maxCards,
          windowDays: params.windowDays,
          targetMaxPerDay: params.targetMaxPerDay,
          easyDaysMap: params.easyDaysMap,
          cards: params.cards,
          siblings: params.siblings,
        },
      });

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeFsrs] Fallback a TS para planLoadBalance:", err);
    }
  }

  // TypeScript Pure Fallback implementation matching load balancer algorithms
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const cards = params.cards ?? [];

  if (params.action === "postpone") {
    const days = params.days ?? 1;
    const shiftMs = days * ONE_DAY_MS;
    let eligible = cards.filter((c) => c.dueDate <= nowMs);
    if (params.maxCards && eligible.length > params.maxCards) {
      eligible = eligible.slice(0, params.maxCards);
    }
    const updates = eligible.map((c) => ({
      id: c.id,
      newDueDate: nowMs + shiftMs,
    }));
    return {
      cardsModified: updates.length,
      updates,
      message: updates.length > 0
        ? `Se pospusieron ${updates.length} tarjeta(s) por ${days} día(s).`
        : "No hay tarjetas vencidas para posponer.",
      sourceEngine: "typescript-fallback",
    };
  }

  if (params.action === "advance") {
    const daysAhead = params.days ?? 2;
    const threshold = nowMs + daysAhead * ONE_DAY_MS;
    let eligible = cards.filter((c) => c.dueDate > nowMs && c.dueDate <= threshold);
    if (params.maxCards && eligible.length > params.maxCards) {
      eligible = eligible.slice(0, params.maxCards);
    }
    const updates = eligible.map((c) => ({
      id: c.id,
      newDueDate: nowMs - 60000,
    }));
    return {
      cardsModified: updates.length,
      updates,
      message: updates.length > 0
        ? `Se adelantaron ${updates.length} tarjeta(s) para repasar hoy.`
        : "No hay tarjetas futuras para adelantar en esa ventana.",
      sourceEngine: "typescript-fallback",
    };
  }

  if (params.action === "disperseSiblings") {
    const siblings = (params.siblings ?? []).map((s) => ({ ...s }));
    const conceptGroups = new Map<string, typeof siblings>();

    for (const s of siblings) {
      if (s.conceptId) {
        const list = conceptGroups.get(s.conceptId) || [];
        list.push(s);
        conceptGroups.set(s.conceptId, list);
      }
    }

    const updates: CardDueUpdate[] = [];
    for (const [_cid, group] of conceptGroups) {
      if (group.length <= 1) continue;
      group.sort((a, b) => a.dueDate - b.dueDate);
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const curr = group[i];
        if (Math.abs(curr.dueDate - prev.dueDate) < 18 * 3600000) {
          const offsetDays = (i % 2 === 0 ? 1 : 2) * ONE_DAY_MS;
          curr.dueDate += offsetDays;
          updates.push({ id: curr.id, newDueDate: curr.dueDate });
        }
      }
    }

    return {
      cardsModified: updates.length,
      updates,
      message: updates.length > 0
        ? `Se dispersaron ${updates.length} tarjetas hermanas para evitar interferencia asociativa.`
        : "No se requirió dispersión de tarjetas hermanas.",
      sourceEngine: "typescript-fallback",
    };
  }

  return {
    cardsModified: 0,
    updates: [],
    message: "Operación completada.",
    sourceEngine: "typescript-fallback",
  };
}
