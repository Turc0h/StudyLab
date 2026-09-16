/**
 * Normaliza una expresión matemática o textual para evaluación Typed Recall,
 * eliminando diferencias puramente sintácticas o cosméticas.
 */
export function normalizeMathExpression(raw: string): string {
  if (!raw) return "";

  let s = raw.trim().toLowerCase();

  // 1. Normalizar operadores de multiplicación
  s = s.replace(/\\cdot/g, "*");
  s = s.replace(/\\times/g, "*");
  s = s.replace(/×/g, "*");
  s = s.replace(/·/g, "*");

  // 2. Normalizar multiplicaciones implícitas como "m a" o "m*a"
  s = s.replace(/(\w)\s+(\w)/g, "$1*$2");

  // 3. Normalizar signos de igualdad y flechas
  s = s.replace(/\\rightarrow/g, "->");
  s = s.replace(/\\Rightarrow/g, "=>");

  // 4. Eliminar comandos KaTeX/LaTeX cosméticos como \mathbf, \mathrm, \text, \left, \right
  s = s.replace(/\\(mathbf|mathrm|mathit|text)\{([^}]+)\}/g, "$2");
  s = s.replace(/\\(left|right|displaystyle)/g, "");

  // 5. Normalizar potencias como a^2
  s = s.replace(/\^\{([^}]+)\}/g, "^$1");

  // 6. Eliminar todos los espacios residuales alrededor de operadores
  s = s.replace(/\s*([=+\-*/^(),])\s*/g, "$1");
  s = s.replace(/\s+/g, " ");

  return s.trim();
}

/**
 * Comprueba equivalencias conmutativas elementales como:
 * "m*a" === "a*m" o "a+b" === "b+a" o "F=m*a" === "F=a*m"
 */
function areCommutativelyEquivalent(a: string, b: string): boolean {
  if (a === b) return true;

  // Si contiene igualdad ("LHS=RHS"), comparar lados
  if (a.includes("=") && b.includes("=")) {
    const [lhsA, rhsA] = a.split("=");
    const [lhsB, rhsB] = b.split("=");
    if (lhsA === lhsB && areCommutativelyEquivalent(rhsA, rhsB)) {
      return true;
    }
  }

  // Equivalencia en sumas o multiplicaciones de dos factores
  if (a.includes("*") && b.includes("*")) {
    const partsA = a.split("*").sort().join("*");
    const partsB = b.split("*").sort().join("*");
    if (partsA === partsB) return true;
  }

  if (a.includes("+") && b.includes("+")) {
    const partsA = a.split("+").sort().join("+");
    const partsB = b.split("+").sort().join("+");
    if (partsA === partsB) return true;
  }

  return false;
}

/**
 * Verifica equivalencia numérica aproximada (ej: 0.5 vs 1/2 o 3.14 vs 3.1416)
 */
function checkNumericEquivalence(a: string, b: string): boolean | null {
  const parseNum = (str: string): number | null => {
    if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
    const fracMatch = str.match(/^(-?\d+)\/(\d+)$/);
    if (fracMatch) {
      const num = parseFloat(fracMatch[1]);
      const den = parseFloat(fracMatch[2]);
      if (den !== 0) return num / den;
    }
    return null;
  };

  const numA = parseNum(a);
  const numB = parseNum(b);

  if (numA !== null && numB !== null) {
    return Math.abs(numA - numB) < 1e-4;
  }
  return null;
}

export interface TypedRecallEvaluation {
  isCorrect: boolean;
  similarityRatio: number;
  normalizedStudent: string;
  normalizedExpected: string;
  feedback: string;
}

/**
 * Evalúa la respuesta de autoevaluación escrita (Typed Recall).
 */
export function evaluateTypedRecallAnswer(params: {
  studentAnswer: string;
  expectedAnswer: string;
}): TypedRecallEvaluation {
  const { studentAnswer, expectedAnswer } = params;

  const normStudent = normalizeMathExpression(studentAnswer);
  const normExpected = normalizeMathExpression(expectedAnswer);

  // 1. Coincidencia exacta post-normalización
  if (normStudent === normExpected) {
    return {
      isCorrect: true,
      similarityRatio: 1.0,
      normalizedStudent: normStudent,
      normalizedExpected: normExpected,
      feedback: "¡Respuesta exacta! Consistencia formal validada.",
    };
  }

  // 2. Equivalencia conmutativa
  if (areCommutativelyEquivalent(normStudent, normExpected)) {
    return {
      isCorrect: true,
      similarityRatio: 0.98,
      normalizedStudent: normStudent,
      normalizedExpected: normExpected,
      feedback: "¡Correcto! Expresión algebraicamente equivalente respetando conmutatividad.",
    };
  }

  // 3. Equivalencia numérica o fraccionaria
  const numEq = checkNumericEquivalence(normStudent, normExpected);
  if (numEq === true) {
    return {
      isCorrect: true,
      similarityRatio: 1.0,
      normalizedStudent: normStudent,
      normalizedExpected: normExpected,
      feedback: "¡Correcto! Equivalencia numérica verificada.",
    };
  }

  // 4. Coincidencia textual flexible si es un concepto en palabras
  const sWords = normStudent.split(/\W+/).filter(Boolean);
  const eWords = normExpected.split(/\W+/).filter(Boolean);
  if (eWords.length > 0) {
    let matched = 0;
    for (const w of eWords) {
      if (sWords.includes(w)) matched++;
    }
    const overlap = matched / eWords.length;
    if (overlap >= 0.85) {
      return {
        isCorrect: true,
        similarityRatio: Number(overlap.toFixed(2)),
        normalizedStudent: normStudent,
        normalizedExpected: normExpected,
        feedback: "¡Muy bien! Concepto fundamentalmente capturado con precisión terminológica.",
      };
    }
    if (overlap >= 0.5) {
      return {
        isCorrect: false,
        similarityRatio: Number(overlap.toFixed(2)),
        normalizedStudent: normStudent,
        normalizedExpected: normExpected,
        feedback: "Aproximación incompleta: faltan términos o restricciones formales del axioma.",
      };
    }
  }

  return {
    isCorrect: false,
    similarityRatio: 0.2,
    normalizedStudent: normStudent,
    normalizedExpected: normExpected,
    feedback: "Discrepancia formal con el teorema o definición oficial de cátedra.",
  };
}
