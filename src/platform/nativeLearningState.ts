/**
 * StudyLab Native Learning State & Epistemic Chain Bridge
 * Connects React UI / Study Engine to the Rust Epistemic Kernel.
 *
 * Implements the strict separation:
 * Evidence -> Assessment -> Inference -> Recommendation -> Action
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";

export type ObservationInput =
  | {
      type: "cardReview";
      cardId: string;
      rating: number;
      latencyMs: number;
      elapsedDays: number;
      stability: number;
    }
  | {
      type: "academicEvaluation";
      evaluationId: string;
      masteryScore: number;
      omissionsCount: number;
      contradictionsCount: number;
    }
  | {
      type: "studentError";
      errorId: string;
      repetitionCount: number;
      resolved: boolean;
      category: string;
    }
  | {
      type: "graphConnection";
      connectedConceptId: string;
      isPrerequisite: boolean;
    }
  | {
      type: "mathDerivationStep";
      isCorrect: boolean;
      score: number;
      tokenRatio: number;
    };

export interface EvidenceInput {
  id: string;
  conceptId: string;
  timestampMs: number;
  observation: ObservationInput;
}

export interface ComputeLearningStateParams {
  conceptId: string;
  conceptName: string;
  evidences: EvidenceInput[];
  unresolvedErrorsCount: number;
  isPrerequisiteForCount: number;
}

export interface DimensionMetric {
  value: number;
  confidence: number;
  evidenceCount: number;
  isBaseline: boolean;
}

export interface InferenceResult {
  id: string;
  conceptId: string;
  diagnosisType: string;
  severity: "critical" | "warning" | "info";
  confidence: number;
  rationale: string;
}

export interface RecommendationResult {
  id: string;
  conceptId: string;
  strategy: string;
  priority: "critical" | "warning" | "info";
  rationale: string;
  estimatedMinutes: number;
}

export interface ActionResult {
  id: string;
  recommendationId: string;
  conceptId: string;
  actionType: string;
  suggestedMethod: string;
  durationMinutes: number;
  description: string;
}

export interface LearningStateResult {
  conceptId: string;
  conceptName: string;
  retention: DimensionMetric;
  comprehension: DimensionMetric;
  application: DimensionMetric;
  synthesis: DimensionMetric;
  compositeScore: number;
  overallConfidence: number;
  evidenceCount: number;
  evidenceDetails: string[];
  inferences: InferenceResult[];
  recommendations: RecommendationResult[];
  suggestedActions: ActionResult[];
  evaluatedAtMs: number;
  sourceEngine: "rust" | "typescript-fallback";
}

/**
 * FSRS Retrievability calculation in TypeScript fallback: R(t, S) = (1 + 19 * t / S)^-0.5
 * Unified with domain::fsrs and masteryEngine.ts as single source of truth.
 */
function calculateRetrievabilityFallback(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1.0;
  const s = Math.max(0.01, stability);
  const factor = 19.0;
  const r = Math.pow(1.0 + (factor * elapsedDays) / s, -0.5);
  return Math.min(1.0, Math.max(0.0, r));
}

/**
 * Computes the complete 4D Mastery and Epistemic Chain.
 * Invokes native Rust backend in desktop; seamlessly executes deterministic TypeScript fallback in web.
 */
export async function computeLearningStateNative(
  params: ComputeLearningStateParams,
): Promise<LearningStateResult> {
  const { conceptId, conceptName, evidences, unresolvedErrorsCount, isPrerequisiteForCount } =
    params;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<Omit<LearningStateResult, "sourceEngine">>(
        "compute_learning_state",
        {
          request: {
            conceptId,
            conceptName,
            evidences,
            unresolvedErrorsCount,
            isPrerequisiteForCount,
          },
        },
      );

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn(
        "[nativeLearningState] Fallback a motor TypeScript debido a error o contexto IPC:",
        err,
      );
    }
  }

  // TypeScript Fallback Implementation (strict parity with Rust domain logic)
  const nowMs = Date.now();

  // 1. Retention
  const cardReviews = evidences.filter((e) => e.observation.type === "cardReview");
  let retentionValue = 0.5;
  let retentionConfidence = 0.0;
  let retentionIsBaseline = true;

  if (cardReviews.length > 0) {
    let totalR = 0;
    for (const cr of cardReviews) {
      if (cr.observation.type === "cardReview") {
        totalR += calculateRetrievabilityFallback(
          cr.observation.elapsedDays,
          cr.observation.stability,
        );
      }
    }
    retentionValue = totalR / cardReviews.length;
    retentionConfidence = Math.min(1.0, 1 - Math.exp(-0.5 * cardReviews.length));
    retentionIsBaseline = false;
  }

  // 2. Comprehension
  const evaluations = evidences.filter((e) => e.observation.type === "academicEvaluation");
  let compValue = 0.5;
  let compConfidence = 0.0;
  let compIsBaseline = true;

  if (evaluations.length > 0) {
    let totalScore = 0;
    for (const ev of evaluations) {
      if (ev.observation.type === "academicEvaluation") {
        totalScore += ev.observation.masteryScore;
      }
    }
    compValue = Math.min(1.0, Math.max(0.0, totalScore / evaluations.length / 100));
    compConfidence = Math.min(1.0, 1 - Math.exp(-0.6 * evaluations.length));
    compIsBaseline = false;
  }

  // 3. Application
  const errors = evidences.filter((e) => e.observation.type === "studentError");
  const mathSteps = evidences.filter((e) => e.observation.type === "mathDerivationStep");
  const totalAppEvidence = errors.length + mathSteps.length;
  let appValue = 0.6;
  let appConfidence = 0.0;
  let appIsBaseline = true;

  if (totalAppEvidence > 0) {
    let baseScore = 0.6;
    if (errors.length > 0) {
      const resolved = errors.filter(
        (e) => e.observation.type === "studentError" && e.observation.resolved,
      ).length;
      const resRatio = resolved / errors.length;
      const unresolved = errors.length - resolved;
      baseScore = Math.min(1.0, Math.max(0.1, 0.4 + resRatio * 0.5 - unresolved * 0.1));
    }
    if (mathSteps.length > 0) {
      const correct = mathSteps.filter(
        (m) => m.observation.type === "mathDerivationStep" && m.observation.isCorrect,
      ).length;
      baseScore = baseScore * 0.7 + (correct / mathSteps.length) * 0.3;
    }
    appValue = Math.min(1.0, Math.max(0.1, baseScore));
    appConfidence = Math.min(1.0, 1 - Math.exp(-0.4 * totalAppEvidence));
    appIsBaseline = false;
  }

  // 4. Synthesis (Transfer)
  const connections = evidences.filter((e) => e.observation.type === "graphConnection");
  let synthValue = 0.3;
  let synthConfidence = 0.0;
  let synthIsBaseline = true;

  if (connections.length > 0) {
    synthValue = Math.min(1.0, Math.max(0.2, 0.3 + connections.length * 0.15));
    synthConfidence = Math.min(1.0, 1 - Math.exp(-0.5 * connections.length));
    synthIsBaseline = false;
  }

  const rawComposite =
    retentionValue * 0.35 + compValue * 0.3 + appValue * 0.2 + synthValue * 0.15;
  const compositeScore = Math.round(rawComposite * 100);

  const overallConfidence = Number(
    (
      retentionConfidence * 0.35 +
      compConfidence * 0.3 +
      appConfidence * 0.2 +
      synthConfidence * 0.15
    ).toFixed(2),
  );

  // Inferences
  const inferences: InferenceResult[] = [];
  const totalEvidenceCount =
    cardReviews.length + evaluations.length + totalAppEvidence + connections.length;

  if (totalEvidenceCount === 0) {
    inferences.push({
      id: `inf_untested_${conceptId}`,
      conceptId,
      diagnosisType: "untested_concept",
      severity: "info",
      confidence: 1.0,
      rationale:
        "El concepto aún no cuenta con observaciones empíricas registradas en el sistema.",
    });
  } else {
    if (!retentionIsBaseline && retentionValue < 0.75) {
      inferences.push({
        id: `inf_decay_${conceptId}`,
        conceptId,
        diagnosisType: "retention_decay",
        severity: retentionValue < 0.5 ? "critical" : "warning",
        confidence: Number(retentionConfidence.toFixed(2)),
        rationale: `Retención estimada en ${(retentionValue * 100).toFixed(0)}%, por debajo del umbral de estabilidad óptimo (75%).`,
      });
    }

    if (unresolvedErrorsCount >= 2 || (compValue < 0.6 && !compIsBaseline)) {
      inferences.push({
        id: `inf_misconception_${conceptId}`,
        conceptId,
        diagnosisType: "persistent_misconception",
        severity: unresolvedErrorsCount >= 3 || compValue < 0.4 ? "critical" : "warning",
        confidence: Number(compConfidence.toFixed(2)),
        rationale: `Detectadas lagunas conceptuales persistentes (${unresolvedErrorsCount} error(es) pendientes y comprensión evaluada en ${(compValue * 100).toFixed(0)}%).`,
      });
    }

    if (isPrerequisiteForCount >= 2 && compositeScore < 70) {
      inferences.push({
        id: `inf_bottleneck_${conceptId}`,
        conceptId,
        diagnosisType: "prerequisite_bottleneck",
        severity: "critical",
        confidence: Number(
          ((retentionConfidence + compConfidence + appConfidence) / 3).toFixed(2),
        ),
        rationale: `Concepto fundacional con dominio insuficiente (${compositeScore}%) que bloquea el avance en ${isPrerequisiteForCount} nodos dependientes.`,
      });
    } else if (compositeScore >= 75 && totalEvidenceCount >= 2) {
      inferences.push({
        id: `inf_mastery_${conceptId}`,
        conceptId,
        diagnosisType: "sufficient_mastery",
        severity: "info",
        confidence: Number(((retentionConfidence + compConfidence) / 2).toFixed(2)),
        rationale: `El estudiante demuestra dominio robusto (${compositeScore}%) respaldado por ${totalEvidenceCount} observaciones empíricas.`,
      });
    }
  }

  // Recommendations
  const recommendations: RecommendationResult[] = [];
  for (const inf of inferences) {
    if (inf.diagnosisType === "retention_decay") {
      recommendations.push({
        id: `rec_rev_${conceptId}`,
        conceptId,
        strategy: "spaced-repetition",
        priority: inf.severity,
        rationale:
          "Repaso urgente de tarjetas espaciadas: la retención estimada cayó, arriesgando pérdida del trazo mnémico.",
        estimatedMinutes: 10,
      });
    } else if (inf.diagnosisType === "persistent_misconception") {
      recommendations.push({
        id: `rec_feynman_${conceptId}`,
        conceptId,
        strategy: "feynman",
        priority: inf.severity,
        rationale:
          "Sesión Feynman focalizada: existen errores pendientes. Conviene re-explicar la noción y contrastar con la fuente original.",
        estimatedMinutes: 20,
      });
    } else if (inf.diagnosisType === "prerequisite_bottleneck") {
      recommendations.push({
        id: `rec_prereq_${conceptId}`,
        conceptId,
        strategy: "prerequisite-reinforcement",
        priority: "critical",
        rationale: `Desbloqueo de cuello de botella: el concepto base tiene solo ${compositeScore}% de dominio y frena el aprendizaje en temas posteriores.`,
        estimatedMinutes: 25,
      });
    } else if (inf.diagnosisType === "untested_concept") {
      recommendations.push({
        id: `rec_init_${conceptId}`,
        conceptId,
        strategy: "active-recall",
        priority: "info",
        rationale:
          "Evaluación diagnóstica inicial: el concepto no tiene observaciones previas.",
        estimatedMinutes: 15,
      });
    }
  }

  // Actions
  const suggestedActions: ActionResult[] = recommendations.map((rec) => ({
    id: `act_${rec.id}`,
    recommendationId: rec.id,
    conceptId: rec.conceptId,
    actionType: "SCHEDULE_SESSION",
    suggestedMethod:
      rec.strategy === "spaced-repetition"
        ? "spaced-repetition"
        : rec.strategy === "feynman"
          ? "feynman"
          : "active-recall",
    durationMinutes: rec.estimatedMinutes,
    description: rec.rationale,
  }));

  const evidenceDetails: string[] = [];
  if (cardReviews.length > 0) {
    evidenceDetails.push(
      `${cardReviews.length} tarjeta(s) FSRS auditadas (Retención media: ${(retentionValue * 100).toFixed(0)}%)`,
    );
  }
  if (evaluations.length > 0) {
    evidenceDetails.push(
      `${evaluations.length} auditoría(s) socráticas NLI (Comprensión: ${(compValue * 100).toFixed(0)}%)`,
    );
  }
  if (totalAppEvidence > 0) {
    evidenceDetails.push(
      `${totalAppEvidence} caso(s) en Error Bank / pasos algebraicos evaluados`,
    );
  }
  if (connections.length > 0) {
    evidenceDetails.push(
      `${connections.length} conexión(es) activa(s) en el Grafo de Conocimiento`,
    );
  }

  return {
    conceptId,
    conceptName,
    retention: {
      value: Number(retentionValue.toFixed(3)),
      confidence: Number(retentionConfidence.toFixed(2)),
      evidenceCount: cardReviews.length,
      isBaseline: retentionIsBaseline,
    },
    comprehension: {
      value: Number(compValue.toFixed(3)),
      confidence: Number(compConfidence.toFixed(2)),
      evidenceCount: evaluations.length,
      isBaseline: compIsBaseline,
    },
    application: {
      value: Number(appValue.toFixed(3)),
      confidence: Number(appConfidence.toFixed(2)),
      evidenceCount: totalAppEvidence,
      isBaseline: appIsBaseline,
    },
    synthesis: {
      value: Number(synthValue.toFixed(3)),
      confidence: Number(synthConfidence.toFixed(2)),
      evidenceCount: connections.length,
      isBaseline: synthIsBaseline,
    },
    compositeScore,
    overallConfidence,
    evidenceCount: totalEvidenceCount,
    evidenceDetails,
    inferences,
    recommendations,
    suggestedActions,
    evaluatedAtMs: nowMs,
    sourceEngine: "typescript-fallback",
  };
}
