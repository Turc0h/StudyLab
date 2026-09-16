import { db } from "../../db/db";
import { calculateRetrievability } from "../fsrs/fsrsModel";
import { calculateConceptMastery4D } from "./masteryEngine";
import type { WeaknessSignal } from "./types";

/**
 * Escanea el estado completo del workspace para detectar debilidades cognitivas
 * activas y jerarquizarlas por severidad e impacto en el aprendizaje.
 */
export async function detectActiveWeaknesses(): Promise<WeaknessSignal[]> {
  const signals: WeaknessSignal[] = [];
  const now = Date.now();

  const concepts = await db.concepts.toArray();
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // 1. Detección de Caída de Retención FSRS (retention_decay)
  const allCards = await db.cardsFsrs.toArray();
  const conceptCardsMap = new Map<string, typeof allCards>();
  for (const card of allCards) {
    if (!card.conceptId) continue;
    const list = conceptCardsMap.get(card.conceptId) || [];
    list.push(card);
    conceptCardsMap.set(card.conceptId, list);
  }

  for (const [conceptId, cards] of conceptCardsMap.entries()) {
    const concept = conceptMap.get(conceptId);
    const conceptName = concept?.name || conceptId;

    let decayingCount = 0;
    let minR = 1.0;

    for (const c of cards) {
      const elapsedDays = c.lastReview ? (now - c.lastReview) / (1000 * 60 * 60 * 24) : 0;
      const r = calculateRetrievability(elapsedDays, c.stability);
      if (r < 0.75) {
        decayingCount++;
        if (r < minR) minR = r;
      }
    }

    if (decayingCount > 0) {
      signals.push({
        id: `weak_ret_${conceptId}`,
        conceptId,
        conceptName,
        type: "retention_decay",
        severity: minR < 0.5 ? "critical" : "warning",
        scoreImpact: Math.round((1 - minR) * 100),
        explanation: `${decayingCount} tarjeta(s) con probabilidad de olvido alta (Retención estimada: ${(minR * 100).toFixed(0)}%).`,
        recommendedAction: `Repasar tarjetas espaciadas del concepto antes de que colapse la estabilidad en memoria.`,
        suggestedSessionMethod: "spaced-repetition",
        timestamp: now,
      });
    }
  }

  // 2. Detección de Errores Repetidos y Malentendidos Persistentes (persistent_misconception)
  const unresolvedErrors = await db.studentErrors.filter((e) => !e.resolved).toArray();
  const errorsByConcept = new Map<string, typeof unresolvedErrors>();
  for (const err of unresolvedErrors) {
    const list = errorsByConcept.get(err.conceptId) || [];
    list.push(err);
    errorsByConcept.set(err.conceptId, list);
  }

  for (const [conceptId, errList] of errorsByConcept.entries()) {
    const concept = conceptMap.get(conceptId);
    const conceptName = concept?.name || conceptId;
    const totalReps = errList.reduce((acc, e) => acc + e.repetitionCount, 0);

    if (totalReps >= 2) {
      const hasMisconception = errList.some((e) => e.category === "misconception");
      signals.push({
        id: `weak_err_${conceptId}`,
        conceptId,
        conceptName,
        type: "persistent_misconception",
        severity: totalReps >= 3 || hasMisconception ? "critical" : "warning",
        scoreImpact: Math.min(100, totalReps * 25),
        explanation: `${totalReps} error(es) acumulado(s) sin resolver.${hasMisconception ? " Incluye contradicciones directas con el corpus de cátedra." : ""}`,
        recommendedAction: `Ejecutar sesión Feynman para identificar la premisa defectuosa y auditar contra la fuente original.`,
        suggestedSessionMethod: "feynman",
        timestamp: now,
      });
    }
  }

  // 3. Detección de Cuellos de Botella de Prerrequisitos (prerequisite_bottleneck)
  const edges = await db.conceptEdges.where("type").equals("prerequisite").toArray();
  const downstreamCountMap = new Map<string, string[]>();
  for (const edge of edges) {
    const list = downstreamCountMap.get(edge.sourceConceptId) || [];
    list.push(edge.targetConceptId);
    downstreamCountMap.set(edge.sourceConceptId, list);
  }

  for (const [prereqId, dependentIds] of downstreamCountMap.entries()) {
    if (dependentIds.length < 2) continue; // Solo nos interesan cuellos de botella con >= 2 dependencias
    const prereqConcept = conceptMap.get(prereqId);
    if (!prereqConcept) continue;

    const mastery = await calculateConceptMastery4D(prereqId);
    if (mastery.compositeScore < 70) {
      const dependentNames = dependentIds
        .map((id) => conceptMap.get(id)?.name || id)
        .slice(0, 3);

      signals.push({
        id: `weak_bottle_${prereqId}`,
        conceptId: prereqId,
        conceptName: prereqConcept.name,
        type: "prerequisite_bottleneck",
        severity: "critical",
        scoreImpact: 85,
        explanation: `Concepto fundacional con dominio insuficiente (${mastery.compositeScore}%) que bloquea el avance en: ${dependentNames.join(", ")}.`,
        recommendedAction: `Consolidar este axioma/teorema base antes de intentar ejercicios de los temas derivados.`,
        suggestedSessionMethod: "rag-audit",
        timestamp: now,
      });
    }
  }

  // Ordenar por severidad: critical > warning > info
  const severityRank = { critical: 3, warning: 2, info: 1 };
  return signals.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.scoreImpact - a.scoreImpact);
}
