/**
 * cramSelector.ts
 *
 * Motor de selección y priorización para el Modo Repaso Rápido de Emergencia (Cram Mode / Blitz Session).
 *
 * Principio Fundamental:
 * - Aislamiento FSRS: NO altera las matrices de estabilidad ni fechas de vencimiento de largo plazo en db.cardsFsrs.
 * - Prioriza items de mayor fragilidad mnemónica:
 *   1. Errores pedagógicos no resueltos (studentErrors).
 *   2. Tarjetas con Retrievability baja (R < 0.70 o lapsos frecuentes).
 *   3. Conceptos en cajas iniciales de Leitner.
 */

import { db, type CardFsrsRecord, type StudentErrorRecord, type FlashcardRecord } from "../../db/db.ts";
import { calculateRetrievability } from "../fsrs/fsrsModel.ts";

export interface CramItem {
  id: string;
  type: "fsrs" | "flashcard" | "error";
  prompt: string;
  answer: string;
  hint?: string;
  category?: string;
  subjectName?: string;
  retrievability?: number;
  stability?: number;
  difficulty?: number;
  isUnresolvedError?: boolean;
  urgencyScore: number; // 0 - 100
  originalRefId: string;
}

export interface CramSelectionOptions {
  folderId?: string;
  maxItems?: number;
  includeErrors?: boolean;
  includeFsrs?: boolean;
  includeLeitner?: boolean;
  retrievabilityThreshold?: number; // Cards with R <= threshold get priority
  onlyWeak?: boolean;
}

/**
 * Calcula la puntuación de urgencia (0 a 100) para un ítem de emergencia.
 */
export function calculateItemUrgencyScore(item: {
  type: "fsrs" | "flashcard" | "error";
  retrievability?: number;
  stability?: number;
  difficulty?: number;
  lapses?: number;
  isUnresolvedError?: boolean;
  box?: number;
}): number {
  if (item.type === "error") {
    // Errores no resueltos son máxima prioridad pedagógica previa a un examen
    return item.isUnresolvedError ? 95 : 65;
  }

  if (item.type === "fsrs") {
    const r = typeof item.retrievability === "number" ? item.retrievability : 0.5;
    const diff = typeof item.difficulty === "number" ? item.difficulty : 5;
    const lapses = typeof item.lapses === "number" ? item.lapses : 0;

    // R bajo aumenta la urgencia: si R=0.2 -> base = (1 - 0.2) * 80 = 64
    let score = (1 - Math.min(1, Math.max(0, r))) * 75;
    // Dificultad (1-10) suma hasta 15 puntos
    score += (diff / 10) * 15;
    // Lapsos de olvido suman hasta 10 puntos
    score += Math.min(10, lapses * 3);

    return Math.min(100, Math.max(10, Math.round(score)));
  }

  if (item.type === "flashcard") {
    const box = item.box || 1;
    switch (box) {
      case 1:
        return 82; // Caja de mayor error
      case 2:
        return 68;
      case 3:
        return 50;
      default:
        return 35;
    }
  }

  return 50;
}

/**
 * Selecciona y ordena el mazo de emergencia para la sesión Blitz.
 */
export async function selectCramDeck(options: CramSelectionOptions = {}): Promise<CramItem[]> {
  const {
    folderId,
    maxItems = 25,
    includeErrors = true,
    includeFsrs = true,
    includeLeitner = true,
    onlyWeak = false,
  } = options;

  const now = Date.now();
  const items: CramItem[] = [];

  // 1. Filtrado opcional por carpeta y extracción de errores
  if (includeErrors && db.studentErrors) {
    try {
      const allErrors: StudentErrorRecord[] = await db.studentErrors.toArray();
      for (const err of allErrors) {
        if (folderId && err.subjectId && err.subjectId !== folderId) continue;
        if (onlyWeak && err.resolved) continue;

        const isUnresolved = !err.resolved;
        const urgency = calculateItemUrgencyScore({
          type: "error",
          isUnresolvedError: isUnresolved,
        });

        items.push({
          id: `cram-err-${err.id}`,
          originalRefId: err.id,
          type: "error",
          prompt: `[Fallo Previo] ${err.conceptName || "Concepto"}: ${err.originalExercise || "Ejercicio"}`,
          answer: `Respuesta esperada:\n${err.expectedAnswer}\n\nDiagnóstico didáctico:\n${err.explanation}`,
          hint: err.studentAnswer ? `Tu respuesta anterior fue: "${err.studentAnswer}"` : undefined,
          category: err.category || "error",
          subjectName: err.conceptName,
          isUnresolvedError: isUnresolved,
          urgencyScore: urgency,
        });
      }
    } catch {
      // Degradar silenciosamente si la tabla no está disponible
    }
  }

  // 3. Extraer Tarjetas FSRS
  if (includeFsrs && db.cardsFsrs) {
    try {
      const allFsrs: CardFsrsRecord[] = await db.cardsFsrs.toArray();
      for (const card of allFsrs) {
        const isNew = card.state === "new" || card.lastReview === null;
        const elapsedDays = isNew ? 0 : Math.max(0, (now - card.lastReview!) / (24 * 60 * 60 * 1000));
        const r = isNew ? 0.4 : calculateRetrievability(elapsedDays, card.stability);

        if (onlyWeak && r > 0.75) continue;

        const urgency = calculateItemUrgencyScore({
          type: "fsrs",
          retrievability: r,
          stability: card.stability,
          difficulty: card.difficulty,
          lapses: card.lapses,
        });

        items.push({
          id: `cram-fsrs-${card.id}`,
          originalRefId: card.id,
          type: "fsrs",
          prompt: card.front,
          answer: card.back,
          hint: card.difficulty ? `Dificultad estimada: ${card.difficulty.toFixed(1)}/10` : undefined,
          category: "FSRS",
          retrievability: r,
          stability: card.stability,
          difficulty: card.difficulty,
          urgencyScore: urgency,
        });
      }
    } catch {
      // Degradar silenciosamente si falla la lectura
    }
  }

  // 4. Extraer Tarjetas Leitner clásicas
  if (includeLeitner && db.flashcards) {
    try {
      const allLeitner: FlashcardRecord[] = await db.flashcards.toArray();
      for (const card of allLeitner) {
        const box = card.box || 1;
        if (onlyWeak && box > 2) continue;

        const urgency = calculateItemUrgencyScore({
          type: "flashcard",
          box,
        });

        items.push({
          id: `cram-leitner-${card.id}`,
          originalRefId: card.id,
          type: "flashcard",
          prompt: card.front,
          answer: card.back,
          hint: `Caja Leitner: ${box}`,
          category: "Leitner",
          urgencyScore: urgency,
        });
      }
    } catch {
      // Degradar silenciosamente
    }
  }

  // 5. Ordenar por mayor urgencia
  items.sort((a, b) => b.urgencyScore - a.urgencyScore);

  // 6. Limitar cantidad máxima
  return items.slice(0, maxItems);
}

/**
 * Guarda telemetría de la sesión de emergencia sin distorsionar FSRS.
 */
export async function saveCramSessionSummary(summary: {
  totalReviewed: number;
  correctCount: number;
  doubtCount: number;
  failedCount: number;
  durationSeconds: number;
  failedItems: CramItem[];
  folderId?: string;
}): Promise<string | null> {
  try {
    const sessionId = `cram-session-${Date.now()}`;
    const startedAt = Date.now() - summary.durationSeconds * 1000;
    await db.sessions.add({
      id: sessionId,
      methodId: "cram",
      subjectFolderId: summary.folderId || null,
      startedAt,
      endedAt: Date.now(),
      durationSec: summary.durationSeconds,
    });

    return sessionId;
  } catch {
    return null;
  }
}
