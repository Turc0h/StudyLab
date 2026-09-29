import { db } from "../../db/db";
import {
  checkOllamaStatus,
  generateOllamaStream,
  chatOllamaStream,
  getStoredOllamaConfig,
  type ChatMessage,
  type OllamaStatus,
} from "../../platform/ai/ollamaClient";

export type AiStudyMode =
  | "socratic_tutor"
  | "exam_question_generator"
  | "rubric_evaluator"
  | "flashcard_generator";

export interface AiRecommendedModel {
  name: string;
  sizeDesc: string;
  recommendedFor: string;
  parameterSize: string;
}

export const RECOMMENDED_LOCAL_MODELS: AiRecommendedModel[] = [
  {
    name: "llama3.2",
    sizeDesc: "2.0 GB (3B) / 1.3 GB (1B)",
    recommendedFor: "Ideal para laptops estándar. Extremadamente veloz y bajo consumo de RAM.",
    parameterSize: "3B",
  },
  {
    name: "mistral",
    sizeDesc: "4.1 GB (7B)",
    recommendedFor: "Excelente razonamiento conceptual en español y argumentación jurídica/clínica.",
    parameterSize: "7B",
  },
  {
    name: "gemma2",
    sizeDesc: "5.4 GB (9B) / 1.6 GB (2B)",
    recommendedFor: "Alta precisión enciclopédica, definiciones rigurosas y síntesis de papers.",
    parameterSize: "9B",
  },
  {
    name: "qwen2.5",
    sizeDesc: "4.5 GB (7B)",
    recommendedFor: "Lógica formal, demostraciones matemáticas, código y algoritmos distribuidos.",
    parameterSize: "7B",
  },
];

// -----------------------------------------------------------------------------
// PROMPT BUILDERS
// -----------------------------------------------------------------------------

export function buildSystemPromptForMode(mode: AiStudyMode): string {
  switch (mode) {
    case "socratic_tutor":
      return `Sos un Tutor Socrático Universitario riguroso. Tu objetivo pedagógico es ayudar al estudiante a razonar por sí mismo.
REGLA DE ORO: NUNCA des la respuesta directa ni resuelvas el ejercicio de entrada.
1. Analizá lo que plantea el estudiante.
2. Identificá qué premisa o concepto falta.
3. Planteá una pregunta guía socrática o una pista que lo oriente a descubrir la solución.
4. Mantené un tono académico, motivador y preciso en español.`;

    case "exam_question_generator":
      return `Sos un Docente Universitario titular de cátedra experto en evaluación cognitiva y Active Recall.
A partir del texto o tema que te proporcione el estudiante:
1. Generá 3 preguntas de nivel de examen parcial universitario.
2. Una debe ser de Opción Múltiple (con 4 opciones y la justificación de la correcta).
3. Una debe ser de Desarrollo Conceptual (explicación de mecanismo o doctrina).
4. Una debe ser un Caso Práctico o Viñeta de aplicación real.
Formateá de manera clara y profesional con etiquetas Markdown.`;

    case "rubric_evaluator":
      return `Sos un Evaluador Académico y Jefe de Trabajos Prácticos.
El estudiante te presentará una consigna y su respuesta de examen.
Debes:
1. Otorgar un puntaje orientativo de 0 a 10 puntos.
2. Destacar los aciertos conceptuales y terminología técnica bien empleada.
3. Señalar con precisión qué omisiones, errores doctrinarios o imprecisiones hubo.
4. Proveer la respuesta modelo sintética con la que la cátedra otorgaría el 10/10.`;

    case "flashcard_generator":
      return `Sos un Especialista en Repetición Espaciada (FSRS/Anki) y Evocación Activa.
A partir del material de estudio suministrado:
1. Extraé entre 3 y 5 flashcards de alta densidad cognitiva.
2. Evitá tarjetas genéricas o superficiales; enfocá en contrastes, fórmulas, mecanismos y distinciones críticas.
3. Formato obligatorio por tarjeta:
   Q: [Pregunta de evocación directa]
   A: [Respuesta concreta, atómica y precisa]`;

    default:
      return "Sos un asistente de estudio universitario de alto rendimiento pedagógico.";
  }
}

// -----------------------------------------------------------------------------
// Offline fallback: extractive prompts only, no fabricated grades or facts.
// -----------------------------------------------------------------------------

export function generateOfflineResponse(
  mode: AiStudyMode,
  userInput: string,
  contextNotes = "",
): string {
  const source = (contextNotes.trim() || userInput.trim()).replace(/[ \t]+/g, " ");

  if (mode === "exam_question_generator" || mode === "flashcard_generator") {
    const cards = generateExtractiveQuestions(source);
    if (cards.length === 0) {
      return "No pude crear preguntas fiables con este texto. Pegá apuntes con definiciones o explicaciones completas; no voy a inventar respuestas cuando el material no las contiene.";
    }
    const heading = mode === "exam_question_generator" ? "Autoevaluación a partir de tus apuntes" : "Tarjetas de repaso a partir de tus apuntes";
    const items = cards.map((card, index) =>
      (index + 1) + ". Pregunta: " + card.question + "\n   Respuesta de referencia: " + card.answer,
    );
    return heading + "\n\n" + items.join("\n\n") + "\n\nPráctica: intentá responder sin mirar y después compará con la respuesta de referencia. Esto no asigna una nota ni reemplaza la revisión del material.";
  }

  switch (mode) {
    case "socratic_tutor":
      return "Modo sin modelo de lenguaje. Para no inventar contenido, baso la guía en lo que escribiste:\n\n" +
        (source
          ? "¿Cómo explicarías la idea principal de este planteo con tus propias palabras?\n\n¿Qué parte de tu respuesta podrías justificar directamente con el material disponible?"
          : "Escribí una duda concreta o pegá apuntes para recibir una pregunta basada en ellos.");
    case "rubric_evaluator":
      return "La evaluación con nota requiere un modelo de lenguaje. El modo offline no puede juzgar la calidad conceptual de una respuesta y no va a mostrar una calificación inventada. Compará tu respuesta con los apuntes y marcá qué conceptos o relaciones te faltaron.";
    default:
      return "Esta función requiere un modelo de lenguaje disponible. Iniciá Ollama y volvé a intentarlo.";
  }
}

export interface ExtractiveQuestion {
  question: string;
  answer: string;
}

/** Crea preguntas conservadoras cuyas respuestas salen de los apuntes. */
export function generateExtractiveQuestions(material: string, limit = 5): ExtractiveQuestion[] {
  const sentences = material
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.replace(/^[-*#\d.)\s]+/, "").trim())
    .filter((part) => part.length >= 35 && part.length <= 500);
  const questions: ExtractiveQuestion[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    let question: string;
    let answer = sentence;
    const definition = sentence.match(/^(.{2,100}?)\s+(?:se define como|se entiende como|consiste en|significa)\s+(.+)$/i);
    const causal = sentence.match(/^(.{4,180}?)\s+(?:porque|ya que|debido a que)\s+(.+)$/i);

    if (definition) {
      question = "¿En qué consiste " + definition[1].trim() + "?";
      answer = definition[2].trim();
    } else if (causal) {
      question = "¿Por qué " + causal[1].trim() + "?";
      answer = causal[2].trim().replace(/[.!?]$/, "");
    } else {
      const words = sentence.split(/\s+/);
      question = "Explicá esta idea sin mirar los apuntes: “" + words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "") + "”";
    }

    const key = question.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({ question, answer });
    if (questions.length >= limit) break;
  }

  return questions;
}
// UNIFIED QUERY EXECUTOR (Con streaming y fallback offline)
// -----------------------------------------------------------------------------

export interface AcademicQueryOptions {
  mode: AiStudyMode;
  prompt: string;
  contextNotes?: string;
  history?: ChatMessage[];
  onChunk?: (token: string, accumulated: string) => void;
}

export interface AcademicQueryResult {
  text: string;
  isOfflineFallback: boolean;
  offlineQuestions?: ExtractiveQuestion[];
  modelUsed: string;
  durationMs: number;
}

export async function executeAcademicQuery(
  options: AcademicQueryOptions,
): Promise<AcademicQueryResult> {
  const startTime = Date.now();
  const config = getStoredOllamaConfig();

  // 1. Verificar estado de Ollama
  let status: OllamaStatus;
  try {
    status = await checkOllamaStatus(config.host);
  } catch {
    status = { isRunning: false, host: config.host, models: [] };
  }

  // 2. Sin Ollama, usar preguntas extractivas o explicar las limitaciones del modo offline.
  if (!status.isRunning || status.models.length === 0) {
    const offlineText = generateOfflineResponse(options.mode, options.prompt, options.contextNotes);
    options.onChunk?.(offlineText, offlineText);
    const source = options.contextNotes?.trim() || options.prompt;
    const offlineQuestions = options.mode === "exam_question_generator" || options.mode === "flashcard_generator"
      ? generateExtractiveQuestions(source)
      : undefined;

    return {
      text: offlineText,
      isOfflineFallback: true,
      offlineQuestions,
      modelUsed: "Herramienta offline basada en apuntes",
      durationMs: Date.now() - startTime,
    };
  }

  // 3. Determinar el mejor modelo disponible
  let targetModel = config.preferredModel;
  const hasPreferred = status.models.some(
    (m) => m.name === targetModel || m.name.startsWith(targetModel),
  );
  if (!hasPreferred && status.models.length > 0) {
    targetModel = status.models[0].name;
  }

  // 4. Construir mensajes / prompt
  const systemPrompt = buildSystemPromptForMode(options.mode);
  let finalPrompt = options.prompt;
  if (options.contextNotes && options.contextNotes.trim().length > 0) {
    finalPrompt = `[MATERIAL DE ESTUDIO DE REFERENCIA]:\n${options.contextNotes}\n\n[CONSIGNA O DUDA DEL ESTUDIANTE]:\n${options.prompt}`;
  }

  try {
    let resultText = "";

    if (options.history && options.history.length > 0) {
      const chatMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...options.history,
        { role: "user", content: finalPrompt },
      ];

      resultText = await chatOllamaStream(chatMessages, {
        host: config.host,
        model: targetModel,
        temperature: config.temperature,
        onChunk: options.onChunk,
      });
    } else {
      resultText = await generateOllamaStream(finalPrompt, {
        host: config.host,
        model: targetModel,
        systemPrompt,
        temperature: config.temperature,
        onChunk: options.onChunk,
      });
    }

    return {
      text: resultText,
      isOfflineFallback: false,
      modelUsed: targetModel,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    // Fallback de contingencia si falla la llamada
    const fallbackText = generateOfflineResponse(options.mode, options.prompt, options.contextNotes);
    options.onChunk?.(fallbackText, fallbackText);
    const source = options.contextNotes?.trim() || options.prompt;
    const offlineQuestions = options.mode === "exam_question_generator" || options.mode === "flashcard_generator"
      ? generateExtractiveQuestions(source)
      : undefined;

    return {
      text: fallbackText,
      isOfflineFallback: true,
      offlineQuestions,
      modelUsed: `Fallback (${err.message || "error de comunicación"})`,
      durationMs: Date.now() - startTime,
    };
  }
}

// -----------------------------------------------------------------------------
// HISTORIAL & REGISTRO EN DB
// -----------------------------------------------------------------------------

export async function saveAiStudySessionRecord(
  topic: string,
  durationSec: number,
  mode: AiStudyMode,
  subjectFolderId: string | null = null,
): Promise<string> {
  void topic;
  void mode;
  const recordId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "local-ai",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
