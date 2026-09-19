import { db } from "../../db/db";

export interface EssayPrompt {
  id: string;
  title: string;
  discipline: "Medicina / Salud" | "Derecho / Jurídico" | "Ingeniería / Exactas" | "Humanidades / Sociales" | "General";
  promptText: string;
  targetWords: number; // e.g. 350
  timeLimitMinutes: number; // e.g. 20
  keywords: string[];
  rubricHint: string;
}

export interface SectionAnalysis {
  hasIntroduction: boolean;
  hasArgumentation: boolean;
  hasCounterArgument: boolean;
  hasConclusion: boolean;
}

export interface EssayRubricEvaluation {
  conceptualScore: number; // 0 to 10 (35% weight)
  structureScore: number; // 0 to 10 (25% weight)
  criticalRigorScore: number; // 0 to 10 (20% weight)
  clarityScore: number; // 0 to 10 (20% weight)
  totalScore: number; // 0 to 10
  wordCount: number;
  charCount: number;
  verbiageRatioPct: number; // % of filler words detected
  fillerCount: number;
  detectedKeywords: string[];
  missingKeywords: string[];
  sections: SectionAnalysis;
  verdictCategory: "Sobresaliente" | "Distinguido" | "Aprobado / Regular" | "Insuficiente";
  feedback: string[];
}

export const COMMON_ACADEMIC_FILLERS = [
  "como todos sabemos",
  "a lo largo de la historia",
  "desde tiempos inmemoriales",
  "es un tema muy interesante",
  "es de suma importancia destacar",
  "en mi humilde opinion",
  "en mi opinion personal",
  "como es de publico conocimiento",
  "cabe resaltar sin duda alguna",
  "es obvio que",
  "todos los expertos coinciden en que",
  "hoy en dia en la sociedad actual",
  "por asi decirlo",
  "de alguna u otra manera",
  "para resumir de forma rapida",
  "no cabe duda que",
  "vale la pena mencionar",
];

export const CAUSAL_CONNECTORS = [
  "por lo tanto",
  "en consecuencia",
  "dado que",
  "puesto que",
  "sin embargo",
  "no obstante",
  "a pesar de",
  "debido a",
  "demuestra que",
  "se infiere",
  "por ende",
  "en contraste",
  "mientras que",
  "consecuentemente",
  "determina que",
  "condiciona",
  "correlaciona",
];

export const PRESET_ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: "med-shock",
    title: "Fisiopatología del Shock Séptico y Cascada Inflamatoria",
    discipline: "Medicina / Salud",
    promptText:
      "Desarrolle los mecanismos hemodinámicos y moleculares del shock séptico. Explique la liberación de citocinas proinflamatorias (TNF-alfa, IL-1, IL-6), la disfunción endotelial, la vasodilatación refractaria mediada por óxido nítrico y la deuda de oxígeno tisular.",
    targetWords: 350,
    timeLimitMinutes: 20,
    keywords: ["endotelio", "citocinas", "oxido nitrico", "vasodilatacion", "lactato", "hipoperfusion", "gasto cardiaco", "permeabilidad", "microcirculacion"],
    rubricHint: "Evaluar precisión de la respuesta inmunoinflamatoria celular y secuencia de falla multiorgánica.",
  },
  {
    id: "law-proportionality",
    title: "Principio de Proporcionalidad y Control de Constitucionalidad",
    discipline: "Derecho / Jurídico",
    promptText:
      "Examine el principio de proporcionalidad como límite al poder punitivo y regulatorio estatal. Desarrolle sus tres subprincipios según la doctrina constitucional (idoneidad, necesidad y proporcionalidad en sentido estricto o ponderación).",
    targetWords: 400,
    timeLimitMinutes: 25,
    keywords: ["idoneidad", "necesidad", "ponderacion", "constitucionalidad", "derechos fundamentales", "garantias", "razonabilidad", "restriccion", "test"],
    rubricHint: "Verificar distinción clara entre idoneidad fáctica, medio menos lesivo y juicio de ponderación axiológica.",
  },
  {
    id: "eng-nyquist",
    title: "Teorema de Muestreo de Nyquist-Shannon y Fenómeno de Aliasing",
    discipline: "Ingeniería / Exactas",
    promptText:
      "Fundamente matemáticamente el teorema de muestreo de señales continuas en tiempo discreto. Explique por qué la frecuencia de muestreo debe ser al menos el doble del ancho de banda máximo (fs >= 2*B), cómo se manifiesta el aliasing en el dominio frecuencial y el rol del filtro antialiasing.",
    targetWords: 300,
    timeLimitMinutes: 20,
    keywords: ["frecuencia", "muestreo", "ancho de banda", "aliasing", "filtro", "fourier", "espectro", "convolucion", "discreto"],
    rubricHint: "Comprobar fundamentación en el dominio de Fourier y justificación del filtrado pasa-bajos previo al conversor ADC.",
  },
  {
    id: "soc-hegel",
    title: "La Dialéctica del Amo y el Esclavo en Hegel",
    discipline: "Humanidades / Sociales",
    promptText:
      "Analice el pasaje de la autoconciencia en la Fenomenología del Espíritu. Explique la lucha a muerte por el reconocimiento, el miedo a la muerte absoluta, el trabajo formativo del esclavo y la inversión dialéctica de la soberanía.",
    targetWords: 350,
    timeLimitMinutes: 25,
    keywords: ["autoconciencia", "reconocimiento", "dialéctica", "trabajo", "miedo", "soberania", "alienacion", "mediacion", "espiritu"],
    rubricHint: "Identificar cómo el trabajo del siervo transforma la naturaleza y supera la mera inmediatez del amo.",
  },
];

/**
 * Counts words cleanly in text
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Normalizes text removing accents for lenient keyword matching
 */
export function normalizeSearchTerm(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Evaluates verbiage and filler frequency ("Detector de Humo")
 */
export function evaluateVerbiage(text: string): { fillerCount: number; verbiageRatioPct: number } {
  if (!text.trim()) return { fillerCount: 0, verbiageRatioPct: 0 };
  const lower = text.toLowerCase();
  let fillerCount = 0;
  let matchedChars = 0;

  for (const filler of COMMON_ACADEMIC_FILLERS) {
    let pos = lower.indexOf(filler);
    while (pos !== -1) {
      fillerCount++;
      matchedChars += filler.length;
      pos = lower.indexOf(filler, pos + filler.length);
    }
  }

  const totalChars = Math.max(1, text.length);
  const verbiageRatioPct = Math.min(100, Math.round((matchedChars / totalChars) * 100));

  return { fillerCount, verbiageRatioPct };
}

/**
 * Analyzes presence of university essay structure components
 */
export function analyzeStructure(text: string): SectionAnalysis {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 25);
  const lower = text.toLowerCase();

  const hasIntroduction =
    paragraphs.length > 0 &&
    (paragraphs[0].length > 40 ||
      lower.includes("objetivo") ||
      lower.includes("en el presente") ||
      lower.includes("se aborda") ||
      lower.includes("en primer lugar") ||
      lower.includes("este trabajo") ||
      lower.includes("se define"));

  const hasArgumentation =
    paragraphs.length >= 2 ||
    CAUSAL_CONNECTORS.some((conn) => lower.includes(conn));

  const hasCounterArgument =
    lower.includes("sin embargo") ||
    lower.includes("no obstante") ||
    lower.includes("por el contrario") ||
    lower.includes("en contraste") ||
    lower.includes("a pesar de") ||
    lower.includes("caso limite") ||
    lower.includes("excepcion") ||
    lower.includes("limite");

  const hasConclusion =
    paragraphs.length >= 3 &&
    (lower.includes("en conclusion") ||
      lower.includes("por lo tanto") ||
      lower.includes("en sintesis") ||
      lower.includes("finalmente") ||
      lower.includes("en resumen") ||
      lower.includes("se desprende que") ||
      lower.includes("se concluye"));

  return {
    hasIntroduction,
    hasArgumentation,
    hasCounterArgument,
    hasConclusion,
  };
}

/**
 * Main evaluation engine for open-ended university essays
 */
export function evaluateEssay(
  text: string,
  targetWords: number = 300,
  keywords: string[] = [],
): EssayRubricEvaluation {
  const words = countWords(text);
  const chars = text.length;

  if (words < 15) {
    return {
      conceptualScore: 1.0,
      structureScore: 1.0,
      criticalRigorScore: 1.0,
      clarityScore: 1.0,
      totalScore: 1.0,
      wordCount: words,
      charCount: chars,
      verbiageRatioPct: 0,
      fillerCount: 0,
      detectedKeywords: [],
      missingKeywords: keywords,
      sections: {
        hasIntroduction: false,
        hasArgumentation: false,
        hasCounterArgument: false,
        hasConclusion: false,
      },
      verdictCategory: "Insuficiente",
      feedback: ["El texto es demasiado breve para ser evaluado como examen de cátedra."],
    };
  }

  // 1. Conceptual Density Evaluation (35% weight)
  const normText = normalizeSearchTerm(text);
  const detectedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of keywords) {
    const normKw = normalizeSearchTerm(kw);
    if (normText.includes(normKw)) {
      detectedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  }

  let conceptualScore = 5.0; // Base score
  if (keywords.length > 0) {
    const keywordRatio = detectedKeywords.length / keywords.length;
    conceptualScore = Math.min(10, Math.max(1, keywordRatio * 10));
  } else {
    // If no keywords specified, estimate by vocabulary richness
    const uniqueWords = new Set(normText.split(/\s+/).filter((w) => w.length > 4));
    const richnessRatio = uniqueWords.size / Math.max(1, words);
    conceptualScore = Math.min(10, Math.max(3, richnessRatio * 15));
  }

  // 2. Structural Cohesion (25% weight)
  const sections = analyzeStructure(text);
  let structurePoints = 2; // base
  if (sections.hasIntroduction) structurePoints += 2.5;
  if (sections.hasArgumentation) structurePoints += 2.5;
  if (sections.hasCounterArgument) structurePoints += 1.5;
  if (sections.hasConclusion) structurePoints += 1.5;
  const structureScore = Math.min(10, Math.max(1, structurePoints));

  // 3. Critical Rigor and Connectors (20% weight)
  let connectorMatches = 0;
  const lower = text.toLowerCase();
  for (const conn of CAUSAL_CONNECTORS) {
    if (lower.includes(conn)) connectorMatches++;
  }
  let criticalRigorScore = Math.min(10, Math.max(2, 3 + connectorMatches * 1.4));

  // Penalty or adjustment for word count target
  const lengthRatio = words / Math.max(50, targetWords);
  if (lengthRatio < 0.5) {
    // Severely underdeveloped
    conceptualScore *= 0.7;
    criticalRigorScore *= 0.6;
  }

  // 4. Clarity and Verbiage ("Detector de Humo") (20% weight)
  const { fillerCount, verbiageRatioPct } = evaluateVerbiage(text);
  let clarityScore = 10;
  if (fillerCount > 0) {
    clarityScore = Math.max(1, 10 - fillerCount * 1.5 - verbiageRatioPct * 0.2);
  }

  // Calculate Weighted Total Score over 10.0
  const weighted =
    conceptualScore * 0.35 +
    structureScore * 0.25 +
    criticalRigorScore * 0.20 +
    clarityScore * 0.20;

  const totalScore = Math.round(Math.min(10, Math.max(1, weighted)) * 10) / 10;

  // Verdict and Feedback
  let verdictCategory: EssayRubricEvaluation["verdictCategory"];
  if (totalScore >= 9.0) verdictCategory = "Sobresaliente";
  else if (totalScore >= 7.0) verdictCategory = "Distinguido";
  else if (totalScore >= 4.0) verdictCategory = "Aprobado / Regular";
  else verdictCategory = "Insuficiente";

  const feedback: string[] = [];

  if (detectedKeywords.length > 0) {
    feedback.push(`Uso solvente de ${detectedKeywords.length} conceptos clave requeridos de cátedra.`);
  }
  if (missingKeywords.length > 0) {
    feedback.push(`Conceptos no incorporados: ${missingKeywords.slice(0, 4).join(", ")}.`);
  }
  if (!sections.hasCounterArgument) {
    feedback.push("Se recomienda incluir casos de borde, excepciones o contra-argumentos para elevar el rigor.");
  }
  if (!sections.hasConclusion) {
    feedback.push("Falta un párrafo de síntesis o tesis de cierre contundente.");
  }
  if (fillerCount >= 2) {
    feedback.push(`Se detectaron ${fillerCount} frases vacías o verborragia ("humo"). Priorizar densidad léxica concisa.`);
  }
  if (words < targetWords * 0.7) {
    feedback.push(`Desarrollo por debajo del objetivo (${words}/${targetWords} palabras recomendadas).`);
  }

  if (feedback.length === 0) {
    feedback.push("Desarrollo conceptual equilibrado, con buena hilación lógica y fundamentación sólida.");
  }

  return {
    conceptualScore: Math.round(conceptualScore * 10) / 10,
    structureScore: Math.round(structureScore * 10) / 10,
    criticalRigorScore: Math.round(criticalRigorScore * 10) / 10,
    clarityScore: Math.round(clarityScore * 10) / 10,
    totalScore,
    wordCount: words,
    charCount: chars,
    verbiageRatioPct,
    fillerCount,
    detectedKeywords,
    missingKeywords,
    sections,
    verdictCategory,
    feedback,
  };
}

/**
 * Persists an essay exam attempt in db.sessions
 */
export async function saveEssaySessionRecord(
  promptTitle: string,
  durationSec: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void promptTitle;
  const recordId = `essay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "essay-exam",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
