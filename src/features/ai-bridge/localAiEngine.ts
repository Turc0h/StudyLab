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
// DETERMINISTIC OFFLINE SIMULATION FALLBACK (Cero Bloqueos si Ollama no corre)
// -----------------------------------------------------------------------------

export function generateOfflineDeterministicResponse(
  mode: AiStudyMode,
  userInput: string,
): string {
  switch (mode) {
    case "socratic_tutor":
      return `[Modo Simulación Académica Local - Ollama Offline]

Analizando tu planteo sobre: "${userInput.slice(0, 80)}..."

💡 **Pregunta Socrática Guía:**
¿Qué principio fisiopatológico o dogmático fundamental entra en juego en esta situación? 
Antes de concluir sobre el resultado final, intentá descomponer el problema:
1. ¿Cuáles son las variables o presupuestos iniciales que no podés alterar?
2. Si aplicás la regla general, ¿qué efecto colateral o excepción prevista por la cátedra se manifestaría?

*Intenta responder esta premisa y continuamos construyendo la demostración paso a paso.*`;

    case "exam_question_generator":
      return `[Modo Simulación Académica Local - Ollama Offline]

Generación de Preguntas de Examen basadas en tu material:

### 1. Opción Múltiple (Active Recall Directo)
**Pregunta:** Respecto a los mecanismos centrales de ${userInput.slice(0, 50)}..., ¿cuál es el postulado con mayor consenso bibliográfico?
- A) Se produce una compensación refleja sin modificación del gasto metabólico.
- B) Constituye la vía primaria priorizada en guías internacionales por su beneficio pronóstico. [CORRECTA]
- C) Queda contraindicado en todos los casos por toxicidad sinérgica acumulativa.
- D) Opera exclusivamente como mecanismo secundario sin respaldo empírico.
*Justificación:* La opción B sintetiza la conducta de primera línea establecida por la cátedra.

### 2. Pregunta de Desarrollo Conceptual
**Consigna:** Explique la relación de causalidad y diferencie el efecto inmediato del efecto diferido a mediano plazo en este escenario.

### 3. Caso Práctico / Viñeta de Aplicación
**Consigna:** Se presenta un caso donde las condiciones iniciales varían en un 30%. Formule el dictamen resolutivo justificando en base a la normativa o algoritmo clínico correspondiente.`;

    case "rubric_evaluator":
      return `[Modo Simulación Académica Local - Evaluador de Cátedra]

Evaluación diagnóstica de tu respuesta:
- **Calificación Estimada:** 8.5 / 10 (Aprobado Destacado)

✅ **Fortalezas Conceptuales:**
- Uso adecuado del vocabulario técnico de la materia.
- Comprensión clara del nudo problemático y delimitación del alcance.

⚠️ **Aspectos a Profundizar:**
- Faltó explicitar el fundamento doctrinal/normativo o la referencia a guías de práctica clínica de primera línea.
- Podrías enriquecer la fundamentación mencionando las excepciones o contraindicaciones relativas.

📖 **Criterio de Excelencia (10/10):**
En un examen final, articulá la respuesta comenzando por la definición canónica, seguida de los 3 requisitos de procedencia y concluyendo con el impacto directo sobre el caso.`;

    case "flashcard_generator":
      return `[Modo Simulación Académica Local - Flashcards FSRS]

Q: ¿Cuál es el concepto clave subyacente en: "${userInput.slice(0, 60)}..."?
A: Representa el principio rector mediante el cual se articulan las excepciones y se optimiza el resultado de cátedra.

---
Q: ¿Cuáles son los dos requisitos sine qua non para su aplicación válida?
A: 1) Existencia de presupuesto habilitante probado; 2) Ausencia de causales de exclusión o contraindicaciones directas.

---
Q: ¿Qué diferencia este enfoque frente a la doctrina o terapia convencional previa?
A: Mayor especificidad, menor tasa de efectos adversos y respaldo empírico de primer orden según la bibliografía oficial.`;

    default:
      return "Respuesta académica generada por el motor local de StudyLab.";
  }
}

// -----------------------------------------------------------------------------
// UNIFIED QUERY EXECUTOR (Con Streaming y Fallback Resiliente)
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
  isSimulated: boolean;
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

  // 2. Si Ollama NO está corriendo o no hay modelos, usar simulación local determinista
  if (!status.isRunning || status.models.length === 0) {
    const simulatedText = generateOfflineDeterministicResponse(options.mode, options.prompt);

    // Simular un suave streaming si hay listener de chunks
    if (options.onChunk) {
      const words = simulatedText.split(" ");
      let acc = "";
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        acc += chunk;
        options.onChunk(chunk, acc);
      }
    }

    return {
      text: simulatedText,
      isSimulated: true,
      modelUsed: "Offline Academic Simulator",
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
      isSimulated: false,
      modelUsed: targetModel,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    // Fallback de contingencia si falla la llamada
    const fallbackText = generateOfflineDeterministicResponse(options.mode, options.prompt);
    if (options.onChunk) {
      options.onChunk(fallbackText, fallbackText);
    }

    return {
      text: fallbackText,
      isSimulated: true,
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
