import type { AcademicBoundingBox } from "../../db/db";
import type { SocraticEvaluationResult } from "./socraticEvaluator";
import type { SearchResult } from "./vectorIndex";

export type ProfessorMode = "consulta" | "auditoria" | "examen";
export type HelpLevel = 0 | 1 | 2 | 3 | 4;
export type LanguageEngineLane = "ollama" | "webllm" | "rules";

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
  pedagogicalFocus: "anti_lazy_refusal" | "conceptual_audit" | "theoretical_inquiry" | "ungrounded_query" | "help_level";
  mode: ProfessorMode;
  helpLevel: HelpLevel;
  activeEngine: LanguageEngineLane;
  engineDisplayName: string;
}

/**
 * Patterns that indicate the student is directly asking the system to do homework mechanically.
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

export function isStudentRequestingMechanicalSolution(input: string): boolean {
  return PASSIVE_EXERCISE_PATTERNS.some((regex) => regex.test(input));
}

/**
 * Check if local Ollama server is running.
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if WebGPU is available for on-device browser LLM.
 */
export async function checkWebGpuAvailable(): Promise<boolean> {
  if (typeof navigator === "undefined" || !(navigator as any).gpu) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/**
 * Resolves the currently active language engine lane and its honest UI label.
 */
export async function resolveActiveLanguageEngine(preferredLane?: LanguageEngineLane): Promise<{
  lane: LanguageEngineLane;
  displayName: string;
}> {
  if (preferredLane === "ollama") {
    const ok = await checkOllamaAvailable();
    if (ok) return { lane: "ollama", displayName: "Catedrático · Llama 3.2 local (Ollama)" };
  }

  if (preferredLane === "webllm" || !preferredLane) {
    const hasGpu = await checkWebGpuAvailable();
    if (hasGpu) {
      return { lane: "webllm", displayName: "Catedrático · Modelo en navegador (WebGPU)" };
    }
  }

  return { lane: "rules", displayName: "Catedrático · Modo reglas de cátedra" };
}

/**
 * Queries local Ollama instance running at http://localhost:11434
 */
async function queryLocalOllama(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<string | null> {
  const { systemPrompt, userPrompt, model = "llama3.2" } = params;
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Core Socratic Professor Dialectic Engine supporting 3 explicit modes and help levels 0-4.
 */
export async function generateSocraticProfessorResponse(params: {
  query: string;
  searchResults: SearchResult[];
  evaluationResult?: SocraticEvaluationResult;
  mode?: ProfessorMode;
  helpLevel?: HelpLevel;
  preferredEngine?: LanguageEngineLane;
  hasSufficientEvidence?: boolean;
}): Promise<SocraticProfessorResponse> {
  const {
    query,
    searchResults,
    evaluationResult,
    mode = "consulta",
    helpLevel = 0,
    preferredEngine,
    hasSufficientEvidence = true,
  } = params;

  const engineResolution = await resolveActiveLanguageEngine(preferredEngine);
  const honorific = pickHonorific();

  // 1. Strict Citation-First Rule (Section 27): Check for evidence sufficiency
  if (searchResults.length === 0 || !hasSufficientEvidence) {
    return {
      messageText: `${honorific}:

No encuentro evidencia suficiente en las fuentes cargadas para fundamentar una deducción rigurosa.

En este claustro no operamos con conjeturas sin sustento bibliográfico. Verifique haber cargado en el Gestor de Fuentes el texto, apunte de cátedra o guía correspondiente a este tema.`,
      citations: [],
      isRefusalToSolveMechanically: false,
      pedagogicalFocus: "ungrounded_query",
      mode,
      helpLevel,
      activeEngine: engineResolution.lane,
      engineDisplayName: engineResolution.displayName,
    };
  }

  const topMatch = searchResults[0];
  const chunk = topMatch.chunk;
  const citation: SocraticProfessorCitation = {
    sourceId: chunk.sourceId,
    sourceTitle: topMatch.sourceTitle,
    page: chunk.pageNumber,
    paragraph: chunk.paragraphIndex,
    snippet: chunk.rawContent.slice(0, 160),
    bbox: chunk.boundingBox,
  };

  // 2. Mode: EXAMEN (locked until student provides attempt)
  if (mode === "examen" && !evaluationResult && !query.includes("mi respuesta es") && !query.includes("planteo:")) {
    return {
      messageText: `${honorific}:

Usted se encuentra en [MODO EXAMEN].

La cátedra no entregará pistas ni desarrollos teóricos hasta que usted entregue su intento formal de resolución o declare sus hipótesis de partida.

Escriba su desarrollo formal precedido de: "Planteo: [sus hipótesis y deducción]" para habilitar la auditoría rigurosa.`,
      citations: [],
      isRefusalToSolveMechanically: true,
      pedagogicalFocus: "anti_lazy_refusal",
      mode,
      helpLevel,
      activeEngine: engineResolution.lane,
      engineDisplayName: engineResolution.displayName,
    };
  }

  // 3. Mode: AUDITORÍA or passive exercise delegation
  const isPassive = isStudentRequestingMechanicalSolution(query);
  if (mode === "auditoria" && isPassive) {
    return {
      messageText: `${honorific}:

En [MODO AUDITORÍA], esta cátedra no resuelve ejercicios mecánicos por usted.

Según la fuente oficial [[cite:${topMatch.sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]:
${chunk.rawContent.slice(0, 220)}...

Indique:
1. ¿Cuáles son las hipótesis iniciales de su modelo?
2. ¿Qué ecuación diferencial, principio físico o axioma rige este sistema?`,
      citations: [citation],
      isRefusalToSolveMechanically: true,
      pedagogicalFocus: "anti_lazy_refusal",
      mode,
      helpLevel: 0,
      activeEngine: engineResolution.lane,
      engineDisplayName: engineResolution.displayName,
    };
  }

  // 4. Help Levels 0 to 4 within CONSULTA or AUDITORÍA
  if (helpLevel > 0) {
    return generateHelpLevelResponse({
      honorific,
      topMatch,
      citation,
      helpLevel,
      mode,
      engineResolution,
    });
  }

  // 5. Query Ollama if available
  if (engineResolution.lane === "ollama") {
    const systemPrompt = `Eres un catedrático universitario de máxima excelencia académica y formalidad. Modo: ${mode.toUpperCase()}. Citas obligatorias. Cita siempre usando [[cite:${topMatch.sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]. No resuelvas ejercicios mecánicos.`;
    const ollamaResponse = await queryLocalOllama({
      systemPrompt,
      userPrompt: `Texto de cátedra: """${chunk.rawContent}"""\nConsulta del estudiante: """${query}"""`,
    });

    if (ollamaResponse) {
      return {
        messageText: ollamaResponse,
        citations: [citation],
        evaluation: evaluationResult,
        isRefusalToSolveMechanically: false,
        pedagogicalFocus: "theoretical_inquiry",
        mode,
        helpLevel,
        activeEngine: engineResolution.lane,
        engineDisplayName: engineResolution.displayName,
      };
    }
  }

  // 6. Deterministic Heuristic Engine (Lane 3 - Always available)
  const formulasLatex = chunk.latexFormulas.length > 0
    ? `\n\nEl núcleo formal se sintetiza en la relación matemática documentada:\n$$${chunk.latexFormulas[0]}$$`
    : "";

  const explanation = `${honorific}:

En atención a su consulta y conforme al corpus de la cátedra en [[cite:${topMatch.sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]:

${chunk.rawContent.trim()}
${formulasLatex}

**Pregunta Socrática de Consolidación:**
¿Bajo qué condiciones de contorno o límites formales dejaría de tener validez esta proposición en el caso que usted analiza?`;

  return {
    messageText: explanation,
    citations: [citation],
    evaluation: evaluationResult,
    isRefusalToSolveMechanically: false,
    pedagogicalFocus: evaluationResult ? "conceptual_audit" : "theoretical_inquiry",
    mode,
    helpLevel,
    activeEngine: engineResolution.lane,
    engineDisplayName: engineResolution.displayName,
  };
}

function generateHelpLevelResponse(params: {
  honorific: string;
  topMatch: SearchResult;
  citation: SocraticProfessorCitation;
  helpLevel: HelpLevel;
  mode: ProfessorMode;
  engineResolution: { lane: LanguageEngineLane; displayName: string };
}): SocraticProfessorResponse {
  const { honorific, topMatch, citation, helpLevel, mode, engineResolution } = params;
  const chunk = topMatch.chunk;

  let content = "";
  switch (helpLevel) {
    case 1:
      content = `**Pista Conceptual (Nivel 1):**
Observe el concepto fundamental de [[cite:${topMatch.sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]. Identifique qué magnitud permanece constante y qué variable sufre la transformación.`;
      break;
    case 2:
      content = `**Pista Estructural (Nivel 2):**
Vincule las premisas de partida con la siguiente ley matemática extraída de la cátedra:
${chunk.latexFormulas.length > 0 ? `$$${chunk.latexFormulas[0]}$$` : `"${chunk.rawContent.slice(0, 150)}..."`}
Plantee el equilibrio de términos antes de sustituir valores numéricos.`;
      break;
    case 3:
      content = `**Procedimiento Formal (Nivel 3):**
1. Establezca el marco de referencia y aísle las variables del sistema.
2. Aplique la relación de la página ${chunk.pageNumber}.
3. Despeje algebraicamente la incógnita en función estricta de las variables dadas.`;
      break;
    case 4:
      content = `**Demostración y Solución Integral (Nivel 4 - Solicitada explícitamente):**
Siguiendo la deducción completa documentada en [[cite:${topMatch.sourceTitle}:${chunk.pageNumber}:${chunk.paragraphIndex}]]:
${chunk.rawContent}
${chunk.latexFormulas.length > 0 ? `\n\nFórmulas asociadas:\n$$${chunk.latexFormulas.join("$$\n$$")}$$` : ""}`;
      break;
  }

  return {
    messageText: `${honorific}:\n\n${content}`,
    citations: [citation],
    isRefusalToSolveMechanically: false,
    pedagogicalFocus: "help_level",
    mode,
    helpLevel,
    activeEngine: engineResolution.lane,
    engineDisplayName: engineResolution.displayName,
  };
}
