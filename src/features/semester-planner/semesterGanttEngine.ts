import { db } from "../../db/db";

export type AcademicMilestoneType =
  | "Primer Parcial"
  | "Segundo Parcial"
  | "Recuperatorio"
  | "Entrega TP Obligatorio"
  | "Coloquio / Examen Final";

export interface AcademicMilestone {
  id: string;
  subjectName: string;
  subjectColor?: string; // Hex color for Gantt bar (e.g. #3B82F6, #10B981)
  title: string;
  type: AcademicMilestoneType;
  dueDate: number; // Unix timestamp in ms
  estimatedPrepHours: number; // Estimated hours of deep study required
  difficultyLevel: "Media" | "Alta" | "Crítica";
  isCompleted: boolean;
}

export interface OverloadWeekAlert {
  weekNumber: number;
  startDate: number;
  endDate: number;
  milestones: AcademicMilestone[];
  totalRequiredHours: number;
  isOverloaded: boolean; // True if > 2 critical exams or > target capacity (e.g. 24h)
  severity: "Normal" | "Atención" | "Semana de Colapso";
  recommendation: string;
}

export interface WorkloadProjection {
  milestoneId: string;
  subjectName: string;
  title: string;
  daysRemaining: number;
  hoursNeededPerDay: number;
  urgencyStatus: "Holgado" | "Moderado" | "Alerta Cramming" | "Vencido";
}

export interface SemesterPlan {
  id: string;
  title: string;
  career: string;
  semesterName: string;
  startDate: number;
  totalWeeks: number;
  milestones: AcademicMilestone[];
}

const NOW = Date.now();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const PRESET_SEMESTER_PLANS: SemesterPlan[] = [
  {
    id: "plan-engineering-cycle",
    title: "Ciclo Superior de Ingeniería de Software",
    career: "Ingeniería en Sistemas / Software",
    semesterName: "1º Cuatrimestre",
    startDate: NOW - 14 * ONE_DAY_MS, // Started 2 weeks ago
    totalWeeks: 16,
    milestones: [
      {
        id: "m-eng-1",
        subjectName: "Sistemas Distribuidos",
        subjectColor: "#3B82F6",
        title: "Parcial 1: Algoritmos de Consenso (Raft / Paxos)",
        type: "Primer Parcial",
        dueDate: NOW + 12 * ONE_DAY_MS,
        estimatedPrepHours: 20,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
      {
        id: "m-eng-2",
        subjectName: "Bases de Datos Masivas",
        subjectColor: "#10B981",
        title: "Parcial 1: Indexación LSM-Trees y Query Planners",
        type: "Primer Parcial",
        dueDate: NOW + 14 * ONE_DAY_MS, // Only 2 days apart! Coincides in the same week
        estimatedPrepHours: 18,
        difficultyLevel: "Alta",
        isCompleted: false,
      },
      {
        id: "m-eng-3",
        subjectName: "Arquitectura de Software",
        subjectColor: "#8B5CF6",
        title: "Entrega TP: Diseño de Microservicios Resilientes",
        type: "Entrega TP Obligatorio",
        dueDate: NOW + 28 * ONE_DAY_MS,
        estimatedPrepHours: 15,
        difficultyLevel: "Media",
        isCompleted: false,
      },
      {
        id: "m-eng-4",
        subjectName: "Sistemas Distribuidos",
        subjectColor: "#3B82F6",
        title: "Parcial 2: Tolerancia a Fallos y Particiones Bizantinas",
        type: "Segundo Parcial",
        dueDate: NOW + 50 * ONE_DAY_MS,
        estimatedPrepHours: 22,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
      {
        id: "m-eng-5",
        subjectName: "Bases de Datos Masivas",
        subjectColor: "#10B981",
        title: "Examen Final / Coloquio de Promoción",
        type: "Coloquio / Examen Final",
        dueDate: NOW + 65 * ONE_DAY_MS,
        estimatedPrepHours: 25,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
    ],
  },
  {
    id: "plan-medicine-cardio",
    title: "Rotación de Clínica Médica y Cardiología",
    career: "Medicina",
    semesterName: "Ciclo Clínico",
    startDate: NOW - 7 * ONE_DAY_MS,
    totalWeeks: 12,
    milestones: [
      {
        id: "m-med-1",
        subjectName: "Cardiología & ECG",
        subjectColor: "#EF4444",
        title: "Examen Práctico: Trazados ECG y Arritmias",
        type: "Primer Parcial",
        dueDate: NOW + 10 * ONE_DAY_MS,
        estimatedPrepHours: 25,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
      {
        id: "m-med-2",
        subjectName: "Farmacología Clínica",
        subjectColor: "#F59E0B",
        title: "Parcial: Inotrópicos, Betabloqueantes y Antiarrítmicos",
        type: "Primer Parcial",
        dueDate: NOW + 11 * ONE_DAY_MS,
        estimatedPrepHours: 20,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
      {
        id: "m-med-3",
        subjectName: "Neumonología",
        subjectColor: "#06B6D4",
        title: "Entrega de Caso Clínico Hospitalario",
        type: "Entrega TP Obligatorio",
        dueDate: NOW + 24 * ONE_DAY_MS,
        estimatedPrepHours: 12,
        difficultyLevel: "Media",
        isCompleted: false,
      },
    ],
  },
  {
    id: "plan-law-contracts",
    title: "Derecho Civil y Daños Contractuales",
    career: "Derecho",
    semesterName: "Semestre Ordinario",
    startDate: NOW - 21 * ONE_DAY_MS,
    totalWeeks: 16,
    milestones: [
      {
        id: "m-law-1",
        subjectName: "Obligaciones & Contratos",
        subjectColor: "#6366F1",
        title: "Parcial Teórico: Teoría General del Contrato",
        type: "Primer Parcial",
        dueDate: NOW + 18 * ONE_DAY_MS,
        estimatedPrepHours: 22,
        difficultyLevel: "Alta",
        isCompleted: false,
      },
      {
        id: "m-law-2",
        subjectName: "Derecho de Daños",
        subjectColor: "#EC4899",
        title: "Dictamen Escrito: Simulación de Demanda por Daños",
        type: "Entrega TP Obligatorio",
        dueDate: NOW + 32 * ONE_DAY_MS,
        estimatedPrepHours: 16,
        difficultyLevel: "Media",
        isCompleted: false,
      },
      {
        id: "m-law-3",
        subjectName: "Obligaciones & Contratos",
        subjectColor: "#6366F1",
        title: "Coloquio Oral Final de Cátedra",
        type: "Coloquio / Examen Final",
        dueDate: NOW + 60 * ONE_DAY_MS,
        estimatedPrepHours: 30,
        difficultyLevel: "Crítica",
        isCompleted: false,
      },
    ],
  },
];

/**
 * Calculates hours needed per day for each milestone based on current date
 */
export function calculateDailyHoursRequired(
  milestone: AcademicMilestone,
  currentDateMs: number = Date.now(),
): WorkloadProjection {
  const diffMs = milestone.dueDate - currentDateMs;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / ONE_DAY_MS));

  let hoursNeededPerDay = 0;
  let urgencyStatus: WorkloadProjection["urgencyStatus"] = "Holgado";

  if (daysRemaining <= 0) {
    urgencyStatus = "Vencido";
    hoursNeededPerDay = milestone.estimatedPrepHours;
  } else {
    hoursNeededPerDay = Math.round((milestone.estimatedPrepHours / daysRemaining) * 10) / 10;

    if (daysRemaining <= 7) {
      urgencyStatus = "Alerta Cramming";
    } else if (hoursNeededPerDay >= 2.5) {
      urgencyStatus = "Moderado";
    } else {
      urgencyStatus = "Holgado";
    }
  }

  return {
    milestoneId: milestone.id,
    subjectName: milestone.subjectName,
    title: milestone.title,
    daysRemaining,
    hoursNeededPerDay,
    urgencyStatus,
  };
}

/**
 * Detects overloaded weeks where exams coincide within short windows (< 72 hours)
 * or total weekly preparation hours exceed target capacity (e.g. 25h/week)
 */
export function detectSemesterOverloads(
  milestones: AcademicMilestone[],
  semesterStartDate: number = NOW,
  totalWeeks: number = 16,
  targetWeeklyCapacityHours: number = 24,
): OverloadWeekAlert[] {
  const result: OverloadWeekAlert[] = [];
  const activeMilestones = milestones.filter((m) => !m.isCompleted);

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStart = semesterStartDate + (w - 1) * 7 * ONE_DAY_MS;
    const weekEnd = weekStart + 7 * ONE_DAY_MS;

    const milestonesInWeek = activeMilestones.filter(
      (m) => m.dueDate >= weekStart && m.dueDate < weekEnd,
    );

    const totalRequiredHours = milestonesInWeek.reduce(
      (acc, m) => acc + m.estimatedPrepHours,
      0,
    );

    const examCount = milestonesInWeek.filter((m) =>
      m.type.includes("Parcial") || m.type.includes("Final") || m.type.includes("Recuperatorio"),
    ).length;

    let isOverloaded = false;
    let severity: OverloadWeekAlert["severity"] = "Normal";
    let recommendation = "Carga académica distribuida de forma equilibrada.";

    if (examCount >= 2 || totalRequiredHours > targetWeeklyCapacityHours * 1.25) {
      isOverloaded = true;
      severity = "Semana de Colapso";
      recommendation = `¡Alerta! Coinciden ${examCount} evaluaciones mayores con ${totalRequiredHours}h de demanda. Adelantar estudio con 2 semanas de anticipación o activar Cram Mode.`;
    } else if (examCount === 1 || totalRequiredHours > targetWeeklyCapacityHours * 0.8) {
      severity = "Atención";
      recommendation = `Examen o entrega relevante (${totalRequiredHours}h estimadas). Mantener ritmo constante de 2.5h diarias.`;
    }

    result.push({
      weekNumber: w,
      startDate: weekStart,
      endDate: weekEnd,
      milestones: milestonesInWeek,
      totalRequiredHours,
      isOverloaded,
      severity,
      recommendation,
    });
  }

  return result;
}

/**
 * Synchronizes milestone with Dexie deadlines table
 */
export async function syncMilestoneWithDeadlines(milestone: AcademicMilestone): Promise<string> {
  const deadlineId = `gantt_${milestone.id}`;
  
  await db.deadlines.put({
    id: deadlineId,
    title: `[${milestone.subjectName}] ${milestone.title}`,
    dueDate: milestone.dueDate,
    subjectFolderId: null,
    source: "manual",
  });

  return deadlineId;
}

/**
 * Persists a milestone study session into db.sessions
 */
export async function saveSemesterGanttSessionRecord(
  planTitle: string,
  durationSec: number = 300,
): Promise<string> {
  void planTitle;
  const recordId = `gantt_session_${Date.now()}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "semester-gantt",
    subjectFolderId: null,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
