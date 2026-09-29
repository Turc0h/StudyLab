import { db } from "../../db/db";

export type ExamQuestionType = "multiple_choice" | "essay" | "practical_case";

export interface PastExamQuestion {
  id: string;
  questionText: string;
  topic: string;
  type: ExamQuestionType;
  points: number;
  options?: string[];
  correctAnswer?: number | string; // Index for MCQ or model solution for essay
  rubricCriteria?: string[]; // Checklist for self-evaluation in essays/cases
  modelAnswer?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export type ExamType = "parcial_1" | "parcial_2" | "recuperatorio" | "final";

export interface PastExamPaper {
  id: string;
  title: string;
  subject: string;
  chairOrProfessor: string;
  term: string; // e.g., "1° Cuatrimestre 2024"
  examType: ExamType;
  year: number;
  totalMaxPoints: number;
  passingScore: number;
  timeLimitMinutes: number;
  questions: PastExamQuestion[];
  sourceNotes?: string;
  isCustom?: boolean;
}

export type YieldCategory = "CRITICAL_HIGH_YIELD" | "HIGH_YIELD" | "MEDIUM_YIELD" | "LOW_YIELD";

export interface TopicParetoAnalysis {
  topic: string;
  totalOccurrences: number;
  paperCount: number;
  paperPercentage: number; // e.g. 75 (%)
  totalPointsAssigned: number;
  averagePointsPerAppearance: number;
  yieldCategory: YieldCategory;
  paretoTier: "top_20_percent" | "remaining_80_percent";
}

export interface ParetoSummary {
  totalTopics: number;
  top20PercentCount: number;
  pointsShareTop20: number; // e.g. 78.4 (%)
  highYieldTopics: TopicParetoAnalysis[];
  allRankedTopics: TopicParetoAnalysis[];
}

export interface QuestionAnswerState {
  selectedOption?: number;
  essayText?: string;
  rubricChecks?: boolean[];
  selfAssessedScore?: number;
}

export interface MockExamSubmission {
  examId: string;
  answers: Record<string, QuestionAnswerState>;
  elapsedSeconds: number;
}

export interface TopicScoreBreakdown {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: "mastered" | "needs_review" | "critical_gap";
}

export interface MockExamResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  topicBreakdown: TopicScoreBreakdown[];
  criticalHighYieldMissed: string[];
  feedback: string[];
}

// -----------------------------------------------------------------------------
// PRESET PAST EXAMS DATABASE (Medicina, Derecho, Ingeniería)
// -----------------------------------------------------------------------------

export const PRESET_PAST_EXAMS: PastExamPaper[] = [];

const CUSTOM_EXAMS_STORAGE_KEY = "studylab.custom-past-exams.v1";

/** Recupera los exámenes que el estudiante guardó en este dispositivo. */
export function loadCustomExams(): PastExamPaper[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CUSTOM_EXAMS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((exam): exam is PastExamPaper =>
      Boolean(
        exam &&
        typeof exam === "object" &&
        typeof exam.id === "string" &&
        typeof exam.title === "string" &&
        typeof exam.subject === "string" &&
        Array.isArray(exam.questions),
      ),
    );
  } catch (error) {
    console.error("No se pudieron cargar los exámenes personalizados:", error);
    return [];
  }
}

/** Guarda o reemplaza un examen personalizado en el almacenamiento local. */
export function saveCustomExam(exam: PastExamPaper): void {
  if (typeof window === "undefined") throw new Error("El almacenamiento local no está disponible.");
  const exams = loadCustomExams();
  const next = [...exams.filter((item) => item.id !== exam.id), { ...exam, isCustom: true }];
  window.localStorage.setItem(CUSTOM_EXAMS_STORAGE_KEY, JSON.stringify(next));
}

export function getAllPastExams(customExams?: PastExamPaper[]): PastExamPaper[] {
  const custom = customExams || loadCustomExams();
  return [...PRESET_PAST_EXAMS, ...custom];
}

export function getAvailableSubjects(): string[] {
  const all = getAllPastExams();
  const subjects = new Set<string>();
  all.forEach((e) => subjects.add(e.subject));
  return Array.from(subjects);
}

export function getPastExamsBySubject(subject: string): PastExamPaper[] {
  const all = getAllPastExams();
  return all.filter((e) => e.subject.toLowerCase() === subject.toLowerCase());
}

// -----------------------------------------------------------------------------
// PARETO 80/20 HIGH-YIELD TOPIC FORECASTER ENGINE
// -----------------------------------------------------------------------------

/**
 * Calculates topic recurrence, points weighting, and Pareto 80/20 ranking across a set of exams.
 */
export function calculateParetoTopicAnalysis(exams: PastExamPaper[]): ParetoSummary {
  if (!exams || exams.length === 0) {
    return {
      totalTopics: 0,
      top20PercentCount: 0,
      pointsShareTop20: 0,
      highYieldTopics: [],
      allRankedTopics: [],
    };
  }

  const totalExamsCount = exams.length;
  const topicStatsMap = new Map<
    string,
    {
      occurrences: number;
      paperIds: Set<string>;
      totalPoints: number;
    }
  >();

  for (const exam of exams) {
    for (const q of exam.questions) {
      const topicName = q.topic.trim();
      const existing = topicStatsMap.get(topicName) || {
        occurrences: 0,
        paperIds: new Set<string>(),
        totalPoints: 0,
      };

      existing.occurrences += 1;
      existing.paperIds.add(exam.id);
      existing.totalPoints += q.points;
      topicStatsMap.set(topicName, existing);
    }
  }

  const allTopics: TopicParetoAnalysis[] = [];
  let cumulativePointsAll = 0;

  topicStatsMap.forEach((stats, topic) => {
    cumulativePointsAll += stats.totalPoints;
    const paperCount = stats.paperIds.size;
    const paperPercentage = Math.round((paperCount / totalExamsCount) * 100);

    let yieldCategory: YieldCategory = "LOW_YIELD";
    if (paperPercentage >= 70) {
      yieldCategory = "CRITICAL_HIGH_YIELD";
    } else if (paperPercentage >= 50) {
      yieldCategory = "HIGH_YIELD";
    } else if (paperPercentage >= 25) {
      yieldCategory = "MEDIUM_YIELD";
    }

    allTopics.push({
      topic,
      totalOccurrences: stats.occurrences,
      paperCount,
      paperPercentage,
      totalPointsAssigned: stats.totalPoints,
      averagePointsPerAppearance: Math.round((stats.totalPoints / stats.occurrences) * 10) / 10,
      yieldCategory,
      paretoTier: "remaining_80_percent", // Assigned below after ranking
    });
  });

  // Sort by paperPercentage DESC, then by totalPointsAssigned DESC
  allTopics.sort((a, b) => {
    if (b.paperPercentage !== a.paperPercentage) {
      return b.paperPercentage - a.paperPercentage;
    }
    return b.totalPointsAssigned - a.totalPointsAssigned;
  });

  // Determine top 20% by count (Pareto Cut)
  const top20Count = Math.max(1, Math.round(allTopics.length * 0.2));
  let top20Points = 0;

  for (let i = 0; i < allTopics.length; i++) {
    if (i < top20Count) {
      allTopics[i].paretoTier = "top_20_percent";
      top20Points += allTopics[i].totalPointsAssigned;
    } else {
      allTopics[i].paretoTier = "remaining_80_percent";
    }
  }

  const pointsShareTop20 = cumulativePointsAll > 0
    ? Math.round((top20Points / cumulativePointsAll) * 1000) / 10
    : 0;

  const highYieldTopics = allTopics.filter(
    (t) => t.yieldCategory === "CRITICAL_HIGH_YIELD" || t.yieldCategory === "HIGH_YIELD",
  );

  return {
    totalTopics: allTopics.length,
    top20PercentCount: top20Count,
    pointsShareTop20,
    highYieldTopics,
    allRankedTopics: allTopics,
  };
}

// -----------------------------------------------------------------------------
// COMPOSITE HIGH-YIELD MOCK EXAM GENERATOR
// -----------------------------------------------------------------------------

/**
 * Generates an optimized composite mock exam selecting questions weighted by topic recurrence.
 */
export function generateCompositeHighYieldExam(
  subject: string,
  targetQuestionsCount: number = 4,
): PastExamPaper {
  const subjectExams = getPastExamsBySubject(subject);
  if (subjectExams.length === 0) {
    throw new Error(`No se encontraron parciales anteriores para la materia: ${subject}`);
  }

  const pareto = calculateParetoTopicAnalysis(subjectExams);
  const allQuestions: PastExamQuestion[] = [];
  subjectExams.forEach((e) => allQuestions.push(...e.questions));

  // Score questions by the topic recurrence %
  const scoredQuestions = allQuestions.map((q) => {
    const topicStat = pareto.allRankedTopics.find((t) => t.topic === q.topic);
    const weight = topicStat ? topicStat.paperPercentage : 10;
    return { question: q, weight };
  });

  // Sort by weight descending
  scoredQuestions.sort((a, b) => b.weight - a.weight);

  // Pick unique topics first to avoid duplicates
  const selectedQuestions: PastExamQuestion[] = [];
  const pickedTopics = new Set<string>();

  for (const item of scoredQuestions) {
    if (!pickedTopics.has(item.question.topic) && selectedQuestions.length < targetQuestionsCount) {
      selectedQuestions.push(item.question);
      pickedTopics.add(item.question.topic);
    }
  }

  // If still need more to reach target, fill with highest remaining questions
  if (selectedQuestions.length < targetQuestionsCount) {
    for (const item of scoredQuestions) {
      if (!selectedQuestions.some((q) => q.id === item.question.id) && selectedQuestions.length < targetQuestionsCount) {
        selectedQuestions.push(item.question);
      }
    }
  }

  const totalPoints = selectedQuestions.reduce((acc, q) => acc + q.points, 0);

  return {
    id: `composite_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
    title: `Simulacro Compuesto High-Yield (${pareto.pointsShareTop20}% de Puntos Históricos)`,
    subject,
    chairOrProfessor: subjectExams[0]?.chairOrProfessor || "Cátedra Universitaria",
    term: "Simulacro Adaptativo High-Yield",
    examType: "parcial_1",
    year: new Date().getFullYear(),
    totalMaxPoints: totalPoints,
    passingScore: Math.round(totalPoints * 0.6 * 10) / 10,
    timeLimitMinutes: Math.min(120, selectedQuestions.length * 20),
    questions: selectedQuestions,
    sourceNotes: `Generado automáticamente combinando las preguntas con mayor probabilidad estadística de evaluación según la Ley de Pareto de la cátedra.`,
  };
}

// -----------------------------------------------------------------------------
// MOCK EXAM GRADING & EVALUATION ENGINE
// -----------------------------------------------------------------------------

export function gradeMockExamSubmission(
  exam: PastExamPaper,
  submission: MockExamSubmission,
): MockExamResult {
  let totalScore = 0;
  const topicBreakdownMap = new Map<
    string,
    { score: number; maxScore: number }
  >();

  const criticalHighYieldMissed: string[] = [];
  const feedback: string[] = [];

  for (const q of exam.questions) {
    const ans = submission.answers[q.id];
    let questionScore = 0;

    if (q.type === "multiple_choice") {
      if (ans && ans.selectedOption !== undefined && ans.selectedOption === q.correctAnswer) {
        questionScore = q.points;
      }
    } else {
      // Essay or practical_case
      if (ans) {
        if (ans.selfAssessedScore !== undefined) {
          questionScore = Math.min(q.points, Math.max(0, ans.selfAssessedScore));
        } else if (ans.rubricChecks && q.rubricCriteria && q.rubricCriteria.length > 0) {
          const checkedCount = ans.rubricChecks.filter(Boolean).length;
          const fraction = checkedCount / q.rubricCriteria.length;
          questionScore = Math.round(q.points * fraction * 10) / 10;
        }
      }
    }

    totalScore += questionScore;

    // Track topic performance
    const topicRecord = topicBreakdownMap.get(q.topic) || { score: 0, maxScore: 0 };
    topicRecord.score += questionScore;
    topicRecord.maxScore += q.points;
    topicBreakdownMap.set(q.topic, topicRecord);
  }

  const topicBreakdown: TopicScoreBreakdown[] = [];
  topicBreakdownMap.forEach((rec, topic) => {
    const pct = rec.maxScore > 0 ? Math.round((rec.score / rec.maxScore) * 100) : 0;
    let status: "mastered" | "needs_review" | "critical_gap" = "needs_review";
    if (pct >= 80) {
      status = "mastered";
    } else if (pct < 50) {
      status = "critical_gap";
      criticalHighYieldMissed.push(topic);
    }

    topicBreakdown.push({
      topic,
      score: Math.round(rec.score * 10) / 10,
      maxScore: rec.maxScore,
      percentage: pct,
      status,
    });
  });

  const percentage = exam.totalMaxPoints > 0
    ? Math.round((totalScore / exam.totalMaxPoints) * 100)
    : 0;
  const passed = totalScore >= exam.passingScore;

  if (passed) {
    feedback.push(`¡Aprobado! Obtuviste ${Math.round(totalScore * 10) / 10} / ${exam.totalMaxPoints} puntos (${percentage}%).`);
  } else {
    feedback.push(`Calificación por debajo del umbral de aprobación (${exam.passingScore} pts). Obtuviste ${Math.round(totalScore * 10) / 10} / ${exam.totalMaxPoints} pts.`);
  }

  if (criticalHighYieldMissed.length > 0) {
    feedback.push(
      `Alerta de Cátedra: Detectamos brechas en temas de alta recurrencia histórica: ${criticalHighYieldMissed.join(", ")}. Priorizá estos conceptos con Flashcards FSRS o repasos activos inmediatos.`,
    );
  } else {
    feedback.push("Dominio sólido de los temas centrales del parcial evaluados por la cátedra.");
  }

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore: exam.totalMaxPoints,
    percentage,
    passed,
    topicBreakdown,
    criticalHighYieldMissed,
    feedback,
  };
}

/**
 * Persists a mock exam completion to db.sessions
 */
export async function saveMockExamSession(
  examTitle: string,
  durationSec: number,
  score: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void examTitle;
  void score;
  const recordId = `pastexam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "past-exams",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
