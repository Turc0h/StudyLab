import { db, type ExamPlanRecord, type ExamPhaseMilestone } from "../../db/db";

/**
 * Planificador Inverso de Exámenes: parte de la fecha del examen hacia atrás
 * calculando la cadencia óptima de estudio y los hitos metodológicos.
 */
export async function createReverseExamPlan(params: {
  subjectId: string;
  subjectName: string;
  examDate: number;
  availableMinutesPerDay?: number;
}): Promise<ExamPlanRecord> {
  const { subjectId, subjectName, examDate, availableMinutesPerDay = 90 } = params;
  const now = Date.now();
  const totalDays = Math.max(1, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));

  // Distribución canónica de fases de preparación universitaria:
  // 1. Diagnóstico e Ingesta (30%)
  // 2. Resolución Profunda y Errores (40%)
  // 3. Simulacros de Examen Cronometrados (20%)
  // 4. Consolidación de Alta Estabilidad FSRS (10%)
  const d1 = Math.max(1, Math.round(totalDays * 0.3));
  const d2 = Math.max(1, Math.round(totalDays * 0.4));
  const d3 = Math.max(1, Math.round(totalDays * 0.2));
  const d4 = Math.max(1, totalDays - (d1 + d2 + d3));

  let offset = 0;
  const phases: ExamPhaseMilestone[] = [
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

  // Marcar completitud inicial según el día actual
  const currentElapsedDays = 0;
  for (const p of phases) {
    if (currentElapsedDays > p.endDayOffset) {
      p.completed = true;
    }
  }

  // Eliminar planes anteriores activos para la misma materia
  const existing = await db.examPlans.where("subjectId").equals(subjectId).toArray();
  for (const ex of existing) {
    await db.examPlans.delete(ex.id);
  }

  const newPlan: ExamPlanRecord = {
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subjectId,
    subjectName,
    examDate,
    availableMinutesPerDay,
    status: "active",
    createdAt: now,
    phases,
  };

  await db.examPlans.put(newPlan);
  return newPlan;
}

/**
 * Obtiene el plan de examen activo para una materia.
 */
export async function getActiveExamPlan(subjectId: string): Promise<ExamPlanRecord | undefined> {
  return await db.examPlans
    .where("subjectId")
    .equals(subjectId)
    .filter((p) => p.status === "active")
    .first();
}

/**
 * Lista todos los planes de examen activos.
 */
export async function getAllActiveExamPlans(): Promise<ExamPlanRecord[]> {
  return await db.examPlans.filter((p) => p.status === "active").toArray();
}
