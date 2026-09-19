/**
 * oralDefenseEngine.ts
 *
 * Motor de simulación y evaluación para el Simulador de Coloquios y Exámenes Orales.
 * Permite estructurar exposiciones de cátedra, generar contra-preguntas docentes y
 * computar rúbricas universitarias normalizadas sobre 10 puntos.
 */

import { db } from "../../db/db.ts";

export interface OralRubricScores {
  conceptualMastery: number; // 1 - 5: Dominio conceptual y deducción de principios
  terminologyRigor: number; // 1 - 5: Precisión terminológica y ausencia de muletillas
  timeManagement: number; // 1 - 5: Manejo del tiempo y estructura discursiva
  objectionHandling: number; // 1 - 5: Solvencia ante repreguntas y casos límite
  calmPoise: number; // 1 - 5: Serenidad, manejo de la ansiedad y convicción
}

export interface RubricEvaluationResult {
  finalGrade: number; // 0.0 - 10.0
  status: "reprobado" | "aprobado" | "distinguido" | "sobresaliente";
  statusLabel: string;
  feedbackSummary: string;
}

export interface JuryQuestion {
  id: string;
  role: "titular" | "jtp" | "vocal";
  roleTitle: string;
  question: string;
  intent: "fundamentacion" | "caso_limite" | "discriminacion" | "aplicacion";
  intentLabel: string;
  recommendedTimeSec: number;
}

/**
 * Calcula la nota universitaria final (0.0 a 10.0) a partir de la rúbrica de 5 dimensiones.
 */
export function calculateOralRubricScore(scores: OralRubricScores): RubricEvaluationResult {
  const sum =
    scores.conceptualMastery +
    scores.terminologyRigor +
    scores.timeManagement +
    scores.objectionHandling +
    scores.calmPoise;

  // Escala de 5 a 25 puntos normalizada a base 10
  const finalGrade = Math.round((sum / 25) * 10 * 10) / 10;

  let status: RubricEvaluationResult["status"];
  let statusLabel: string;
  let feedbackSummary: string;

  if (finalGrade < 4.0) {
    status = "reprobado";
    statusLabel = "Insuficiente / A Recuperar";
    feedbackSummary =
      "Faltó solidez en los fundamentos nucleares del tema o se manifestaron bloqueos severos ante las repreguntas. Es indispensable reforzar las deducciones básicas antes de volver a presentarse.";
  } else if (finalGrade < 7.0) {
    status = "aprobado";
    statusLabel = "Aprobado (Regular)";
    feedbackSummary =
      "Exposición aceptable con conocimiento general del tema. Se sugiere enriquecer el vocabulario técnico específico y practicar respuestas a contraejemplos para evitar titubeos.";
  } else if (finalGrade < 9.0) {
    status = "distinguido";
    statusLabel = "Distinguido / Notable";
    feedbackSummary =
      "Muy buen desempeño. Explicación estructurada con solvencia conceptual, buen ritmo discursivo y respuesta adecuada ante las objeciones del tribunal.";
  } else {
    status = "sobresaliente";
    statusLabel = "Sobresaliente con Felicitaciones";
    feedbackSummary =
      "Desempeño magistral. Dominio absoluto de los matices teóricos, ausencia de muletillas, serenidad ejemplar y capacidad de conectar el tema con disciplinas afines.";
  }

  return {
    finalGrade,
    status,
    statusLabel,
    feedbackSummary,
  };
}

/**
 * Genera una batería de preguntas del tribunal examinador basadas en el tema o conceptos.
 */
export function generateJuryQuestions(topic: string, concepts: string[] = [], count = 4): JuryQuestion[] {
  const cleanTopic = topic.trim() || "el tema seleccionado";
  const primaryConcept = concepts[0] || cleanTopic;
  const secondaryConcept = concepts[1] || "las hipótesis de partida";

  const questionTemplates: JuryQuestion[] = [
    {
      id: "q-1",
      role: "titular",
      roleTitle: "Profesor Titular (Cátedra)",
      question: `¿Podría deducir o justificar rigurosamente por qué se cumple ${primaryConcept} sin recurrir a la definición de memoria?`,
      intent: "fundamentacion",
      intentLabel: "Deducción de Principios",
      recommendedTimeSec: 90,
    },
    {
      id: "q-2",
      role: "jtp",
      roleTitle: "Jefe de Trabajos Prácticos",
      question: `En una situación práctica donde no se cumpla la hipótesis de ${secondaryConcept}, ¿qué ocurre con el sistema y cómo se corrige?`,
      intent: "caso_limite",
      intentLabel: "Condiciones de Borde",
      recommendedTimeSec: 90,
    },
    {
      id: "q-3",
      role: "vocal",
      roleTitle: "Vocal del Tribunal",
      question: `Un colega afirma que ${primaryConcept} puede reemplazarse directamente por una aproximación lineal. ¿Qué objeción teórica le plantearía usted?`,
      intent: "discriminacion",
      intentLabel: "Contraste y Falsa Analogía",
      recommendedTimeSec: 75,
    },
    {
      id: "q-4",
      role: "titular",
      roleTitle: "Profesor Titular (Cátedra)",
      question: `Para concluir su defensa: sintetice en dos minutos el impacto que tiene ${cleanTopic} sobre la disciplina general.`,
      intent: "aplicacion",
      intentLabel: "Síntesis Epistemológica",
      recommendedTimeSec: 120,
    },
  ];

  return questionTemplates.slice(0, count);
}

/**
 * Guarda el registro de la sesión de examen oral en la base de datos local.
 */
export async function saveOralSessionRecord(data: {
  topic: string;
  subjectFolderId?: string | null;
  durationSec: number;
  rubric: OralRubricScores;
  finalGrade: number;
  keyNotesCount: number;
}): Promise<string | null> {
  try {
    const sessionId = `oral-session-${Date.now()}`;
    const startedAt = Date.now() - data.durationSec * 1000;

    await db.sessions.add({
      id: sessionId,
      methodId: "oral-defense",
      subjectFolderId: data.subjectFolderId || null,
      startedAt,
      endedAt: Date.now(),
      durationSec: data.durationSec,
    });

    return sessionId;
  } catch {
    return null;
  }
}
