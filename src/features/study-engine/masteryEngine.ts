import { db, type ConceptRecord } from "../../db/db";
import { calculateRetrievability } from "../fsrs/fsrsModel";
import type { ConceptMastery4D } from "./types";

/**
 * Ponderaciones canónicas para las 4 dimensiones de Mastery en CognitiveOS:
 * - Retención (35%): Estabilidad y recuperabilidad temporal en memoria
 * - Comprensión (30%): Ausencia de omisiones/contradicciones en explicaciones
 * - Aplicación (20%): Resolución de ejercicios, problemas numéricos y casos
 * - Transferencia (15%): Conexiones transversales en el Grafo de Conocimiento
 */
export const MASTERY_WEIGHTS = {
  retention: 0.35,
  comprehension: 0.3,
  application: 0.2,
  transfer: 0.15,
};

/**
 * Calcula el Mastery multidimensional (4D) de un concepto específico a partir de evidencias reales.
 */
export async function calculateConceptMastery4D(conceptId: string): Promise<ConceptMastery4D> {
  const concept = await db.concepts.get(conceptId);
  const conceptName = concept?.name || conceptId;

  const now = Date.now();
  const evidenceDetails: string[] = [];
  let evidenceCount = 0;

  // 1. RETENTION (0..1) - Tarjetas FSRS asociadas a este concepto
  const cards = await db.cardsFsrs.where("conceptId").equals(conceptId).toArray();
  let retention = 0.5; // Baseline neutral si no hay tarjetas creadas aún

  if (cards.length > 0) {
    let totalR = 0;
    for (const c of cards) {
      const elapsedDays = c.lastReview ? (now - c.lastReview) / (1000 * 60 * 60 * 24) : 0;
      const r = calculateRetrievability(elapsedDays, c.stability);
      totalR += r;
    }
    retention = totalR / cards.length;
    evidenceCount += cards.length;
    evidenceDetails.push(`${cards.length} tarjeta(s) FSRS auditadas (Retención media: ${(retention * 100).toFixed(0)}%)`);
  }

  // 2. COMPREHENSION (0..1) - Evaluaciones Socráticas y auditorías NLI
  const evaluations = await db.academicEvaluations.where("conceptId").equals(conceptId).toArray();
  let comprehension = 0.5;

  if (evaluations.length > 0) {
    const avgScore = evaluations.reduce((acc, ev) => acc + ev.masteryScore, 0) / evaluations.length;
    comprehension = Math.min(1.0, Math.max(0.0, avgScore / 100));
    evidenceCount += evaluations.length;
    evidenceDetails.push(`${evaluations.length} auditoría(s) socráticas NLI (Comprensión: ${(comprehension * 100).toFixed(0)}%)`);
  }

  // 3. APPLICATION (0..1) - Errores registrados vs resueltos
  const errors = await db.studentErrors.where("conceptId").equals(conceptId).toArray();
  let application = 0.6; // Baseline

  if (errors.length > 0) {
    const resolvedCount = errors.filter((e) => e.resolved).length;
    // Si hay muchos errores no resueltos, la aplicación se resiente
    const resolutionRatio = resolvedCount / errors.length;
    application = Math.max(0.1, 0.4 + resolutionRatio * 0.5 - (errors.length - resolvedCount) * 0.1);
    evidenceCount += errors.length;
    evidenceDetails.push(`${errors.length} caso(s) en Error Bank (${resolvedCount} superados)`);
  }

  // 4. TRANSFER (0..1) - Conectividad y centralidad en el Knowledge Graph
  const outgoingEdges = await db.conceptEdges.where("sourceConceptId").equals(conceptId).toArray();
  const incomingEdges = await db.conceptEdges.where("targetConceptId").equals(conceptId).toArray();
  const totalConnections = outgoingEdges.length + incomingEdges.length;

  // Los conceptos interconectados con prerrequisitos demuestran transferencia
  const transfer = Math.min(1.0, Math.max(0.2, 0.3 + totalConnections * 0.15));
  if (totalConnections > 0) {
    evidenceCount += 1;
    evidenceDetails.push(`${totalConnections} conexión(es) activa(s) en el Grafo de Conocimiento`);
  }

  // Cálculo del puntaje compuesto (0..100)
  const rawComposite =
    retention * MASTERY_WEIGHTS.retention +
    comprehension * MASTERY_WEIGHTS.comprehension +
    application * MASTERY_WEIGHTS.application +
    transfer * MASTERY_WEIGHTS.transfer;

  const compositeScore = Math.round(rawComposite * 100);

  return {
    conceptId,
    conceptName,
    retention: Number(retention.toFixed(3)),
    comprehension: Number(comprehension.toFixed(3)),
    application: Number(application.toFixed(3)),
    transfer: Number(transfer.toFixed(3)),
    compositeScore,
    evidenceCount,
    evidenceDetails,
    lastEvaluatedAt: now,
  };
}

/**
 * Actualiza el estado y scores en db.concepts sincronizando con el modelo 4D.
 */
export async function syncConceptMasteryToDatabase(conceptId: string): Promise<ConceptMastery4D> {
  const mastery = await calculateConceptMastery4D(conceptId);

  let newStatus: ConceptRecord["status"] = "in_progress";
  if (mastery.compositeScore >= 85 && mastery.retention >= 0.85) {
    newStatus = "mastered";
  } else if (mastery.evidenceCount === 0) {
    newStatus = "available";
  }

  await db.concepts.update(conceptId, {
    masteryScore: mastery.compositeScore / 100,
    currentRetrievability: mastery.retention,
    status: newStatus,
  });

  return mastery;
}

/**
 * Recalcula en lote el Mastery de todos los conceptos del workspace.
 */
export async function syncAllConceptsMastery(): Promise<ConceptMastery4D[]> {
  const allConcepts = await db.concepts.toArray();
  const results: ConceptMastery4D[] = [];
  for (const c of allConcepts) {
    const m = await syncConceptMasteryToDatabase(c.id);
    results.push(m);
  }
  return results;
}
