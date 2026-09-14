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
 * Universal Socratic Evaluator
 * Audits the student's verbal or written recall against any academic text source,
 * detecting scientific omissions, formula presence, and logical boundaries dynamically.
 */
export async function evaluateStudentExplanation(params: {
  chunk: AcademicChunkRecord;
  studentExplanation: string;
  conceptId?: string;
}): Promise<SocraticEvaluationResult> {
  const { chunk, studentExplanation, conceptId = "concept-general" } = params;
  const sourceText = chunk.rawContent;
  const studentLower = studentExplanation.toLowerCase();

  // 1. Extract significant keywords and academic terms (>= 4 letters, excluding common stop words)
  const stopWords = new Set([
    "para", "como", "este", "esta", "estos", "estas", "porque", "cuando",
    "donde", "entre", "sobre", "desde", "hasta", "hacia", "según", "segun",
    "tiene", "forma", "puede", "pueden", "cual", "cuales", "cada", "todo",
    "todos", "todas", "pero", "sino", "bien", "luego", "tanto", "otro", "otra"
  ]);

  const sourceTokens = sourceText
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  const uniqueSourceKeywords = Array.from(new Set(sourceTokens));
  const totalTargetPoints = Math.max(3, Math.min(8, Math.floor(uniqueSourceKeywords.length / 2.5)));

  // 2. Identify Entailed Points (Aciertos conceptuales verificados)
  const entailed: string[] = [];
  const matchedKeywords: string[] = [];

  for (const kw of uniqueSourceKeywords) {
    if (studentLower.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }

  if (matchedKeywords.length >= 2) {
    entailed.push(`Identificación correcta de nociones teóricas: "${matchedKeywords.slice(0, 4).join('", "')}".`);
  }
  if (matchedKeywords.length >= 5) {
    entailed.push("Articulación léxica de alta fidelidad con el texto de cátedra.");
  }

  // 3. Identify Critical Omissions (Lagunas en fórmulas, teoremas o hipótesis)
  const omissions: Array<{ missingPoint: string; severity: "high" | "medium" | "low"; impact: string }> = [];

  // Check for omission of equations if the source document includes formal mathematical formulas
  if (chunk.latexFormulas.length > 0) {
    const hasMathSymbols = /[=+\-*/^∫∑∂√]/.test(studentExplanation) ||
      /\b(igual|proporcional|derivada|integral|matriz|vector|sumatoria|operador)\b/i.test(studentExplanation);

    if (!hasMathSymbols) {
      omissions.push({
        missingPoint: "Formulación analítica o relación matemática explícita.",
        severity: "high",
        impact: "La respuesta es puramente narrativa y carece del rigor algebraico o analítico expuesto en el apunte.",
      });
    }
  }

  // Check if chunk describes a proof or theorem and student missed foundational hypothesis
  if (/teorema|demostraci[oó]n|hip[oó]tesis|lema|definici[oó]n/i.test(sourceText)) {
    const mentionsHypothesis = /\b(si|dado|sea|condici[oó]n|supuesto|hip[oó]tesis|axioma)\b/i.test(studentLower);
    if (!mentionsHypothesis) {
      omissions.push({
        missingPoint: "Condición de contorno o hipótesis de partida indispensable.",
        severity: "medium",
        impact: "Se enuncia el resultado sin delimitar el dominio de validez o sus restricciones.",
      });
    }
  }

  // Check for unmatched prominent keywords in chunk
  const missedProminentKeywords = uniqueSourceKeywords
    .filter((kw) => !studentLower.includes(kw))
    .slice(0, 2);

  if (missedProminentKeywords.length > 0 && matchedKeywords.length < 3) {
    omissions.push({
      missingPoint: `Concepto central no integrado: "${missedProminentKeywords.join(" / ")}".`,
      severity: "medium",
      impact: "La síntesis omite elementos sustanciales para la comprensión integral del fenómeno.",
    });
  }

  // 4. Identify Contradictions / False Claims
  const contradictions: Array<{ claim: string; correction: string }> = [];

  // Universal physical/mathematical directionality checks
  if (/\b(positivo|aumenta|crece)\b/i.test(studentLower) && /\b(negativ[ao]|disminuye|decae|opone|invers[ao])\b/i.test(sourceText.toLowerCase())) {
    contradictions.push({
      claim: "Inversión de signo o sentido de variación.",
      correction: "El texto formal estipula una relación negativa o de oposición estricta.",
    });
  } else if (/\b(independiente|arbitrario|cualquiera)\b/i.test(studentLower) && /\b(ortogonal|restringido|estricto|solo si|únicamente)\b/i.test(sourceText.toLowerCase())) {
    contradictions.push({
      claim: "Generalización indebida de condiciones.",
      correction: "La proposición exige restricciones rigurosas sobre el espacio o los parámetros.",
    });
  }

  // 5. Compute Mastery Score (0 - 100%)
  const eCount = Math.max(1, entailed.length);
  const oCount = omissions.length;
  const cCount = contradictions.length;

  const rawScore = (0.35 * (matchedKeywords.length / Math.max(2, totalTargetPoints)) + 0.25 * Math.min(1, eCount / 2) + 0.25 * Math.max(0, 1 - oCount / 3) - 0.30 * cCount) * 100;
  const masteryScore = Math.min(100, Math.max(12, Math.round(rawScore)));

  let diagnosticCategory: AcademicEvaluationRecord["diagnosticCategory"] = "comprension_parcial";
  if (masteryScore >= 85 && cCount === 0) diagnosticCategory = "dominio_completo";
  else if (masteryScore >= 70 && cCount === 0) diagnosticCategory = "comprension_solida";
  else if (cCount > 0 || masteryScore < 45) diagnosticCategory = "lagunas_criticas";

  // 6. Generate Context-Aware Socratic Question
  let socraticQuestion = `¿Qué hipótesis en la página ${chunk.pageNumber} garantiza que este comportamiento sea universal y no un caso particular?`;

  if (contradictions.length > 0) {
    socraticQuestion = `Advierto un error de principio: ${contradictions[0].correction} ¿Qué principio de conservación o axioma fundamental se violaría si su afirmación fuera correcta?`;
  } else if (omissions.length > 0) {
    socraticQuestion = `Su exposición prescindió de "${omissions[0].missingPoint}". ¿Por qué esta premisa es estrictamente indispensable para no invalidar el teorema?`;
  } else if (chunk.latexFormulas.length > 0) {
    socraticQuestion = `A partir de la formulación analítica de la página ${chunk.pageNumber}, ¿qué ocurriría si aplicamos una perturbación en las condiciones iniciales?`;
  }

  const evaluationId = `eval-${Date.now().toString(36)}`;
  const citationSnippet = chunk.rawContent.split("\n")[1]?.slice(0, 140) || chunk.rawContent.slice(0, 140);

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

  // Persist evaluation in IndexedDB
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
