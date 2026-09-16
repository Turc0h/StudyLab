import type { StudentErrorCategory, StudentErrorRecord, ExamPlanRecord } from "../../db/db";

export type { StudentErrorCategory, StudentErrorRecord, ExamPlanRecord };

export interface ConceptMastery4D {
  conceptId: string;
  conceptName: string;
  /** Retención R(t, S) calculada sobre las tarjetas FSRS asociadas (0..1) */
  retention: number;
  /** Comprensión derivada de explicaciones Feynman y auditorías NLI (0..1) */
  comprehension: number;
  /** Aplicación práctica en resolución de problemas y exámenes (0..1) */
  application: number;
  /** Transferencia transversal y conectividad en el Knowledge Graph (0..1) */
  transfer: number;
  /** Puntaje compuesto ponderado 0..100 */
  compositeScore: number;
  /** Cantidad de evidencias reales registradas */
  evidenceCount: number;
  evidenceDetails: string[];
  lastEvaluatedAt: number;
}

export type WeaknessSignalType =
  | "retention_decay"
  | "persistent_misconception"
  | "prerequisite_bottleneck"
  | "overconfidence_gap"
  | "untested_concept";

export interface WeaknessSignal {
  id: string;
  conceptId: string;
  conceptName: string;
  type: WeaknessSignalType;
  severity: "critical" | "warning" | "info";
  scoreImpact: number;
  explanation: string;
  recommendedAction: string;
  suggestedSessionMethod: "feynman" | "spaced-repetition" | "active-recall" | "rag-audit";
  timestamp: number;
}

export interface CalibrationResult {
  confidencePercent: number;
  isCorrect: boolean;
  type: "calibrated" | "overconfident" | "underconfident";
  message: string;
}

export interface UrgentReviewsSummary {
  cardCount: number;
  estimatedMinutes: number;
  conceptIds: string[];
  topConceptNames: string[];
}

export interface ConceptualGapItem {
  conceptId: string;
  conceptName: string;
  reason: string;
  suggestedAction: "feynman" | "read_source" | "socratic_audit";
  estimatedMinutes: number;
}

export interface BottleneckPrerequisiteItem {
  conceptId: string;
  conceptName: string;
  blockedDownstreamCount: number;
  blockedConceptNames: string[];
  estimatedMinutes: number;
}

export interface DailyStudyAgenda {
  targetDate: string; // YYYY-MM-DD
  headline: string; // "¿Qué debería estudiar hoy y por qué?"
  rationale: string;
  totalDebtMinutes: number;
  urgentReviews: UrgentReviewsSummary;
  conceptualGaps: ConceptualGapItem[];
  bottleneckPrerequisites: BottleneckPrerequisiteItem[];
  examAlerts: Array<{
    subjectName: string;
    daysRemaining: number;
    currentPhase: string;
    recommendedFocus: string;
  }>;
  generatedAt: number;
}
