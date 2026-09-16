import { db } from "../../db/db";
import { detectActiveWeaknesses } from "./weaknessDetector";
import { getAllActiveExamPlans } from "./examPlanner";
import type { DailyStudyAgenda, ConceptualGapItem, BottleneckPrerequisiteItem, UrgentReviewsSummary } from "./types";

/**
 * Motor central de recomendaciones de CognitiveOS:
 * Responde a la pregunta fundamental: "¿Qué debería estudiar hoy y por qué?"
 */
export async function generateDailyStudyAgenda(): Promise<DailyStudyAgenda> {
  const now = Date.now();
  const todayStr = new Date(now).toISOString().split("T")[0];

  const concepts = await db.concepts.toArray();
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // 1. Calcular Repasos Urgentes FSRS
  const cards = await db.cardsFsrs.toArray();
  const dueCards = cards.filter((c) => c.dueDate <= now);
  const urgentConceptCounts = new Map<string, number>();

  for (const c of dueCards) {
    if (c.conceptId) {
      urgentConceptCounts.set(c.conceptId, (urgentConceptCounts.get(c.conceptId) || 0) + 1);
    }
  }

  // Identificar los 3 conceptos con más tarjetas vencidas
  const topConceptIds = Array.from(urgentConceptCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const topConceptNames = topConceptIds.map((id) => conceptMap.get(id)?.name || id);

  // Estimación de tiempo: 1 minuto por tarjeta de repaso
  const urgentMinutes = Math.ceil(dueCards.length * 1.0);

  const urgentReviews: UrgentReviewsSummary = {
    cardCount: dueCards.length,
    estimatedMinutes: urgentMinutes,
    conceptIds: topConceptIds,
    topConceptNames,
  };

  // 2. Detectar debilidades activas
  const weaknesses = await detectActiveWeaknesses();

  // 3. Extraer Lagunas Conceptuales Críticas (omisiones, malentendidos, baja comprensión)
  const conceptualGaps: ConceptualGapItem[] = [];
  const gapSignals = weaknesses.filter(
    (w) => w.type === "persistent_misconception" || w.type === "retention_decay"
  );

  for (const sig of gapSignals.slice(0, 3)) {
    const isMisconception = sig.type === "persistent_misconception";
    conceptualGaps.push({
      conceptId: sig.conceptId,
      conceptName: sig.conceptName,
      reason: sig.explanation,
      suggestedAction: isMisconception ? "feynman" : "socratic_audit",
      estimatedMinutes: isMisconception ? 20 : 15,
    });
  }

  // 4. Identificar Cuellos de Botella en Prerrequisitos
  const bottleneckPrerequisites: BottleneckPrerequisiteItem[] = [];
  const bottleneckSignals = weaknesses.filter((w) => w.type === "prerequisite_bottleneck");

  for (const bSig of bottleneckSignals.slice(0, 2)) {
    const edges = await db.conceptEdges
      .where("sourceConceptId")
      .equals(bSig.conceptId)
      .and((e) => e.type === "prerequisite")
      .toArray();

    const blockedNames = edges
      .map((e) => conceptMap.get(e.targetConceptId)?.name || e.targetConceptId)
      .slice(0, 3);

    bottleneckPrerequisites.push({
      conceptId: bSig.conceptId,
      conceptName: bSig.conceptName,
      blockedDownstreamCount: edges.length,
      blockedConceptNames: blockedNames,
      estimatedMinutes: 25,
    });
  }

  // 5. Exámenes Activos y Próximos
  const examPlans = await getAllActiveExamPlans();
  const examAlerts = examPlans.map((plan) => {
    const daysRemaining = Math.max(0, Math.ceil((plan.examDate - now) / (1000 * 60 * 60 * 24)));
    const activePhase = plan.phases.find((p) => !p.completed) || plan.phases[plan.phases.length - 1];
    return {
      subjectName: plan.subjectName,
      daysRemaining,
      currentPhase: activePhase?.name || "Preparación general",
      recommendedFocus: activePhase?.targetMilestone || "Simulacros de práctica",
    };
  });

  // 6. Cálculo de Deuda Cognitiva de Estudio en Minutos
  const gapMinutes = conceptualGaps.reduce((acc, g) => acc + g.estimatedMinutes, 0);
  const bottleneckMinutes = bottleneckPrerequisites.reduce((acc, b) => acc + b.estimatedMinutes, 0);
  const totalDebtMinutes = urgentMinutes + gapMinutes + bottleneckMinutes;

  // 7. Síntesis Argumentativa (¿Qué debería estudiar hoy y por qué?)
  let headline = "¿Qué debería estudiar hoy y por qué?";
  let rationale = "";

  if (dueCards.length > 0 && conceptualGaps.length > 0) {
    headline = `Repasar ${dueCards.length} tarjeta(s) vencidas y desarmar la laguna en "${conceptualGaps[0].conceptName}"`;
    rationale = `Tu curva de retención FSRS indica riesgo de olvido inminente en ${topConceptNames.join(", ") || "temas troncales"} (${urgentMinutes} min). Además, registraste errores reiterados en "${conceptualGaps[0].conceptName}" que requieren una explicación Feynman breve (${conceptualGaps[0].estimatedMinutes} min). Deuda total acumulada: ${totalDebtMinutes} min.`;
  } else if (dueCards.length > 0) {
    headline = `Consolidar memoria: ${dueCards.length} tarjeta(s) espaciadas pendientes`;
    rationale = `No presentas lagunas conceptuales críticas abiertas. Dedica ${urgentMinutes} minutos a limpiar el mazo para preservar la estabilidad de memoria a largo plazo.`;
  } else if (bottleneckPrerequisites.length > 0) {
    headline = `Desbloquear cuello de botella: "${bottleneckPrerequisites[0].conceptName}"`;
    rationale = `Este concepto fundacional tiene dominio bajo y está frenando tu comprensión de ${bottleneckPrerequisites[0].blockedConceptNames.join(", ")}. Dedica 25 minutos a auditar sus teoremas en el RAG.`;
  } else if (concepts.length > 0) {
    headline = `Todo al día. Momento ideal para avanzar materia o simular un examen`;
    rationale = `Tu retención se encuentra en zona segura (>85%) y no hay deudas de estudio urgentes. Puedes avanzar con nuevas lecturas o poner a prueba tu dominio con un simulacro exprés.`;
  } else {
    headline = `Carga tus primeros apuntes de cátedra en el visor`;
    rationale = `El Cognitive OS necesita material bibliográfico para indexar conceptos, extraer teoremas y comenzar a calcular tu mapa de dominio 4D.`;
  }

  return {
    targetDate: todayStr,
    headline,
    rationale,
    totalDebtMinutes,
    urgentReviews,
    conceptualGaps,
    bottleneckPrerequisites,
    examAlerts,
    generatedAt: now,
  };
}
