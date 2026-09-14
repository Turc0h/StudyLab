import type { AcademicChunkRecord, AcademicBoundingBox } from "../../db/db";
import type { SocraticEvaluationResult } from "./socraticEvaluator";

export interface SocraticProfessorCitation {
  sourceId: string;
  sourceTitle: string;
  page: number;
  paragraph: number;
  snippet: string;
  bbox?: AcademicBoundingBox;
}

export interface SocraticProfessorResponse {
  messageText: string;
  citations: SocraticProfessorCitation[];
  evaluation?: SocraticEvaluationResult;
  isRefusalToSolveMechanically: boolean;
  pedagogicalFocus: "anti_lazy_refusal" | "conceptual_audit" | "theoretical_inquiry" | "ungrounded_query";
}

/**
 * Patterns that indicate the student wants the system to do their homework,
 * calculate an answer without effort, or provide passive solutions.
 */
const PASSIVE_EXERCISE_PATTERNS = [
  /hazme\s+(este|el)\s+(ejercicio|problema|tp|trabajo)/i,
  /haceme\s+(este|el)\s+(ejercicio|problema|tp|trabajo)/i,
  /resolv(e|é|eme|erme|eme este|éme este)\s+(el|este)?\s*(ejercicio|problema|ecuacion|ecuación|integral|derivada|limite|límite)?/i,
  /dame\s+la\s+respuesta/i,
  /cu[aá]nto\s+da\s+/i,
  /cu[aá]l\s+es\s+el\s+resultado/i,
  /resolvelo\s+vos/i,
  /resolvelo\s+por\s+m[ií]/i,
  /hacelo\s+por\s+m[ií]/i,
  /pasame\s+la\s+soluci[oó]n/i,
  /calcula(me)?\s+(esto|el\s+resultado)/i,
];

/**
 * Formal Latin and academic interjections used by classical university professors
 */
const PROFESSOR_HONORIFICS = [
  "Estimado colega",
  "Distinga bien sus premisas",
  "Observe con detenimiento",
  "Atienda al rigor formal",
  "Reflexione con cuidado",
];

function pickHonorific(): string {
  return PROFESSOR_HONORIFICS[Math.floor(Math.random() * PROFESSOR_HONORIFICS.length)];
}

/**
 * Evaluates whether the prompt is an attempt to delegate exercise solving.
 */
export function isStudentRequestingMechanicalSolution(input: string): boolean {
  return PASSIVE_EXERCISE_PATTERNS.some((regex) => regex.test(input));
}

/**
 * Builds a strict, formal refusal response when the student asks for a passive solution.
 */
function generateAntiLazyRefusal(
  _studentQuery: string,
  topChunk?: AcademicChunkRecord,
  sourceTitle?: string
): SocraticProfessorResponse {
  const honorific = pickHonorific();
  const citations: SocraticProfessorCitation[] = [];

  let guidanceText = "";
  if (topChunk && sourceTitle) {
    citations.push({
      sourceId: topChunk.sourceId,
      sourceTitle,
      page: topChunk.pageNumber,
      paragraph: topChunk.paragraphIndex,
      snippet: topChunk.rawContent.slice(0, 140),
      bbox: topChunk.boundingBox,
    });

    guidanceText = `
Si consulta la fuente académica oficial [[cite:${sourceTitle}:${topChunk.pageNumber}:${topChunk.paragraphIndex}]], hallará la fundamentación teórica de este problema.
No obstante, antes de dar un solo paso numérico, responda a esta cátedra:
¿Cuáles son las hipótesis iniciales de su modelo y cuál es la ley física o teorema matemático que rige el sistema en la página ${topChunk.pageNumber}?`;
  } else {
    guidanceText = `
Plantee explícitamente cuáles son los axiomas de partida, en qué ecuación o principio se apoya su desarrollo y en qué paso exacto de su deducción se detuvo su razonamiento.`;
  }

  const messageText = `${honorific}:

Esta cátedra no es un calculador mecánico ni resolverá el ejercicio por usted. Pretender que le entregue la solución acabada no solo es estéril pedagógicamente, sino incompatible con la formación universitaria rigurosa.
${guidanceText}

Una vez que exponga su planteo formal y sus hipótesis de contorno, auditaremos la validez lógica de su procedimiento. Quedo a la espera de su deducción.`;

  return {
    messageText,
    citations,
    isRefusalToSolveMechanically: true,
    pedagogicalFocus: "anti_lazy_refusal",
  };
}

/**
 * Queries a local Ollama instance (e.g. llama3.2, qwen2.5, mistral) running at http://localhost:11434
 */
async function queryLocalOllama(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<string | null> {
  const { systemPrompt, userPrompt, model = "llama3.2" } = params;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // quick local check

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt: `${systemPrompt}\n\nPregunta o Planteamiento del Estudiante:\n${userPrompt}`,
        stream: false,
        options: {
          temperature: 0.3,
        },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || null;
  } catch {
    return null; // Ollama not running or timeout; fallback to local heuristic
  }
}

/**
 * Core Socratic Professor Dialectic Engine
 * Confronts the student's reasoning against indexed course chunks.
 */
export async function generateSocraticProfessorResponse(params: {
  query: string;
  searchResults: Array<{
    chunk: AcademicChunkRecord;
    sourceTitle: string;
    combinedScore: number;
  }>;
  evaluationResult?: SocraticEvaluationResult;
  useOllama?: boolean;
}): Promise<SocraticProfessorResponse> {
  const { query, searchResults, evaluationResult, useOllama = false } = params;

  // 1. Check for passive exercise solving refusal
  if (isStudentRequestingMechanicalSolution(query)) {
    const top = searchResults[0];
    return generateAntiLazyRefusal(query, top?.chunk, top?.sourceTitle);
  }

  // 2. If no source chunks are found with sufficient score
  if (searchResults.length === 0) {
    return {
      messageText: `Estimado colega:

Su consulta carece de anclaje empírico o teórico verificable en los documentos actualmente indexados para esta materia. En este claustro no operamos con conjeturas sin sustento bibliográfico.

Le ruego que precise la terminología técnica o verifique haber cargado en el Gestor de Fuentes el texto, apunte de cátedra o guía de trabajos prácticos correspondiente a este tema.`,
      citations: [],
      isRefusalToSolveMechanically: false,
      pedagogicalFocus: "ungrounded_query",
    };
  }

  const topMatch = searchResults[0];
  const chunk = topMatch.chunk;
  const sourceTitle = topMatch.sourceTitle;

  const citations: SocraticProfessorCitation[] = searchResults.map((r) => ({
    sourceId: r.chunk.sourceId,
    sourceTitle: r.sourceTitle,
    page: r.chunk.pageNumber,
    paragraph: r.chunk.paragraphIndex,
    snippet: r.chunk.rawContent.slice(0, 140),
    bbox: r.chunk.boundingBox,
  }));

  // Extract primary sentence or key theoretical premise from chunk
  const chunkLines = chunk.rawContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 25 && !l.startsWith("#") && !l.startsWith("---"));
  const corePremise = chunkLines[0] || chunk.rawContent.slice(0, 150);

  // 3. Case: Evaluation of student explanation (Dialectic Audit)
  if (evaluationResult) {
    const hasContradictions = evaluationResult.contradictions.length > 0;
    const hasOmissions = evaluationResult.omissions.length > 0;
    const score = evaluationResult.masteryScore;

    let dialecticBody = "";

    if (hasContradictions) {
      const contr = evaluationResult.contradictions[0];
      dialecticBody = `Advierto una contradicción conceptual severa en su exposición:
Usted aseveró: "${contr.claim}". 
Sin embargo, el corpus riguroso de la cátedra [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]] estipula taxativamente lo opuesto: ${contr.correction}.

Le interrogo: ${evaluationResult.socraticQuestion}`;
    } else if (hasOmissions) {
      const om = evaluationResult.omissions[0];
      dialecticBody = `Su razonamiento avanza en la dirección correcta, pero adolece de una laguna en sus hipótesis de contorno.
Omitió considerar: "${om.missingPoint}". En física y matemáticas puras, obviar una hipótesis invalida la deducción entera.

Tal como se formaliza en [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]], le exijo que justifique:
${evaluationResult.socraticQuestion}`;
    } else if (score >= 80) {
      dialecticBody = `Su síntesis demuestra un dominio formal elogiable de los axiomas. Las proposiciones presentadas concuerdan con la formulación de [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]].

Ahora bien, un verdadero académico no se detiene en el caso trivial:
¿Qué le ocurriría a este sistema si perturbamos la condición de borde y el límite temporal tiende a infinito? Plantee el comportamiento asintótico.`;
    } else {
      dialecticBody = `Su exposición es fragmentaria y carece del rigor demostrativo requerido.
Repase los fundamentos expuestos en [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]:
"${corePremise}"

Responda con precisión: ${evaluationResult.socraticQuestion}`;
    }

    const messageText = `Estimado colega:

${dialecticBody}

Tómese el tiempo necesario para meditar la respuesta antes de formularla. La precipitación es enemiga del rigor científico.`;

    return {
      messageText,
      citations,
      evaluation: evaluationResult,
      isRefusalToSolveMechanically: false,
      pedagogicalFocus: "conceptual_audit",
    };
  }

  // 4. Case: Theoretical Inquiry / Detailed Conceptual Explanation grounded in the document
  const formulaMention = chunk.latexFormulas.length > 0
    ? `\nConsidere en detalle la formulación analítica de la cátedra:\n$$${chunk.latexFormulas[0]}$$\n`
    : "";

  // Extract surrounding explanatory context lines
  const detailedContext = chunkLines.slice(0, 3).join("\n\n");

  const socraticProbe = chunk.latexFormulas.length > 0
    ? `Habiendo analizado esta estructura formal, deduzca usted mismo: si alteramos las condiciones iniciales o la variable independiente se reduce a la mitad, ¿de qué manera matemática se preserva el principio de conservación en el sistema?`
    : `Comprendida la definición fundamental, exponga con sus propias palabras: ¿cuál es la condición de contorno indispensable para que este principio conserve su validez sin caer en indeterminación o contradicción física?`;

  // If Ollama is enabled, attempt rich reasoning with local model
  if (useOllama) {
    const systemPrompt = `Eres un Catedrático Universitario de Honor, riguroso, formal y socrático.
Principio inquebrantable: NUNCA resuelvas ejercicios mecánicamente por el alumno ni des respuestas directas de tarea.
Debes explicar con solidez doctoral basándote exclusivamente en este texto de la cátedra:
"${corePremise}"
${chunk.latexFormulas.length > 0 ? `Fórmula: ${chunk.latexFormulas[0]}` : ""}
Incluye siempre la cita [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]] y remata con una pregunta socrática incisiva de condiciones de contorno.`;

    const ollamaResponse = await queryLocalOllama({
      systemPrompt,
      userPrompt: query,
    });

    if (ollamaResponse) {
      return {
        messageText: ollamaResponse,
        citations,
        isRefusalToSolveMechanically: false,
        pedagogicalFocus: "theoretical_inquiry",
      };
    }
  }

  const messageText = `Estimado colega:

Conforme a la fundamentación teórica de la cátedra [[cite:${sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]:

${detailedContext}
${formulaMention}
**Análisis y Desglose Conceptual:**
1. **Fundamento Axiomático:** El principio se sustenta en la hipótesis de regularidad y conservación desarrollada en la página ${chunk.pageNumber}.
2. **Interpretación Rigurosa:** No se trata de una correlación contingente, sino de una consecuencia directa de la estructura formal del problema.

Ahora bien, un universitario no memoriza conclusiones inertes; comprende la causa eficiente de cada término. Le formulo el siguiente desafío:

${socraticProbe}

Reflexione con detenimiento y fundamente su razonamiento a partir de la cita provista.`;

  return {
    messageText,
    citations,
    isRefusalToSolveMechanically: false,
    pedagogicalFocus: "theoretical_inquiry",
  };
}
