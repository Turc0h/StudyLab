import { db, type AcademicEvaluationRecord, type StudentErrorCategory } from "../../db/db";
import { calculateConceptMastery4D } from "../study-engine/masteryEngine";

export interface FeynmanGap {
  id: string;
  type: "jargon" | "omission" | "contradiction" | "tautology";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  studentQuote?: string;
  officialBasis?: string;
  suggestedCloze?: {
    front: string;
    back: string;
  };
  suggestedError?: {
    category: StudentErrorCategory;
    description: string;
    studentAttempt: string;
    officialCorrection: string;
  };
  suggestedQuestion: string;
  suggestedSubconcept?: {
    name: string;
    description: string;
  };
}

export interface FeynmanAnalysisResult {
  conceptId?: string;
  conceptName: string;
  comprehensionScore: number; // 0..100
  simplicityScore: number; // 0..100
  diagnosticCategory: "dominio_completo" | "comprension_solida" | "comprension_parcial" | "lagunas_criticas";
  entailedPoints: string[];
  gaps: FeynmanGap[];
  sourceCitationSnippet?: {
    title: string;
    page?: number;
    snippet: string;
  };
}

const ACADEMIC_JARGON_TERMS = [
  "paradigma",
  "epistemología",
  "homeostasis",
  "concurrencia",
  "polimorfismo",
  "entropía",
  "ortogonal",
  "isomorfismo",
  "sinapsis",
  "heurística",
  "ontología",
  "determinismo",
  "holístico",
  "asintótico",
  "recursión",
  "abstracción",
  "ad-hoc",
  "axioma",
  "axiomático",
  "intrínseco",
  "idempotente",
  "bijetivo",
  "holomorfo",
  "estocástico",
  "isométrico",
  "isomorfo",
];

const EVASIVE_PATTERNS = [
  { phrase: "se acerca", warning: "Uso ambiguo del término 'se acerca' sin formalizar la noción de límite o épsilon-delta" },
  { phrase: "básicamente", warning: "Uso de 'básicamente' para eludir el rigor de la definición formal" },
  { phrase: "obviamente", warning: "Uso de 'obviamente': en ciencias exactas no hay premisas obvias sin axioma previo" },
  { phrase: "algo así como", warning: "Vaguedad conceptual al comparar sin rigor axiomático" },
  { phrase: "en cierto modo", warning: "Ambigüedad en la afirmación causal" },
  { phrase: "como que", warning: "Expresión coloquial que oculta el mecanismo causal exacto" },
];

const CLASSIC_MISCONCEPTIONS: Array<{
  pattern: RegExp;
  title: string;
  severity: "high" | "medium";
  description: string;
  correction: string;
  category: StudentErrorCategory;
}> = [
  {
    pattern: /continuidad\s+implica\s+deriva/i,
    title: "Confusión entre continuidad y derivabilidad",
    severity: "high",
    description: "Afirmaste que la continuidad implica derivabilidad. La derivabilidad implica continuidad, pero el recíproco es falso (ejemplo: f(x)=|x| en x=0).",
    correction: "La derivabilidad es una condición más estricta que la continuidad. Toda función derivable es continua, pero existen funciones continuas no derivables.",
    category: "misconception",
  },
  {
    pattern: /velocidad\s+constante\s+en\s+mru/i,
    title: "Confusión en cinemática MRU vs MRUV",
    severity: "medium",
    description: "Atribución incorrecta de aceleración o variación de velocidad.",
    correction: "En MRU la velocidad es constante (a=0). En MRUV la aceleración es constante y la velocidad varía linealmente con el tiempo.",
    category: "misconception",
  },
  {
    pattern: /calor\s+es\s+energ[ií]a\s+(almacenada|contenida)/i,
    title: "Confusión ontológica sobre el calor",
    severity: "high",
    description: "El calor NO es energía almacenada. El calor es energía en tránsito a través de una frontera debido a un gradiente de temperatura.",
    correction: "La energía almacenada en un sistema es la Energía Interna (U). El calor (Q) es energía en tránsito durante un proceso.",
    category: "misconception",
  },
  {
    pattern: /derivada\s+(es\s+)?cero\s+entonces\s+(es\s+)?(m[aá]ximo|m[íi]nimo)/i,
    title: "Condición necesaria vs condición suficiente en extremos",
    severity: "high",
    description: "Que f'(x) = 0 es condición necesaria para extremos locales en el interior del dominio (Fermat), pero no suficiente (puede ser punto de inflexión de tangente horizontal, ej: f(x)=x^3 en 0).",
    correction: "Se requiere verificar el signo de la derivada segunda (f''(x)) o el cambio de signo de la derivada primera en el entorno.",
    category: "misconception",
  },
  {
    pattern: /masa\s+es\s+(igual\s+a\s+)?peso/i,
    title: "Confusión escalar masa vs vector peso",
    severity: "high",
    description: "La masa es una propiedad intrínseca escalar (kg), mientras que el peso es una fuerza vectorial gravitatoria (P = m·g en Newtons).",
    correction: "Masa [kg] es la inercia del cuerpo; Peso [N] es la fuerza neta de atracción gravitatoria.",
    category: "misconception",
  },
  {
    pattern: /matriz\s+cuadrada\s+siempre\s+tiene\s+inversa/i,
    title: "Omisión de condición de regularidad de matriz",
    severity: "high",
    description: "Una matriz cuadrada solo posee inversa si su determinante es no nulo (det(A) != 0).",
    correction: "Condición necesaria y suficiente: det(A) ≠ 0 (rango máximo, columnas linealmente independientes).",
    category: "knowledge_gap",
  },
];

/**
 * Realiza un análisis dialéctico y riguroso de una auto-explicación Feynman.
 */
export async function analyzeFeynmanExplanation(
  conceptName: string,
  explanation: string,
  conceptId?: string,
): Promise<FeynmanAnalysisResult> {
  const text = explanation.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  const gaps: FeynmanGap[] = [];
  const entailedPoints: string[] = [];

  // Buscar fragmentos o fuentes académicas asociadas a este concepto
  let sourceCitationSnippet: FeynmanAnalysisResult["sourceCitationSnippet"];
  let sourceText = "";

  if (conceptId) {
    const matchingChunks = await db.academicChunks.where("rawContent").startsWithIgnoreCase(conceptName.slice(0, 10)).toArray();
    if (matchingChunks.length > 0) {
      const best = matchingChunks[0];
      sourceCitationSnippet = {
        title: best.title || "Fuente oficial de cátedra",
        page: best.pageNumber,
        snippet: best.rawContent.slice(0, 240) + "...",
      };
      sourceText = best.rawContent.toLowerCase();
    }
  }

  // 1. Detección de Jerga y Términos Evasivos
  for (const jargon of ACADEMIC_JARGON_TERMS) {
    if (lower.includes(jargon)) {
      gaps.push({
        id: crypto.randomUUID(),
        type: "jargon",
        severity: "medium",
        title: `Término técnico sin desarmar: "${jargon}"`,
        description: `Usaste la palabra "${jargon}". En el método Feynman el objetivo es explicar el principio físico/lógico subyacente sin escudarse en tecnicismos.`,
        studentQuote: jargon,
        suggestedQuestion: `¿Cómo le explicarías el concepto de "${jargon}" a alguien de primer año usando una analogía cotidiana o un diagrama mental?`,
        suggestedCloze: {
          front: `En ${conceptName}, el término "${jargon}" representa físicamente: {{c1::...}}`,
          back: `Definición desarmada en lenguaje natural`,
        },
      });
    }
  }

  for (const evasive of EVASIVE_PATTERNS) {
    if (lower.includes(evasive.phrase)) {
      gaps.push({
        id: crypto.randomUUID(),
        type: "jargon",
        severity: "low",
        title: `Ambigüedad dialéctica: "${evasive.phrase}"`,
        description: evasive.warning,
        studentQuote: evasive.phrase,
        suggestedQuestion: `¿Podés reemplazar "${evasive.phrase}" por la condición matemática o física precisa que gobierna el fenómeno?`,
      });
    }
  }

  // 2. Detección de Tautologías y Circularidades
  if (lower.includes("porque") || lower.includes("ya que") || lower.includes("dado que")) {
    const parts = lower.split(/porque|ya que|dado que/);
    if (parts.length >= 2) {
      const leftWords = parts[0].split(/\s+/).filter((w) => w.length > 4);
      const rightWords = parts[1].split(/\s+/).filter((w) => w.length > 4);
      const common = leftWords.filter((w) => rightWords.includes(w));
      if (common.length >= 2) {
        gaps.push({
          id: crypto.randomUUID(),
          type: "tautology",
          severity: "high",
          title: "Razonamiento circular detectado",
          description: `Estás justificando el concepto repitiendo los mismos términos antes y después del conector causal: [${common.join(", ")}].`,
          studentQuote: text.slice(Math.max(0, text.indexOf(common[0]) - 10), text.indexOf(common[0]) + 50),
          suggestedQuestion: `¿Cuál es el axioma previo o ley física fundamental que origina esto, sin apelar a la misma definición?`,
          suggestedError: {
            category: "procedure_error",
            description: `Razonamiento circular al fundamentar ${conceptName}`,
            studentAttempt: text.slice(0, 100),
            officialCorrection: "El fundamento causal debe apoyarse en axiomas o hipótesis independientes.",
          },
        });
      }
    }
  }

  // 3. Detección de Contradicciones Clásicas
  for (const mis of CLASSIC_MISCONCEPTIONS) {
    if (mis.pattern.test(lower)) {
      gaps.push({
        id: crypto.randomUUID(),
        type: "contradiction",
        severity: mis.severity,
        title: mis.title,
        description: mis.description,
        officialBasis: mis.correction,
        suggestedError: {
          category: mis.category,
          description: mis.title,
          studentAttempt: text.slice(0, 120),
          officialCorrection: mis.correction,
        },
        suggestedQuestion: `¿Por qué esta afirmación es un error clásico de cátedra? ¿Cuál es el contraejemplo estándar?`,
        suggestedCloze: {
          front: `En ${conceptName}: {{c1::${mis.correction}}}`,
          back: mis.description,
        },
      });
    }
  }

  // 4. Detección de Omisiones Fundacionales
  const hasDomainMention = /dominio|intervalo|frontera|rango|positivo|no nulo|distinto de cero|condici[oó]n/i.test(lower);
  const hasExistenceOrUniqueness = /exist|unic|converg|hip[oó]tesis/i.test(lower);

  if (words.length > 25 && !hasDomainMention) {
    gaps.push({
      id: crypto.randomUUID(),
      type: "omission",
      severity: "medium",
      title: "Omisión de restricciones de dominio o validez",
      description: `Tu explicación describe el comportamiento pero no explicita el dominio de validez o las condiciones de contorno bajo las cuales se cumple ${conceptName}.`,
      suggestedQuestion: `¿En qué conjunto o bajo qué condiciones de hipótesis NO es válida esta propiedad?`,
      suggestedCloze: {
        front: `Las condiciones de validez y restricciones de dominio para ${conceptName} son: {{c1::...}}`,
        back: "Restricciones formales requeridas por cátedra",
      },
    });
  }

  if (words.length > 35 && !hasExistenceOrUniqueness && (lower.includes("teorema") || lower.includes("propiedad") || lower.includes("soluci[oó]n"))) {
    gaps.push({
      id: crypto.randomUUID(),
      type: "omission",
      severity: "low",
      title: "Omisión de hipótesis de existencia/unicidad",
      description: "No mencionás si la solución o propiedad está garantizada en existencia y unicidad.",
      suggestedQuestion: `¿Qué condiciones aseguran la existencia y unicidad en este marco teórico?`,
    });
  }

  // Si hay fuente de cátedra disponible, verificar coincidencia con vocabulario
  if (sourceText) {
    const sourceKeywords = sourceText
      .replace(/[^\wáéíóúüñ\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 5);
    const uniqueSourceWords = Array.from(new Set(sourceKeywords)).slice(0, 15);
    const missingCrucial = uniqueSourceWords.filter((w) => !lower.includes(w));

    if (missingCrucial.length > 5 && words.length > 20) {
      gaps.push({
        id: crypto.randomUUID(),
        type: "omission",
        severity: "medium",
        title: "Divergencia con el apunte oficial de cátedra",
        description: `El material oficial hace énfasis en aspectos que no incluiste: [${missingCrucial.slice(0, 3).join(", ")}].`,
        officialBasis: sourceCitationSnippet?.snippet,
        suggestedQuestion: `¿Cómo se vincula el concepto con "${missingCrucial[0]}" según la bibliografía oficial?`,
      });
    }
  }

  // Puntos correctos reconocidos
  if (words.length >= 15) {
    entailedPoints.push("Identificación del fenómeno principal y sus elementos activos.");
  }
  if (words.length >= 30 && !lower.includes("básicamente")) {
    entailedPoints.push("Esfuerzo de articulación conceptual sin muletillas superficiales.");
  }
  if (hasDomainMention) {
    entailedPoints.push("Reconocimiento de condiciones de borde o validez del principio.");
  }

  // Cálculo de Puntuaciones
  const highGaps = gaps.filter((g) => g.severity === "high").length;
  const medGaps = gaps.filter((g) => g.severity === "medium").length;
  const lowGaps = gaps.filter((g) => g.severity === "low").length;

  let compScore = Math.max(15, Math.min(100, Math.round(95 - highGaps * 25 - medGaps * 12 - lowGaps * 5 + Math.min(20, words.length / 3))));
  if (words.length < 15) {
    compScore = Math.min(compScore, 40);
  }

  const simplicityScore = Math.max(
    10,
    Math.min(100, Math.round(100 - gaps.filter((g) => g.type === "jargon").length * 15 - (gaps.some((g) => g.type === "tautology") ? 30 : 0))),
  );

  let diagnosticCategory: FeynmanAnalysisResult["diagnosticCategory"] = "dominio_completo";
  if (compScore < 50) {
    diagnosticCategory = "lagunas_criticas";
  } else if (compScore < 75) {
    diagnosticCategory = "comprension_parcial";
  } else if (compScore < 90) {
    diagnosticCategory = "comprension_solida";
  }

  return {
    conceptId,
    conceptName,
    comprehensionScore: compScore,
    simplicityScore,
    diagnosticCategory,
    entailedPoints,
    gaps,
    sourceCitationSnippet,
  };
}

/**
 * Aplica el resultado del análisis Feynman a la base de datos:
 * 1. Guarda la evaluación en `db.academicEvaluations`.
 * 2. Si el concepto existe en `db.concepts`, recalcula el 4D Mastery y actualiza `masteryScore`.
 */
export async function commitFeynmanEvaluation(
  analysis: FeynmanAnalysisResult,
  studentExplanation: string,
): Promise<{ evaluationId: string; updated4DMastery?: number }> {
  const evalRecord: AcademicEvaluationRecord = {
    id: crypto.randomUUID(),
    conceptId: analysis.conceptId || "custom-" + crypto.randomUUID(),
    sourceId: "feynman-audit",
    studentExplanation,
    masteryScore: analysis.comprehensionScore,
    diagnosticCategory: analysis.diagnosticCategory,
    entailedPoints: analysis.entailedPoints,
    omissions: analysis.gaps
      .filter((g) => g.type === "omission")
      .map((g) => ({
        missingPoint: g.title,
        severity: g.severity,
        impact: g.description,
      })),
    contradictions: analysis.gaps
      .filter((g) => g.type === "contradiction")
      .map((g) => ({
        claim: g.studentQuote || g.title,
        correction: g.officialBasis || g.description,
      })),
    socraticQuestion: analysis.gaps[0]?.suggestedQuestion || "¿Qué hipótesis fundamental sostiene este teorema?",
    evaluatedAt: Date.now(),
  };

  if (analysis.sourceCitationSnippet) {
    evalRecord.citationProof = {
      page: analysis.sourceCitationSnippet.page || 1,
      paragraph: 1,
      exactSnippet: analysis.sourceCitationSnippet.snippet,
    };
  }

  await db.academicEvaluations.add(evalRecord);

  let updated4D: number | undefined;
  if (analysis.conceptId && !analysis.conceptId.startsWith("custom-")) {
    const mastery4D = await calculateConceptMastery4D(analysis.conceptId);
    updated4D = mastery4D.compositeScore;
    await db.concepts.update(analysis.conceptId, {
      masteryScore: mastery4D.compositeScore,
      currentRetrievability: mastery4D.retention,
    });
  }

  return { evaluationId: evalRecord.id, updated4DMastery: updated4D };
}

/**
 * Convierte una brecha (gap) de Feynman directamente en una tarjeta Cloze en FSRS.
 */
export async function convertGapToClozeCard(
  conceptName: string,
  conceptId: string | null,
  gap: FeynmanGap,
): Promise<string> {
  const deck = await db.flashcardDecks.orderBy("createdAt").first();
  const deckId = deck?.id || "default-deck";

  const frontText = gap.suggestedCloze?.front || `En ${conceptName}, la propiedad omitida es: {{c1::${gap.title}}}`;
  const backText = gap.officialBasis || gap.description;

  const cardId = crypto.randomUUID();
  const now = Date.now();

  await db.cardsFsrs.add({
    id: cardId,
    deckId,
    conceptId: conceptId || null,
    front: frontText,
    back: backText,
    state: "new",
    stability: 2.0,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: now,
    halfLife: 2.0,
    createdAt: now,
  });

  return cardId;
}

/**
 * Registra una brecha directamente en el Error Bank.
 */
export async function convertGapToStudentError(
  conceptId: string | null,
  conceptName: string,
  gap: FeynmanGap,
): Promise<string> {
  const errorId = crypto.randomUUID();
  const now = Date.now();

  await db.studentErrors.add({
    id: errorId,
    conceptId: conceptId || "concept-" + crypto.randomUUID(),
    conceptName,
    category: gap.suggestedError?.category || (gap.type === "contradiction" ? "misconception" : "knowledge_gap"),
    originalExercise: `Explicación Feynman de: ${conceptName}`,
    studentAnswer: gap.studentQuote || "Explicación Feynman parcial",
    expectedAnswer: gap.officialBasis || gap.suggestedError?.officialCorrection || "Fundamentación formal requerida por cátedra",
    explanation: gap.title + ": " + gap.description,
    timestamp: now,
    repetitionCount: 1,
    resolved: false,
  });

  return errorId;
}

/**
 * Crea un subconcepto / nodo derivado en el Knowledge Graph para aislar la brecha.
 */
export async function convertGapToGraphNode(
  parentConceptId: string | null,
  gap: FeynmanGap,
): Promise<string> {
  const subconceptId = crypto.randomUUID();
  const now = Date.now();

  await db.concepts.add({
    id: subconceptId,
    domainId: "academic-domain",
    name: gap.suggestedSubconcept?.name || gap.title.slice(0, 40),
    description: gap.description,
    masteryScore: 25, // Inicialmente bajo porque surge de una laguna detectada
    currentRetrievability: 0.5,
    status: "in_progress",
    prerequisites: parentConceptId ? [parentConceptId] : [],
    tags: ["feynman-gap", gap.type],
    createdAt: now,
  });

  if (parentConceptId) {
    await db.conceptEdges.add({
      id: crypto.randomUUID(),
      sourceConceptId: parentConceptId,
      targetConceptId: subconceptId,
      type: "component",
      strength: 0.8,
    });
  }

  return subconceptId;
}
