import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";

export interface UrgentReviewsSummaryDto {
  cardCount: number;
  estimatedMinutes: number;
  conceptIds: string[];
  topConceptNames: string[];
}

export interface ConceptualGapItemDto {
  conceptId: string;
  conceptName: string;
  reason: string;
  suggestedAction: string;
  estimatedMinutes: number;
}

export interface BottleneckPrerequisiteItemDto {
  conceptId: string;
  conceptName: string;
  blockedDownstreamCount: number;
  blockedConceptNames: string[];
  estimatedMinutes: number;
}

export interface ExamAlertItemDto {
  subjectName: string;
  daysRemaining: number;
  currentPhase: string;
  recommendedFocus: string;
}

export interface DailyStudyAgendaDto {
  targetDate: string;
  headline: string;
  rationale: string;
  totalDebtMinutes: number;
  urgentReviews: UrgentReviewsSummaryDto;
  conceptualGaps: ConceptualGapItemDto[];
  bottleneckPrerequisites: BottleneckPrerequisiteItemDto[];
  examAlerts: ExamAlertItemDto[];
  generatedAtMs: number;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface DueCardConceptInputDto {
  conceptId: string;
  conceptName: string;
  count: number;
}

export interface GapSignalInputDto {
  conceptId: string;
  conceptName: string;
  gapType: "persistent_misconception" | "retention_decay";
  explanation: string;
}

export interface BottleneckSignalInputDto {
  conceptId: string;
  conceptName: string;
  blockedDownstreamCount: number;
  blockedConceptNames: string[];
}

export interface GenerateStudyAgendaParams {
  targetDate?: string;
  nowMs?: number;
  totalDueCards: number;
  dueCardConcepts: DueCardConceptInputDto[];
  gapSignals: GapSignalInputDto[];
  bottleneckSignals: BottleneckSignalInputDto[];
  examAlerts: ExamAlertItemDto[];
  totalConceptsRegistered: number;
}

export type TriageUrgency = "urgent" | "medium" | "long";
export type TriageMaterial = "logical" | "factual" | "doctrinal" | "multimodal";
export type TriageMastery = "initial" | "intermediate" | "advanced";
export type TriageEnergy = "high" | "medium" | "low";

export interface TriageAnswersDto {
  urgency: TriageUrgency;
  material: TriageMaterial;
  mastery: TriageMastery;
  energy: TriageEnergy;
}

export interface TriageMethodMatchDto {
  methodId: string;
  score: number;
  matchPercentage: number;
  rationale: string;
  keyBenefit: string;
}

export interface TriageResultDto {
  answers: TriageAnswersDto;
  topMatches: TriageMethodMatchDto[];
  diagnosticSummary: string;
  cautionAlert?: string;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface ExamPhaseMilestoneDto {
  name: string;
  description: string;
  startDayOffset: number;
  endDayOffset: number;
  targetMilestone: string;
  completed: boolean;
}

export interface ExamPlanSummaryDto {
  subjectId: string;
  subjectName: string;
  examDateMs: number;
  availableMinutesPerDay: number;
  totalDays: number;
  phases: ExamPhaseMilestoneDto[];
  status: string;
  createdAtMs: number;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface PlanReverseExamParams {
  subjectId: string;
  subjectName: string;
  examDateMs: number;
  nowMs?: number;
  availableMinutesPerDay?: number;
}

export interface TimeBudgetStepDto {
  id: string;
  stepType: string;
  title: string;
  description: string;
  allocatedMinutes: number;
  actionUrl: string;
  actionLabel: string;
  badge: string;
}

export interface TimeBudgetPlanDto {
  totalMinutes: number;
  headline: string;
  steps: TimeBudgetStepDto[];
  targetFocus: string;
  sourceEngine: "rust" | "typescript-fallback";
}

export interface CalculateTimeBudgetParams {
  budgetMinutes: number;
  urgentCardsCount: number;
  topConceptName?: string;
  primaryGapConceptName?: string;
}

/**
 * Generates the daily study agenda using native Rust engine if on desktop,
 * or with deterministic TypeScript fallback if in browser or on IPC error.
 */
export async function generateDailyStudyAgendaNative(
  params: GenerateStudyAgendaParams
): Promise<DailyStudyAgendaDto> {
  if (isDesktop()) {
    try {
      const rustRes = await invoke<Omit<DailyStudyAgendaDto, "sourceEngine">>(
        "generate_study_agenda",
        { request: params }
      );
      return {
        ...rustRes,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeStudyEngine] Fallback a TypeScript en generate_study_agenda:", err);
    }
  }

  // TypeScript Fallback Implementation
  const now = params.nowMs ?? Date.now();
  const targetDate = params.targetDate ?? new Date(now).toISOString().split("T")[0];
  const urgentMinutes = params.totalDueCards;

  const sortedConcepts = [...params.dueCardConcepts].sort((a, b) => b.count - a.count);
  const topConceptIds = sortedConcepts.slice(0, 3).map((c) => c.conceptId);
  const topConceptNames = sortedConcepts.slice(0, 3).map((c) => c.conceptName);

  const urgentReviews: UrgentReviewsSummaryDto = {
    cardCount: params.totalDueCards,
    estimatedMinutes: urgentMinutes,
    conceptIds: topConceptIds,
    topConceptNames,
  };

  const conceptualGaps: ConceptualGapItemDto[] = params.gapSignals.slice(0, 3).map((sig) => {
    const isMisconception = sig.gapType === "persistent_misconception";
    return {
      conceptId: sig.conceptId,
      conceptName: sig.conceptName,
      reason: sig.explanation,
      suggestedAction: isMisconception ? "feynman" : "socratic_audit",
      estimatedMinutes: isMisconception ? 20 : 15,
    };
  });

  const bottleneckPrerequisites: BottleneckPrerequisiteItemDto[] = params.bottleneckSignals
    .slice(0, 2)
    .map((b) => ({
      conceptId: b.conceptId,
      conceptName: b.conceptName,
      blockedDownstreamCount: b.blockedDownstreamCount,
      blockedConceptNames: b.blockedConceptNames,
      estimatedMinutes: 25,
    }));

  const gapMinutes = conceptualGaps.reduce((acc, g) => acc + g.estimatedMinutes, 0);
  const bottleneckMinutes = bottleneckPrerequisites.reduce((acc, b) => acc + b.estimatedMinutes, 0);
  const totalDebtMinutes = urgentMinutes + gapMinutes + bottleneckMinutes;

  let headline = "¿Qué debería estudiar hoy y por qué?";
  let rationale = "";

  if (params.totalDueCards > 0 && conceptualGaps.length > 0) {
    const firstGap = conceptualGaps[0];
    const joinedNames = topConceptNames.length > 0 ? topConceptNames.join(", ") : "temas troncales";
    headline = `Repasar ${params.totalDueCards} tarjeta(s) vencidas y desarmar la laguna en "${firstGap.conceptName}"`;
    rationale = `Tu curva de retención FSRS indica riesgo de olvido inminente en ${joinedNames} (${urgentMinutes} min). Además, registraste errores reiterados en "${firstGap.conceptName}" que requieren una explicación Feynman breve (${firstGap.estimatedMinutes} min). Deuda total acumulada: ${totalDebtMinutes} min.`;
  } else if (params.totalDueCards > 0) {
    headline = `Consolidar memoria: ${params.totalDueCards} tarjeta(s) espaciadas pendientes`;
    rationale = `No presentas lagunas conceptuales críticas abiertas. Dedica ${urgentMinutes} minutos a limpiar el mazo para preservar la estabilidad de memoria a largo plazo.`;
  } else if (bottleneckPrerequisites.length > 0) {
    const firstBottle = bottleneckPrerequisites[0];
    headline = `Desbloquear cuello de botella: "${firstBottle.conceptName}"`;
    rationale = `Este concepto fundacional tiene dominio bajo y está frenando tu comprensión de ${firstBottle.blockedConceptNames.join(", ")}. Dedica 25 minutos a auditar sus teoremas en el RAG.`;
  } else if (params.totalConceptsRegistered > 0) {
    headline = `Todo al día. Momento ideal para avanzar materia o simular un examen`;
    rationale = `Tu retención se encuentra en zona segura (>85%) y no hay deudas de estudio urgentes. Puedes avanzar con nuevas lecturas o poner a prueba tu dominio con un simulacro exprés.`;
  } else {
    headline = `Carga tus primeros apuntes de cátedra en el visor`;
    rationale = `El Cognitive OS necesita material bibliográfico para indexar conceptos, extraer teoremas y comenzar a calcular tu mapa de dominio 4D.`;
  }

  return {
    targetDate,
    headline,
    rationale,
    totalDebtMinutes,
    urgentReviews,
    conceptualGaps,
    bottleneckPrerequisites,
    examAlerts: params.examAlerts,
    generatedAtMs: now,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Calculates cognitive triage recommendation using Rust native or TS fallback.
 */
export async function calculateCognitiveTriageNative(
  answers: TriageAnswersDto
): Promise<TriageResultDto> {
  if (isDesktop()) {
    try {
      const rustRes = await invoke<Omit<TriageResultDto, "sourceEngine">>(
        "calculate_cognitive_triage",
        { request: { answers } }
      );
      return {
        ...rustRes,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeStudyEngine] Fallback a TypeScript en calculate_cognitive_triage:", err);
    }
  }

  // TypeScript Fallback Implementation matching Rust triage logic
  const scores: Record<string, number> = {
    "active-recall": 50,
    "spaced-repetition": 50,
    feynman: 50,
    pomodoro: 50,
    interleaving: 50,
    cornell: 50,
    blurting: 50,
    "mind-maps": 50,
    leitner: 50,
    "self-explanation": 50,
    "distributed-practice": 50,
    sq3r: 50,
    "dual-coding": 50,
    mnemonics: 50,
    chunking: 50,
    "problem-based-learning": 50,
    "practice-testing": 50,
    "story-method": 50,
    "protege-effect": 50,
    "multisensory-learning": 50,
    "method-of-loci": 50,
    "elaborative-interrogation": 50,
    "concept-maps": 50,
    "desirable-difficulties": 50,
    zettelkasten: 50,
    pq4r: 50,
    "kwl-method": 50,
    "segmentation-principle": 50,
    "deep-work": 50,
    "sleep-consolidation": 50,
  };

  if (answers.urgency === "urgent") {
    scores["practice-testing"] += 45;
    scores["blurting"] += 45;
    scores["active-recall"] += 35;
    scores["feynman"] += 20;
    scores["leitner"] += 15;
    scores["desirable-difficulties"] += 15;
    scores["distributed-practice"] -= 40;
    scores["zettelkasten"] -= 40;
    scores["concept-maps"] -= 30;
    scores["problem-based-learning"] -= 25;
    scores["method-of-loci"] -= 25;
  } else if (answers.urgency === "medium") {
    scores["leitner"] += 35;
    scores["interleaving"] += 35;
    scores["feynman"] += 30;
    scores["desirable-difficulties"] += 30;
    scores["cornell"] += 25;
    scores["elaborative-interrogation"] += 25;
    scores["chunking"] += 20;
    scores["pq4r"] += 20;
  } else {
    scores["distributed-practice"] += 45;
    scores["spaced-repetition"] += 40;
    scores["concept-maps"] += 35;
    scores["problem-based-learning"] += 35;
    scores["zettelkasten"] += 30;
    scores["dual-coding"] += 25;
    scores["protege-effect"] += 25;
    scores["blurting"] -= 15;
  }

  if (answers.material === "logical") {
    scores["feynman"] += 40;
    scores["problem-based-learning"] += 40;
    scores["concept-maps"] += 35;
    scores["self-explanation"] += 35;
    scores["elaborative-interrogation"] += 30;
    scores["deep-work"] += 20;
    scores["story-method"] -= 30;
    scores["mnemonics"] -= 30;
  } else if (answers.material === "factual") {
    scores["leitner"] += 40;
    scores["method-of-loci"] += 35;
    scores["story-method"] += 35;
    scores["chunking"] += 35;
    scores["mnemonics"] += 30;
    scores["active-recall"] += 25;
    scores["spaced-repetition"] += 20;
  } else if (answers.material === "doctrinal") {
    scores["pq4r"] += 40;
    scores["sq3r"] += 35;
    scores["cornell"] += 35;
    scores["elaborative-interrogation"] += 30;
    scores["zettelkasten"] += 25;
    scores["segmentation-principle"] += 20;
  } else if (answers.material === "multimodal") {
    scores["dual-coding"] += 40;
    scores["multisensory-learning"] += 35;
    scores["mind-maps"] += 35;
    scores["concept-maps"] += 30;
    scores["zettelkasten"] += 25;
  }

  if (answers.mastery === "initial") {
    scores["segmentation-principle"] += 35;
    scores["sq3r"] += 30;
    scores["feynman"] += 25;
    scores["protege-effect"] += 25;
    scores["kwl-method"] += 25;
    scores["desirable-difficulties"] -= 30;
    scores["blurting"] -= 25;
    scores["practice-testing"] -= 20;
  } else if (answers.mastery === "intermediate") {
    scores["concept-maps"] += 30;
    scores["interleaving"] += 25;
    scores["dual-coding"] += 25;
    scores["cornell"] += 20;
    scores["chunking"] += 20;
  } else if (answers.mastery === "advanced") {
    scores["desirable-difficulties"] += 40;
    scores["practice-testing"] += 35;
    scores["blurting"] += 30;
    scores["elaborative-interrogation"] += 25;
    scores["sq3r"] -= 20;
  }

  if (answers.energy === "high") {
    scores["deep-work"] += 35;
    scores["problem-based-learning"] += 30;
    scores["practice-testing"] += 25;
    scores["feynman"] += 20;
  } else if (answers.energy === "medium") {
    scores["pomodoro"] += 30;
    scores["leitner"] += 25;
    scores["interleaving"] += 25;
    scores["cornell"] += 20;
  } else if (answers.energy === "low") {
    scores["sleep-consolidation"] += 55;
    scores["multisensory-learning"] += 45;
    scores["segmentation-principle"] += 35;
    scores["spaced-repetition"] += 30;
    scores["deep-work"] -= 40;
    scores["practice-testing"] -= 35;
    scores["problem-based-learning"] -= 30;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topMatches: TriageMethodMatchDto[] = ranked.slice(0, 3).map(([id, rawScore]) => {
    const clamped = Math.max(20, Math.min(180, rawScore));
    const matchPercentage = Math.round(50 + ((clamped - 20) / 160) * 49);
    return {
      methodId: id,
      score: rawScore,
      matchPercentage,
      rationale: `Metodología seleccionada para el perfil de urgencia (${answers.urgency}) y energía (${answers.energy}).`,
      keyBenefit: "Alineación neurocognitiva con el perfil de energía y urgencia.",
    };
  });

  const urgencyLabel =
    answers.urgency === "urgent"
      ? "menos de 24 horas para rendir"
      : answers.urgency === "medium"
      ? "2 a 7 días disponibles"
      : "más de 2 semanas de horizonte";
  const materialLabel =
    answers.material === "logical"
      ? "materia lógica o computacional"
      : answers.material === "factual"
      ? "contenido de alta memorización fáctica"
      : answers.material === "doctrinal"
      ? "textos doctrinales densos"
      : "conceptos abstractos o multimodales";
  const energyLabel =
    answers.energy === "high"
      ? "foco mental pleno"
      : answers.energy === "medium"
      ? "ritmo cognitivo sostenido"
      : "fatiga mental o estudio nocturno";

  const diagnosticSummary = `Diagnóstico: Para una situación con ${urgencyLabel}, sobre ${materialLabel} y con ${energyLabel}, tu prioridad pedagógica es maximizar la eficiencia y proteger la memoria de trabajo.`;

  let cautionAlert: string | undefined;
  if (answers.urgency === "urgent" && answers.energy === "low") {
    cautionAlert =
      "¡Alerta de Fatiga Extrema! Intentar sesiones masivas de última hora con baja energía produce ilusión de competencia y bloqueo sináptico. Te recomendamos repasar los simulacros o activar Consolidación por Sueño.";
  } else if (answers.urgency === "urgent" && answers.mastery === "initial") {
    cautionAlert =
      "¡Precaución por tiempo crítico! Al ser la primera vez que ves el tema, concentrate en el Principio de Segmentación o Feynman básico en vez de intentar abarcar todo el manual.";
  }

  return {
    answers,
    topMatches,
    diagnosticSummary,
    cautionAlert,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Plans reverse exam stages using Rust native or TS fallback.
 */
export async function planReverseExamNative(
  params: PlanReverseExamParams
): Promise<ExamPlanSummaryDto> {
  if (isDesktop()) {
    try {
      const rustRes = await invoke<Omit<ExamPlanSummaryDto, "sourceEngine">>(
        "plan_reverse_exam",
        { request: params }
      );
      return {
        ...rustRes,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeStudyEngine] Fallback a TypeScript en plan_reverse_exam:", err);
    }
  }

  // TypeScript Fallback Implementation
  const now = params.nowMs ?? Date.now();
  const diffMs = Math.max(0, params.examDateMs - now);
  const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const availableMinutes = params.availableMinutesPerDay ?? 90;

  const d1 = Math.max(1, Math.round(totalDays * 0.3));
  const d2 = Math.max(1, Math.round(totalDays * 0.4));
  const d3 = Math.max(1, Math.round(totalDays * 0.2));
  const d4 = Math.max(1, totalDays - (d1 + d2 + d3));

  const offset = 0;
  const phases: ExamPhaseMilestoneDto[] = [
    {
      name: "Fase 1: Diagnóstico e Ingesta Conceptual",
      description: "Lectura activa de apuntes de cátedra, extracción de teoremas y construcción del Grafo.",
      startDayOffset: offset,
      endDayOffset: offset + d1,
      targetMilestone: "100% de conceptos cargados y evaluados en Feynman preliminar.",
      completed: false,
    },
    {
      name: "Fase 2: Resolución Profunda y Desarme de Errores",
      description: "Práctica de guías de trabajos prácticos, auditoría socrática y vaciado del Error Bank.",
      startDayOffset: offset + d1,
      endDayOffset: offset + d1 + d2,
      targetMilestone: "Cero errores repetidos en temas troncales y retención FSRS > 85%.",
      completed: false,
    },
    {
      name: "Fase 3: Simulacros de Examen Cronometrados",
      description: "Simulacros en Modo Examen estricto, sin pistas, con tiempo límite y evaluación formal.",
      startDayOffset: offset + d1 + d2,
      endDayOffset: offset + d1 + d2 + d3,
      targetMilestone: "3 simulacros aprobados con calificación >= 7/10 en condiciones reales.",
      completed: false,
    },
    {
      name: "Fase 4: Consolidación y Repaso de Retención",
      description: "Repasos ligeros de tarjetas FSRS con retención en riesgo. No aprender temas nuevos.",
      startDayOffset: offset + d1 + d2 + d3,
      endDayOffset: offset + d1 + d2 + d3 + d4,
      targetMilestone: "Dominio global consolidado y descanso mental previo a la mesa de examen.",
      completed: false,
    },
  ];

  return {
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    examDateMs: params.examDateMs,
    availableMinutesPerDay: availableMinutes,
    totalDays,
    phases,
    status: "active",
    createdAtMs: now,
    sourceEngine: "typescript-fallback",
  };
}

/**
 * Calculates time budget allocation plan using Rust native or TS fallback.
 */
export async function calculateTimeBudgetNative(
  params: CalculateTimeBudgetParams
): Promise<TimeBudgetPlanDto> {
  if (isDesktop()) {
    try {
      const rustRes = await invoke<Omit<TimeBudgetPlanDto, "sourceEngine">>(
        "calculate_time_budget",
        { request: params }
      );
      return {
        ...rustRes,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn("[nativeStudyEngine] Fallback a TypeScript en calculate_time_budget:", err);
    }
  }

  // TypeScript Fallback Implementation
  const { budgetMinutes, urgentCardsCount, topConceptName, primaryGapConceptName } = params;
  const topConcept = topConceptName || "temas troncales";
  const steps: TimeBudgetStepDto[] = [];
  let remaining = budgetMinutes;

  if (budgetMinutes <= 25) {
    if (urgentCardsCount > 0) {
      const fsrsMins = Math.min(remaining, Math.max(5, Math.min(10, urgentCardsCount)));
      steps.push({
        id: "step_fsrs_short",
        stepType: "fsrs_review",
        title: `Repaso Relámpago FSRS (${fsrsMins} min)`,
        description: `Consolidar las ${Math.min(fsrsMins * 2, urgentCardsCount)} tarjetas más críticas de ${topConcept} antes de que caiga la curva de olvido.`,
        allocatedMinutes: fsrsMins,
        actionUrl: "/methods",
        actionLabel: "Iniciar Repaso",
        badge: "Memoria",
      });
      remaining -= fsrsMins;
    }

    if (remaining >= 8 && primaryGapConceptName) {
      steps.push({
        id: "step_gap_short",
        stepType: "feynman_gap",
        title: `Desarmar "${primaryGapConceptName}" (${remaining} min)`,
        description:
          "Explicación sintética de 1 carilla en técnica Feynman para resolver la premisa errónea registrada en el Error Bank.",
        allocatedMinutes: remaining,
        actionUrl: "/session",
        actionLabel: "Abrir Feynman",
        badge: "Laguna Crítica",
      });
      remaining = 0;
    } else if (remaining > 0) {
      steps.push({
        id: "step_rag_short",
        stepType: "rag_audit",
        title: `Auditoría RAG Exprés (${remaining} min)`,
        description: "Lectura activa de 2 páginas de apuntes en el visor con Catedrático Socrático.",
        allocatedMinutes: remaining,
        actionUrl: "/workspace",
        actionLabel: "Ir al Visor",
        badge: "Lectura",
      });
    }

    return {
      totalMinutes: budgetMinutes,
      headline: `Micro-sesión Relámpago de ${budgetMinutes} min`,
      steps,
      targetFocus: "Frenar el olvido de tarjetas vencidas y reparar la premisa más urgente.",
      sourceEngine: "typescript-fallback",
    };
  } else if (budgetMinutes <= 55) {
    const fsrsMins = urgentCardsCount > 0 ? Math.min(15, Math.max(8, urgentCardsCount)) : 8;
    steps.push({
      id: "step_fsrs_med",
      stepType: "fsrs_review",
      title: `Bloque de Consolidación FSRS (${fsrsMins} min)`,
      description: `Limpieza del mazo espaciado para mantener retención > 85% en ${topConcept}.`,
      allocatedMinutes: fsrsMins,
      actionUrl: "/methods",
      actionLabel: "Repasar FSRS",
      badge: "Retención",
    });
    remaining -= fsrsMins;

    const gapMins = Math.min(20, remaining);
    if (primaryGapConceptName) {
      steps.push({
        id: "step_gap_med",
        stepType: "feynman_gap",
        title: `Desarme Conceptual: "${primaryGapConceptName}" (${gapMins} min)`,
        description:
          "Redactar desarrollo formal en palabras propias y cotejar discrepancias contra la fuente oficial.",
        allocatedMinutes: gapMins,
        actionUrl: "/session",
        actionLabel: "Técnica Feynman",
        badge: "Comprensión",
      });
    } else {
      steps.push({
        id: "step_rag_med",
        stepType: "rag_audit",
        title: `Lectura Socrática y Apuntes (${gapMins} min)`,
        description: "Avanzar en el texto de cátedra con extracción de teoremas y cloze directo.",
        allocatedMinutes: gapMins,
        actionUrl: "/workspace",
        actionLabel: "Abrir Cátedra",
        badge: "Teoría",
      });
    }
    remaining -= gapMins;

    if (remaining > 0) {
      steps.push({
        id: "step_exam_med",
        stepType: "exam_simulation",
        title: `Problemas de Aplicación / Simulacro (${remaining} min)`,
        description:
          "Poner a prueba el razonamiento formal en 1 o 2 ejercicios cronometrados sin mirar fórmulas.",
        allocatedMinutes: remaining,
        actionUrl: "/workspace",
        actionLabel: "Ejercitar",
        badge: "Aplicación",
      });
    }

    return {
      totalMinutes: budgetMinutes,
      headline: `Sesión Equilibrada de ${budgetMinutes} min`,
      steps,
      targetFocus: "Equilibrio entre retención espaciada, comprensión formal y resolución práctica.",
      sourceEngine: "typescript-fallback",
    };
  } else {
    const fsrsMins = urgentCardsCount > 0 ? Math.min(20, Math.max(12, urgentCardsCount)) : 12;
    steps.push({
      id: "step_fsrs_long",
      stepType: "fsrs_review",
      title: `Fase 1: Vaciado Integral FSRS (${fsrsMins} min)`,
      description: "Limpieza completa de tarjetas vencidas en todas las cátedras cursadas.",
      allocatedMinutes: fsrsMins,
      actionUrl: "/methods",
      actionLabel: "Repasar FSRS",
      badge: "Memoria",
    });
    remaining -= fsrsMins;

    const gapMins = 25;
    steps.push({
      id: "step_gap_long",
      stepType: "feynman_gap",
      title: `Fase 2: Resolución de Lagunas y Error Bank (${gapMins} min)`,
      description: primaryGapConceptName
        ? `Desarmar "${primaryGapConceptName}" y auditar hipótesis con el Catedrático Socrático.`
        : "Revisión de teoremas troncales y derivaciones algebraicas complejas.",
      allocatedMinutes: gapMins,
      actionUrl: "/session",
      actionLabel: "Abrir Feynman",
      badge: "Rigor Formal",
    });
    remaining -= gapMins;

    const examMins = 30;
    steps.push({
      id: "step_exam_long",
      stepType: "exam_simulation",
      title: `Fase 3: Simulacro Cronometrado en Modo Examen (${examMins} min)`,
      description:
        "Simular condiciones reales de parcial sin pistas, auditar resultado y registrar discrepancias.",
      allocatedMinutes: examMins,
      actionUrl: "/workspace",
      actionLabel: "Simular Parcial",
      badge: "Simulacro",
    });
    remaining -= examMins;

    if (remaining > 0) {
      steps.push({
        id: "step_polish_long",
        stepType: "rag_audit",
        title: `Fase 4: Consolidación y Síntesis en Grafo (${remaining} min)`,
        description: "Vincular los conceptos ejercitados al Grafo Causal y programar la próxima sesión.",
        allocatedMinutes: remaining,
        actionUrl: "/knowledge-graph",
        actionLabel: "Ver Grafo",
        badge: "Transferencia",
      });
    }

    return {
      totalMinutes: budgetMinutes,
      headline: `Bloque Profundo de Estudio (${budgetMinutes} min)`,
      steps,
      targetFocus:
        "Ciclo cognitivo completo: Memoria -> Comprensión profunda -> Simulacro real -> Transferencia en Grafo.",
      sourceEngine: "typescript-fallback",
    };
  }
}
