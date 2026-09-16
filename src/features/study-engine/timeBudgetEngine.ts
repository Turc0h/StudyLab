import { generateDailyStudyAgenda } from "./recommendationEngine";
import type { DailyStudyAgenda } from "./types";

export interface TimeBudgetStep {
  id: string;
  type: "fsrs_review" | "feynman_gap" | "rag_audit" | "exam_simulation";
  title: string;
  description: string;
  allocatedMinutes: number;
  actionUrl: string;
  actionLabel: string;
  badge: string;
}

export interface TimeBudgetPlan {
  totalMinutes: number;
  headline: string;
  steps: TimeBudgetStep[];
  targetFocus: string;
}

/**
 * Calcula una secuencia pedagógica óptima ajustada con precisión
 * al presupuesto de tiempo disponible del estudiante (20, 45, 90 min o personalizado).
 */
export async function calculateTimeBudgetPlan(
  budgetMinutes: number,
  preloadedAgenda?: DailyStudyAgenda
): Promise<TimeBudgetPlan> {
  const agenda = preloadedAgenda || (await generateDailyStudyAgenda());
  const steps: TimeBudgetStep[] = [];
  let remainingTime = budgetMinutes;

  const urgentCardsCount = agenda.urgentReviews.cardCount;
  const topConceptName = agenda.urgentReviews.topConceptNames[0] || "temas troncales";
  const primaryGap = agenda.conceptualGaps[0];

  // 1. PRESUPUESTO CORTO: 20 MINUTOS (Micro-bloque urgente)
  if (budgetMinutes <= 25) {
    if (urgentCardsCount > 0) {
      const fsrsMins = Math.min(remainingTime, Math.max(5, Math.min(10, urgentCardsCount)));
      steps.push({
        id: "step_fsrs_short",
        type: "fsrs_review",
        title: `Repaso Relámpago FSRS (${fsrsMins} min)`,
        description: `Consolidar las ${Math.min(fsrsMins * 2, urgentCardsCount)} tarjetas más críticas de ${topConceptName} antes de que caiga la curva de olvido.`,
        allocatedMinutes: fsrsMins,
        actionUrl: "/methods",
        actionLabel: "Iniciar Repaso",
        badge: "Memoria",
      });
      remainingTime -= fsrsMins;
    }

    if (remainingTime >= 8 && primaryGap) {
      steps.push({
        id: "step_gap_short",
        type: "feynman_gap",
        title: `Desarmar "${primaryGap.conceptName}" (${remainingTime} min)`,
        description: `Explicación sintética de 1 carilla en técnica Feynman para resolver la premisa errónea registrada en el Error Bank.`,
        allocatedMinutes: remainingTime,
        actionUrl: "/session",
        actionLabel: "Abrir Feynman",
        badge: "Laguna Crítica",
      });
      remainingTime = 0;
    } else if (remainingTime > 0) {
      // Si no hay lagunas críticas o sobró tiempo, agregar lectura o flashcards
      steps.push({
        id: "step_rag_short",
        type: "rag_audit",
        title: `Auditoría RAG Exprés (${remainingTime} min)`,
        description: `Lectura activa de 2 páginas de apuntes en el visor con Catedrático Socrático.`,
        allocatedMinutes: remainingTime,
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
    };
  }

  // 2. PRESUPUESTO MEDIO: 45 MINUTOS (Bloque estándar universitario)
  if (budgetMinutes <= 55) {
    // 10 a 15 min FSRS
    const fsrsMins = urgentCardsCount > 0 ? Math.min(15, Math.max(8, urgentCardsCount)) : 8;
    steps.push({
      id: "step_fsrs_med",
      type: "fsrs_review",
      title: `Bloque de Consolidación FSRS (${fsrsMins} min)`,
      description: `Limpieza del mazo espaciado para mantener retención > 85% en ${topConceptName}.`,
      allocatedMinutes: fsrsMins,
      actionUrl: "/methods",
      actionLabel: "Repasar FSRS",
      badge: "Retención",
    });
    remainingTime -= fsrsMins;

    // 20 min Feynman / Error Bank
    const gapMins = Math.min(20, remainingTime);
    if (primaryGap) {
      steps.push({
        id: "step_gap_med",
        type: "feynman_gap",
        title: `Desarme Conceptual: "${primaryGap.conceptName}" (${gapMins} min)`,
        description: `Redactar desarrollo formal en palabras propias y cotejar discrepancias contra la fuente oficial.`,
        allocatedMinutes: gapMins,
        actionUrl: "/session",
        actionLabel: "Técnica Feynman",
        badge: "Comprensión",
      });
    } else {
      steps.push({
        id: "step_rag_med",
        type: "rag_audit",
        title: `Lectura Socrática y Apuntes (${gapMins} min)`,
        description: `Avanzar en el texto de cátedra con extracción de teoremas y cloze directo.`,
        allocatedMinutes: gapMins,
        actionUrl: "/workspace",
        actionLabel: "Abrir Cátedra",
        badge: "Teoría",
      });
    }
    remainingTime -= gapMins;

    // Remanente: Práctica de ejercicios o simulacro
    if (remainingTime > 0) {
      steps.push({
        id: "step_exam_med",
        type: "exam_simulation",
        title: `Problemas de Aplicación / Simulacro (${remainingTime} min)`,
        description: `Poner a prueba el razonamiento formal en 1 o 2 ejercicios cronometrados sin mirar fórmulas.`,
        allocatedMinutes: remainingTime,
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
    };
  }

  // 3. PRESUPUESTO LARGO: 90 MINUTOS (Sesión profunda pre-parcial)
  const fsrsMins = urgentCardsCount > 0 ? Math.min(20, Math.max(12, urgentCardsCount)) : 12;
  steps.push({
    id: "step_fsrs_long",
    type: "fsrs_review",
    title: `Fase 1: Vaciado Integral FSRS (${fsrsMins} min)`,
    description: `Limpieza completa de tarjetas vencidas en todas las cátedras cursadas.`,
    allocatedMinutes: fsrsMins,
    actionUrl: "/methods",
    actionLabel: "Repasar FSRS",
    badge: "Memoria",
  });
  remainingTime -= fsrsMins;

  const gapMins = 25;
  steps.push({
    id: "step_gap_long",
    type: "feynman_gap",
    title: `Fase 2: Resolución de Lagunas y Error Bank (${gapMins} min)`,
    description: primaryGap
      ? `Desarmar "${primaryGap.conceptName}" y auditar hipótesis con el Catedrático Socrático.`
      : `Revisión de teoremas troncales y derivaciones algebraicas complejas.`,
    allocatedMinutes: gapMins,
    actionUrl: "/session",
    actionLabel: "Abrir Feynman",
    badge: "Rigor Formal",
  });
  remainingTime -= gapMins;

  const examMins = 30;
  steps.push({
    id: "step_exam_long",
    type: "exam_simulation",
    title: `Fase 3: Simulacro Cronometrado en Modo Examen (${examMins} min)`,
    description: `Simular condiciones reales de parcial sin pistas, auditar resultado y registrar discrepancias.`,
    allocatedMinutes: examMins,
    actionUrl: "/workspace",
    actionLabel: "Simular Parcial",
    badge: "Simulacro",
  });
  remainingTime -= examMins;

  if (remainingTime > 0) {
    steps.push({
      id: "step_polish_long",
      type: "rag_audit",
      title: `Fase 4: Consolidación y Síntesis en Grafo (${remainingTime} min)`,
      description: `Vincular los conceptos ejercitados al Grafo Causal y programar la próxima sesión.`,
      allocatedMinutes: remainingTime,
      actionUrl: "/knowledge-graph",
      actionLabel: "Ver Grafo",
      badge: "Transferencia",
    });
  }

  return {
    totalMinutes: budgetMinutes,
    headline: `Bloque Profundo de Estudio (${budgetMinutes} min)`,
    steps,
    targetFocus: "Ciclo cognitivo completo: Memoria -> Comprensión profunda -> Simulacro real -> Transferencia en Grafo.",
  };
}
