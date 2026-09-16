import { db, type StudentErrorRecord, type StudentErrorCategory } from "../../db/db";

/**
 * Heurística para clasificar automáticamente un error del estudiante
 * cuando no se cuente con un modelo de lenguaje o como categorización primaria.
 */
export function classifyErrorAutomatically(params: {
  studentAnswer: string;
  expectedAnswer: string;
  explanation?: string;
  hasContradictionWithSource?: boolean;
}): StudentErrorCategory {
  const { studentAnswer, expectedAnswer, hasContradictionWithSource } = params;
  const sLower = studentAnswer.toLowerCase().trim();
  const eLower = expectedAnswer.toLowerCase().trim();

  // 1. Contradicción directa con la fuente o axioma
  if (hasContradictionWithSource) {
    return "misconception";
  }

  // 2. Error puramente numérico o de signo (ej: "4.5" vs "-4.5" o "12" vs "21")
  const isStudentNumeric = /^-?\d+(\.\d+)?$/.test(sLower);
  const isExpectedNumeric = /^-?\d+(\.\d+)?$/.test(eLower);
  if (isStudentNumeric && isExpectedNumeric) {
    if (sLower === `-${eLower}` || `-${sLower}` === eLower) {
      return "calculation_error"; // Error de signo
    }
    return "calculation_error";
  }

  // 3. Omisión de hipótesis o respuesta en blanco / no sé
  if (sLower.length === 0 || sLower.includes("no sé") || sLower.includes("no recuerdo") || sLower.length < 5) {
    return "knowledge_gap";
  }

  // 4. Inversión o confusión procedimental (ej: derivar en vez de integrar)
  if (
    (sLower.includes("deriv") && eLower.includes("integ")) ||
    (sLower.includes("multiplic") && eLower.includes("divid")) ||
    (sLower.includes("serie") && eLower.includes("paralelo"))
  ) {
    return "procedure_error";
  }

  // 5. Por defecto: laguna conceptual
  return "knowledge_gap";
}

/**
 * Registra un nuevo error significativo en el Error Bank.
 * Si ya existe un error similar no resuelto para el mismo concepto, incrementa su conteo de repeticiones.
 */
export async function recordStudentError(params: {
  conceptId: string;
  conceptName: string;
  subjectId?: string;
  category?: StudentErrorCategory;
  originalExercise: string;
  studentAnswer: string;
  expectedAnswer: string;
  explanation: string;
  citationProof?: {
    sourceTitle: string;
    page: number;
    snippet: string;
  };
}): Promise<StudentErrorRecord> {
  const {
    conceptId,
    conceptName,
    subjectId,
    category,
    originalExercise,
    studentAnswer,
    expectedAnswer,
    explanation,
    citationProof,
  } = params;

  // Clasificación automática si no fue provista explícitamente
  const resolvedCategory =
    category ||
    classifyErrorAutomatically({
      studentAnswer,
      expectedAnswer,
      explanation,
    });

  // Buscar si ya existe un error similar no resuelto para este concepto
  const existingUnresolved = await db.studentErrors
    .where("conceptId")
    .equals(conceptId)
    .filter((e) => !e.resolved && e.category === resolvedCategory)
    .first();

  if (existingUnresolved) {
    const updatedCount = existingUnresolved.repetitionCount + 1;
    await db.studentErrors.update(existingUnresolved.id, {
      repetitionCount: updatedCount,
      timestamp: Date.now(),
      studentAnswer,
      explanation,
    });
    return {
      ...existingUnresolved,
      repetitionCount: updatedCount,
      studentAnswer,
      explanation,
      timestamp: Date.now(),
    };
  }

  const newError: StudentErrorRecord = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    conceptId,
    conceptName,
    subjectId,
    category: resolvedCategory,
    originalExercise,
    studentAnswer,
    expectedAnswer,
    explanation,
    citationProof,
    timestamp: Date.now(),
    repetitionCount: 1,
    resolved: false,
  };

  await db.studentErrors.put(newError);
  return newError;
}

/**
 * Marca un error como resuelto tras una práctica exitosa.
 */
export async function markErrorResolved(errorId: string): Promise<void> {
  await db.studentErrors.update(errorId, { resolved: true });
}

/**
 * Obtiene el resumen de errores repetidos agrupados por concepto.
 */
export async function getRepeatedErrorsSummary(): Promise<
  Array<{
    conceptId: string;
    conceptName: string;
    unresolvedCount: number;
    totalRepetitions: number;
    dominantCategory: StudentErrorCategory;
    latestErrorTimestamp: number;
  }>
> {
  const unresolved = await db.studentErrors.filter((e) => !e.resolved).toArray();
  const map = new Map<
    string,
    {
      conceptId: string;
      conceptName: string;
      unresolvedCount: number;
      totalRepetitions: number;
      categories: Record<string, number>;
      latestErrorTimestamp: number;
    }
  >();

  for (const err of unresolved) {
    let entry = map.get(err.conceptId);
    if (!entry) {
      entry = {
        conceptId: err.conceptId,
        conceptName: err.conceptName,
        unresolvedCount: 0,
        totalRepetitions: 0,
        categories: {},
        latestErrorTimestamp: err.timestamp,
      };
      map.set(err.conceptId, entry);
    }
    entry.unresolvedCount += 1;
    entry.totalRepetitions += err.repetitionCount;
    entry.categories[err.category] = (entry.categories[err.category] || 0) + 1;
    if (err.timestamp > entry.latestErrorTimestamp) {
      entry.latestErrorTimestamp = err.timestamp;
    }
  }

  return Array.from(map.values())
    .map((item) => {
      let dominantCat: StudentErrorCategory = "knowledge_gap";
      let maxCount = -1;
      for (const [cat, cnt] of Object.entries(item.categories)) {
        if (cnt > maxCount) {
          maxCount = cnt;
          dominantCat = cat as StudentErrorCategory;
        }
      }
      return {
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        unresolvedCount: item.unresolvedCount,
        totalRepetitions: item.totalRepetitions,
        dominantCategory: dominantCat,
        latestErrorTimestamp: item.latestErrorTimestamp,
      };
    })
    .sort((a, b) => b.totalRepetitions - a.totalRepetitions);
}
