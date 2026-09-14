import { db, type AcademicChunkRecord, type AcademicEvaluationRecord } from "../../db/db";

export interface SocraticEvaluationResult {
  evaluationId: string;
  masteryScore: number;
  diagnosticCategory: AcademicEvaluationRecord["diagnosticCategory"];
  entailedPoints: string[];
  omissions: Array<{ missingPoint: string; severity: "high" | "medium" | "low"; impact: string }>;
  contradictions: Array<{ claim: string; correction: string }>;
  socraticQuestion: string;
  citationProof: {
    page: number;
    paragraph: number;
    exactSnippet: string;
  };
}

/**
 * Categorical Socratic Evaluator
 * Audits the student's verbal or written recall against the exact academic text source.
 */
export async function evaluateStudentExplanation(params: {
  chunk: AcademicChunkRecord;
  studentExplanation: string;
  conceptId?: string;
}): Promise<SocraticEvaluationResult> {
  const { chunk, studentExplanation, conceptId = "concept-general" } = params;
  const sourceText = chunk.rawContent;
  const studentLower = studentExplanation.toLowerCase();

  // Extract core concepts and formulas from the source chunk
  const sourceTokens = sourceText
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  const uniqueSourceKeywords = Array.from(new Set(sourceTokens));
  const totalTargetPoints = Math.max(3, Math.min(8, Math.floor(uniqueSourceKeywords.length / 3)));

  // 1. Identify Entailed Points (Aciertos confirmados)
  const entailed: string[] = [];
  const matchedKeywords: string[] = [];

  for (const kw of uniqueSourceKeywords) {
    if (studentLower.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length >= 2) {
    entailed.push(`Identificación correcta de términos fundamentales: ${matchedKeywords.slice(0, 4).join(", ")}.`);
  }
  if (studentLower.includes("flujo") && studentLower.includes("tiempo")) {
    entailed.push("Comprensión de la tasa de variación temporal del flujo magnético.");
  }
  if (studentLower.includes("real") || studentLower.includes("autovalor")) {
    entailed.push("Identificación del espectro real de autovalores en operadores autoadjuntos.");
  }
  if (studentLower.includes("negativo") || studentLower.includes("opone") || studentLower.includes("lenz")) {
    entailed.push("Deducción acertada del principio de oposición física (Ley de Lenz).");
  }

  // 2. Identify Critical Omissions (Lagunas de hipótesis o condiciones de borde)
  const omissions: Array<{ missingPoint: string; severity: "high" | "medium" | "low"; impact: string }> = [];

  if (chunk.latexFormulas.length > 0 && !studentLower.includes("=") && !studentLower.includes("integral") && !studentLower.includes("derivada")) {
    omissions.push({
      missingPoint: "Estructura formal de la ecuación o relación de proporcionalidad.",
      severity: "high",
      impact: "La explicación carece del rigor algebraico o diferencial del teorema.",
    });
  }

  if (sourceText.toLowerCase().includes("demostración") && !studentLower.includes("stokes") && !studentLower.includes("maxwell") && !studentLower.includes("conjugado")) {
    omissions.push({
      missingPoint: "Mecanismo deductivo central de la demostración.",
      severity: "medium",
      impact: "Se recuerda la conclusión pero no el lema o teorema integral que la sustenta.",
    });
  }

  if (sourceText.toLowerCase().includes("hermítico") && !studentLower.includes("adjunto") && !studentLower.includes("hilbert")) {
    omissions.push({
      missingPoint: "Condición de coincidencia con el operador adjunto en el espacio de Hilbert.",
      severity: "high",
      impact: "Definición matemática incompleta del operador cuántico.",
    });
  }

  // 3. Identify Contradictions / Hallucinations
  const contradictions: Array<{ claim: string; correction: string }> = [];

  if (studentLower.includes("positivo") && sourceText.toLowerCase().includes("negativa")) {
    contradictions.push({
      claim: "Se afirmó signo positivo en la inducción.",
      correction: "La fem inducida tiene signo negativo (-dΦ/dt) por conservación de energía (Lenz).",
    });
  }
  if (studentLower.includes("complejo") && studentLower.includes("autovalor real")) {
    contradictions.push({
      claim: "Confusión entre escalares complejos arbitrarios y autovalores hermíticos.",
      correction: "Los autovalores de un operador Hermítico son forzosamente reales sin parte imaginaria.",
    });
  }

  // 4. Compute Mastery Score (0 - 100%)
  const eCount = Math.max(1, entailed.length);
  const oCount = omissions.length;
  const cCount = contradictions.length;

  const rawScore = (0.55 * (eCount / totalTargetPoints) + 0.30 * Math.max(0, 1 - oCount / 3) - 0.25 * (cCount / 2)) * 100;
  const masteryScore = Math.min(100, Math.max(10, Math.round(rawScore)));

  let diagnosticCategory: AcademicEvaluationRecord["diagnosticCategory"] = "comprension_parcial";
  if (masteryScore >= 85 && cCount === 0) diagnosticCategory = "dominio_completo";
  else if (masteryScore >= 70 && cCount === 0) diagnosticCategory = "comprension_solida";
  else if (cCount > 0 || masteryScore < 45) diagnosticCategory = "lagunas_criticas";

  // 5. Generate Adaptive Socratic Question
  let socraticQuestion = `¿Cómo se comporta este principio si invertimos la condición de contorno en la página ${chunk.pageNumber}?`;
  if (omissions.length > 0) {
    socraticQuestion = `Tu síntesis omitió "${omissions[0].missingPoint}". ¿Por qué esta hipótesis es indispensable para que el teorema no se invalide?`;
  } else if (contradictions.length > 0) {
    socraticQuestion = `Detectamos una contradicción: ${contradictions[0].correction} ¿Qué analogía física o demostración matemática resuelve este error?`;
  }

  const evaluationId = `eval-${Date.now().toString(36)}`;
  const citationSnippet = chunk.rawContent.split("\n")[1]?.slice(0, 120) || chunk.rawContent.slice(0, 120);

  const result: SocraticEvaluationResult = {
    evaluationId,
    masteryScore,
    diagnosticCategory,
    entailedPoints: entailed,
    omissions,
    contradictions,
    socraticQuestion,
    citationProof: {
      page: chunk.pageNumber,
      paragraph: chunk.paragraphIndex,
      exactSnippet: citationSnippet,
    },
  };

  // Persist evaluation in db
  await db.academicEvaluations.add({
    id: evaluationId,
    conceptId,
    sourceId: chunk.sourceId,
    studentExplanation,
    masteryScore,
    diagnosticCategory,
    entailedPoints: entailed,
    omissions,
    contradictions,
    citationProof: result.citationProof,
    socraticQuestion,
    evaluatedAt: Date.now(),
  });

  return result;
}
