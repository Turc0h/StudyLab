import { db, type StudentErrorCategory } from "../../db/db";

// Vector de dimensiones base en el SI: [L, M, T, I, Theta, N, J]
// L: Longitud (m)
// M: Masa (kg)
// T: Tiempo (s)
// I: Corriente (A)
// Theta: Temperatura (K)
// N: Cantidad de sustancia (mol)
// J: Intensidad luminosa (cd)
export type DimensionVector = [number, number, number, number, number, number, number];

export interface DimensionVerificationResult {
  valid: boolean;
  lhsSymbol: string;
  lhsUnit: string;
  lhsVector: DimensionVector;
  rhsExpression: string;
  rhsUnit: string;
  rhsVector: DimensionVector;
  explanation: string;
  suggestedErrorCategory?: StudentErrorCategory;
}

const DIM_ZERO: DimensionVector = [0, 0, 0, 0, 0, 0, 0];

const BASE_AND_DERIVED_UNITS: Record<string, { vector: DimensionVector; symbol: string }> = {
  // Base
  m: { vector: [1, 0, 0, 0, 0, 0, 0], symbol: "m" },
  kg: { vector: [0, 1, 0, 0, 0, 0, 0], symbol: "kg" },
  s: { vector: [0, 0, 1, 0, 0, 0, 0], symbol: "s" },
  A: { vector: [0, 0, 0, 1, 0, 0, 0], symbol: "A" },
  K: { vector: [0, 0, 0, 0, 1, 0, 0], symbol: "K" },
  mol: { vector: [0, 0, 0, 0, 0, 1, 0], symbol: "mol" },
  cd: { vector: [0, 0, 0, 0, 0, 0, 1], symbol: "cd" },

  // Derivadas
  N: { vector: [1, 1, -2, 0, 0, 0, 0], symbol: "N" }, // kg·m/s²
  J: { vector: [2, 1, -2, 0, 0, 0, 0], symbol: "J" }, // N·m = kg·m²/s²
  W: { vector: [2, 1, -3, 0, 0, 0, 0], symbol: "W" }, // J/s = kg·m²/s³
  Pa: { vector: [-1, 1, -2, 0, 0, 0, 0], symbol: "Pa" }, // N/m²
  C: { vector: [0, 0, 1, 1, 0, 0, 0], symbol: "C" }, // A·s
  V: { vector: [2, 1, -3, -1, 0, 0, 0], symbol: "V" }, // W/A
  ohm: { vector: [2, 1, -3, -2, 0, 0, 0], symbol: "Ω" }, // V/A
  F: { vector: [-2, -1, 4, 2, 0, 0, 0], symbol: "F" }, // C/V
  T: { vector: [0, 1, -2, -1, 0, 0, 0], symbol: "T" }, // N/(A·m)
  Wb: { vector: [2, 1, -2, -1, 0, 0, 0], symbol: "Wb" }, // T·m²
  H: { vector: [2, 1, -2, -2, 0, 0, 0], symbol: "H" }, // Wb/A
  Hz: { vector: [0, 0, -1, 0, 0, 0, 0], symbol: "Hz" }, // 1/s
  rad: { vector: [0, 0, 0, 0, 0, 0, 0], symbol: "rad" },
};

// Mapeo canónico de variables de física / ingeniería a sus dimensiones SI
const VARIABLE_DIMENSIONS: Record<string, { vector: DimensionVector; name: string; unitName: string }> = {
  // Cinemática y Mecánica
  x: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Posición / Desplazamiento", unitName: "m" },
  y: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Posición vertical", unitName: "m" },
  z: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Cota", unitName: "m" },
  d: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Distancia", unitName: "m" },
  r: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Radio", unitName: "m" },
  h: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Altura", unitName: "m" },
  L: { vector: [1, 0, 0, 0, 0, 0, 0], name: "Longitud", unitName: "m" },
  t: { vector: [0, 0, 1, 0, 0, 0, 0], name: "Tiempo", unitName: "s" },
  m: { vector: [0, 1, 0, 0, 0, 0, 0], name: "Masa", unitName: "kg" },
  M_mass: { vector: [0, 1, 0, 0, 0, 0, 0], name: "Masa puntual", unitName: "kg" },
  v: { vector: [1, 0, -1, 0, 0, 0, 0], name: "Velocidad", unitName: "m/s" },
  c: { vector: [1, 0, -1, 0, 0, 0, 0], name: "Velocidad de la luz", unitName: "m/s" },
  a: { vector: [1, 0, -2, 0, 0, 0, 0], name: "Aceleración", unitName: "m/s²" },
  g: { vector: [1, 0, -2, 0, 0, 0, 0], name: "Aceleración de la gravedad", unitName: "m/s²" },
  F: { vector: [1, 1, -2, 0, 0, 0, 0], name: "Fuerza", unitName: "N" },
  p_momentum: { vector: [1, 1, -1, 0, 0, 0, 0], name: "Cantidad de movimiento", unitName: "kg·m/s" },
  tau: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Torque / Momento", unitName: "N·m" },
  M: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Momento flector", unitName: "N·m" },
  W_work: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Trabajo mecánico", unitName: "J" },
  E: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Energía", unitName: "J" },
  U: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Energía potencial / Interna", unitName: "J" },
  K_energy: { vector: [2, 1, -2, 0, 0, 0, 0], name: "Energía cinética", unitName: "J" },
  P: { vector: [2, 1, -3, 0, 0, 0, 0], name: "Potencia", unitName: "W" },
  p_pressure: { vector: [-1, 1, -2, 0, 0, 0, 0], name: "Presión", unitName: "Pa" },
  rho: { vector: [-3, 1, 0, 0, 0, 0, 0], name: "Densidad volumétrica", unitName: "kg/m³" },

  // Electromagnetismo y Circuitos
  I: { vector: [0, 0, 0, 1, 0, 0, 0], name: "Corriente eléctrica", unitName: "A" },
  i: { vector: [0, 0, 0, 1, 0, 0, 0], name: "Corriente instantánea", unitName: "A" },
  q: { vector: [0, 0, 1, 1, 0, 0, 0], name: "Carga eléctrica", unitName: "C" },
  Q: { vector: [0, 0, 1, 1, 0, 0, 0], name: "Carga total", unitName: "C" },
  V: { vector: [2, 1, -3, -1, 0, 0, 0], name: "Potencial / Voltaje", unitName: "V" },
  R: { vector: [2, 1, -3, -2, 0, 0, 0], name: "Resistencia eléctrica", unitName: "Ω" },
  C: { vector: [-2, -1, 4, 2, 0, 0, 0], name: "Capacitancia", unitName: "F" },
  B: { vector: [0, 1, -2, -1, 0, 0, 0], name: "Campo magnético (Inducción)", unitName: "T" },
  Phi: { vector: [2, 1, -2, -1, 0, 0, 0], name: "Flujo magnético", unitName: "Wb" },
};

export function addDimensions(a: DimensionVector, b: DimensionVector): DimensionVector {
  return [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
    a[3] + b[3],
    a[4] + b[4],
    a[5] + b[5],
    a[6] + b[6],
  ];
}

export function subtractDimensions(a: DimensionVector, b: DimensionVector): DimensionVector {
  return [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
    a[3] - b[3],
    a[4] - b[4],
    a[5] - b[5],
    a[6] - b[6],
  ];
}

export function scaleDimension(a: DimensionVector, factor: number): DimensionVector {
  return [
    a[0] * factor,
    a[1] * factor,
    a[2] * factor,
    a[3] * factor,
    a[4] * factor,
    a[5] * factor,
    a[6] * factor,
  ];
}

export function areDimensionsEqual(a: DimensionVector, b: DimensionVector): boolean {
  for (let i = 0; i < 7; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function formatDimensionToSI(v: DimensionVector): string {
  // Chequeo directo de unidades derivadas conocidas
  for (const [, u] of Object.entries(BASE_AND_DERIVED_UNITS)) {
    if (areDimensionsEqual(v, u.vector)) {
      return u.symbol;
    }
  }

  // Si no coincide con derivada pura, armar formato de base: m^a · kg^b · s^c · A^d ...
  const partsPos: string[] = [];
  const partsNeg: string[] = [];
  const labels = ["m", "kg", "s", "A", "K", "mol", "cd"];

  for (let i = 0; i < 7; i++) {
    const exp = v[i];
    if (exp > 0) {
      partsPos.push(exp === 1 ? labels[i] : `${labels[i]}^${exp}`);
    } else if (exp < 0) {
      partsNeg.push(exp === -1 ? labels[i] : `${labels[i]}^${Math.abs(exp)}`);
    }
  }

  if (partsPos.length === 0 && partsNeg.length === 0) return "1 (adimensional)";
  if (partsNeg.length === 0) return partsPos.join("·");
  if (partsPos.length === 0) return `1 / (${partsNeg.join("·")})`;
  return `${partsPos.join("·")} / (${partsNeg.join("·")})`;
}

/**
 * Parsea una expresión física simple en LaTeX o texto plano y devuelve su vector dimensional.
 */
export function parseExpressionDimension(expr: string): DimensionVector {
  let clean = expr
    .replace(/\\cdot|\\times|·|\*/g, " * ")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/\s+/g, " ")
    .trim();

  // Si tiene división principal
  if (clean.includes(" / ")) {
    const [numerator, denominator] = clean.split(" / ");
    const numDim = parseProductDimension(numerator);
    const denDim = parseProductDimension(denominator);
    return subtractDimensions(numDim, denDim);
  }

  return parseProductDimension(clean);
}

function parseProductDimension(productStr: string): DimensionVector {
  // Limpiar paréntesis
  const tokens = productStr
    .replace(/[()]/g, "")
    .split(/\s+\*\s+|\s+/)
    .filter(Boolean);

  let result: DimensionVector = [...DIM_ZERO];

  for (const token of tokens) {
    let base = token;
    let power = 1;

    // Manejo de potencias: v^2 o v^{2}
    if (token.includes("^")) {
      const parts = token.split("^");
      base = parts[0];
      power = parseInt(parts[1].replace(/[{}]/g, ""), 10) || 1;
    }

    // Normalizar variable
    let varKey = base;
    if (base === "\\tau" || base === "tau") varKey = "tau";
    if (base === "\\rho" || base === "rho") varKey = "rho";
    if (base === "\\Phi" || base === "Phi") varKey = "Phi";

    let dim: DimensionVector = [...DIM_ZERO];
    if (VARIABLE_DIMENSIONS[varKey]) {
      dim = VARIABLE_DIMENSIONS[varKey].vector;
    } else if (BASE_AND_DERIVED_UNITS[varKey]) {
      dim = BASE_AND_DERIVED_UNITS[varKey].vector;
    } else if (!isNaN(Number(base))) {
      // Es constante numérica (ej: 0.5, 2, pi): dimensionalmente neutra
      dim = [...DIM_ZERO];
    }

    result = addDimensions(result, scaleDimension(dim, power));
  }

  return result;
}

/**
 * Verifica la consistencia dimensional de una ecuación física (LHS = RHS).
 * No utiliza IA. Es 100% determinístico y opera en cliente.
 */
export function verifyFormulaDimensions(equationStr: string): DimensionVerificationResult {
  let lhs = "";
  let rhs = "";

  if (equationStr.includes("=")) {
    const parts = equationStr.split("=");
    lhs = parts[0].trim();
    rhs = parts[1].trim();
  } else {
    // Si no hay signo igual, asumimos que se consulta la dimensión directa de la expresión
    const dim = parseExpressionDimension(equationStr);
    const formatted = formatDimensionToSI(dim);
    return {
      valid: true,
      lhsSymbol: equationStr,
      lhsUnit: formatted,
      lhsVector: dim,
      rhsExpression: equationStr,
      rhsUnit: formatted,
      rhsVector: dim,
      explanation: `Dimensión en el Sistema Internacional: [ ${formatted} ]`,
    };
  }

  // Resolver LHS
  let lhsKey = lhs.replace(/\\tau/g, "tau").replace(/\\rho/g, "rho").trim();
  let lhsVector: DimensionVector = [...DIM_ZERO];
  let lhsUnitName = "";

  if (VARIABLE_DIMENSIONS[lhsKey]) {
    lhsVector = VARIABLE_DIMENSIONS[lhsKey].vector;
    lhsUnitName = VARIABLE_DIMENSIONS[lhsKey].unitName;
  } else {
    lhsVector = parseExpressionDimension(lhs);
    lhsUnitName = formatDimensionToSI(lhsVector);
  }

  // Resolver RHS
  const rhsVector = parseExpressionDimension(rhs);
  const rhsUnitName = formatDimensionToSI(rhsVector);

  const isValid = areDimensionsEqual(lhsVector, rhsVector);

  if (isValid) {
    return {
      valid: true,
      lhsSymbol: lhs,
      lhsUnit: lhsUnitName,
      lhsVector,
      rhsExpression: rhs,
      rhsUnit: rhsUnitName,
      rhsVector,
      explanation: `Consistencia física validada: [ ${lhsUnitName} = ${rhsUnitName} ]. Ambas magnitudes corresponden a ${formatDimensionToSI(lhsVector)} en el SI.`,
    };
  }

  // Si no cierran las dimensiones
  let explanation = `Las unidades no cierran físicamente: obtuviste [ ${rhsUnitName} ] pero la magnitud "${lhs}" se mide en [ ${lhsUnitName} ].`;

  // Casos típicos de cátedra:
  if (lhsKey === "tau" && rhs.includes("/")) {
    explanation = "Las unidades no cierran: obtuviste N/m y el torque o momento se define como fuerza por distancia (N·m), no dividida.";
  } else if (lhsKey === "P" && rhsVector[2] === -2) {
    explanation = "Las unidades no cierran: obtuviste dimensiones de Energía o Trabajo (J), pero la Potencia es la derivada temporal (J/s = W).";
  }

  return {
    valid: false,
    lhsSymbol: lhs,
    lhsUnit: lhsUnitName,
    lhsVector,
    rhsExpression: rhs,
    rhsUnit: rhsUnitName,
    rhsVector,
    explanation,
    suggestedErrorCategory: "procedure_error",
  };
}

/**
 * Registra un fallo dimensional automáticamente en el Error Bank.
 * (Sección 32-TER: se clasifica como procedure_error o misconception, nunca como calculation_error).
 */
export async function commitDimensionalErrorToBank(
  result: DimensionVerificationResult,
  conceptId?: string,
  conceptName?: string,
): Promise<string> {
  const errorId = crypto.randomUUID();
  const now = Date.now();

  await db.studentErrors.add({
    id: errorId,
    conceptId: conceptId || "dimensional-error",
    conceptName: conceptName || `Ecuación física: ${result.lhsSymbol}`,
    category: result.suggestedErrorCategory || "procedure_error",
    originalExercise: `Verificación dimensional de: ${result.lhsSymbol} = ${result.rhsExpression}`,
    studentAnswer: `${result.lhsSymbol} = ${result.rhsExpression} [${result.rhsUnit}]`,
    expectedAnswer: `Unidades dimensionalmente consistentes en SI: [${result.lhsUnit}]`,
    explanation: result.explanation,
    timestamp: now,
    repetitionCount: 1,
    resolved: false,
  });

  return errorId;
}
