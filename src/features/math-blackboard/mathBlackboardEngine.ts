import { db } from "../../db/db.ts";

export type MathTheoremField =
  | "Ingeniería & Telecomunicaciones"
  | "Matemática & Física"
  | "Economía & Finanzas Cuantitativas"
  | "Computación & Algoritmos";

export interface DerivationStep {
  stepNumber: number;
  name: string;
  explanation: string;
  latexFormula: string;
  cognitiveQuestion: string;
  hint: string;
  keyTokens: string[];
}

export interface MathTheorem {
  id: string;
  title: string;
  field: MathTheoremField;
  historicalContext: string;
  statementLatex: string;
  hypotheses: string[];
  thesisLatex: string;
  steps: DerivationStep[];
}

// -----------------------------------------------------------------------------
// CATÁLOGO DE TEOREMAS Y DEMOSTRACIONES RIGUROSAS
// -----------------------------------------------------------------------------

export const PRESET_MATH_THEOREMS: MathTheorem[] = [
  {
    id: "theorem-nyquist-shannon",
    title: "Teorema de Muestreo de Nyquist-Shannon",
    field: "Ingeniería & Telecomunicaciones",
    historicalContext: "Formulado por Harry Nyquist (1928) y formalizado rigurosamente por Claude Shannon (1949). Fundamento matemático de toda la digitalización de señales y comunicaciones modernas.",
    statementLatex: "x(t) \\in L^2(\\mathbb{R}) \\quad \\text{con} \\quad X(f) = 0 \\quad \\forall |f| > B",
    hypotheses: [
      "La señal analógica continua $x(t)$ tiene energía finita ($x(t) \\in L^2$).",
      "El ancho de banda de la señal está estrictamente acotado en banda base: $X(f) = 0$ para todo $|f| > B$.",
      "La frecuencia de muestreo satisface la condición de Nyquist: $f_s \\ge 2B$.",
    ],
    thesisLatex: "x(t) = \\sum_{n=-\\infty}^{\\infty} x(n T_s) \\, \\text{sinc}\\left( \\frac{t - n T_s}{T_s} \\right)",
    steps: [
      {
        stepNumber: 1,
        name: "Modelado del Muestreo Ideal en el Tiempo",
        explanation: "El proceso de muestreo periódico uniforme con período $T_s = 1/f_s$ se modela matemáticamente como la modulación de $x(t)$ con un tren de impulsos de Dirac $\\delta(t)$.",
        latexFormula: "x_s(t) = x(t) \\cdot \\sum_{n=-\\infty}^{\\infty} \\delta(t - n T_s)",
        cognitiveQuestion: "¿Cómo se formula matemáticamente la señal muestreada $x_s(t)$ antes de pasar al dominio espectral?",
        hint: "Multiplicá $x(t)$ por el peine de Dirac (tren de impulsos periódicos).",
        keyTokens: ["x(t)", "delta", "n", "T_s", "sum"],
      },
      {
        stepNumber: 2,
        name: "Transformación al Dominio de la Frecuencia (Convolución Espectral)",
        explanation: "Aplicando la propiedad de modulación de la Transformada de Fourier, el producto temporal se convierte en convolución en frecuencia. La transformada de un tren de deltas temporales es un tren de deltas espectrales ponderado por $f_s$.",
        latexFormula: "X_s(f) = f_s \\sum_{k=-\\infty}^{\\infty} X(f - k f_s)",
        cognitiveQuestion: "¿Qué estructura adquiere el espectro $X_s(f)$ tras muestrear a frecuencia $f_s$?",
        hint: "Es una periodicización del espectro original $X(f)$ replicado cada múltiplos de $f_s$.",
        keyTokens: ["f_s", "sum", "X(f", "k f_s"],
      },
      {
        stepNumber: 3,
        name: "Condición de No Solapamiento (Criterio de Anti-Aliasing)",
        explanation: "Para que las réplicas espectrales centradas en $\\pm f_s$ no se solapen con la réplica base centrada en $f=0$, el extremo inferior de la primera réplica ($f_s - B$) debe ser estrictamente mayor o igual al extremo superior de la réplica base ($B$).",
        latexFormula: "f_s - B \\ge B \\iff f_s \\ge 2B",
        cognitiveQuestion: "¿Cuál es la inecuación de bordes espectrales que impone el umbral $f_s \\ge 2B$?",
        hint: "El borde izquierdo de la réplica en $f_s$ ($f_s - B$) no debe solaparse con el borde derecho ($B$).",
        keyTokens: ["f_s - B", "2B", "f_s \\ge 2B"],
      },
      {
        stepNumber: 4,
        name: "Filtrado Pasa-Bajo Ideal de Reconstrucción",
        explanation: "Cuando $f_s \\ge 2B$, la réplica original puede aislarse exactamente multiplicando $X_s(f)$ por un filtro pasa-bajos rectangular ideal $H(f) = T_s \\, \\Pi\\left(\\frac{f}{2B}\\right)$.",
        latexFormula: "X(f) = X_s(f) \\cdot T_s \\, \\text{rect}\\left( \\frac{f}{2B} \\right)",
        cognitiveQuestion: "¿Qué función de transferencia $H(f)$ en frecuencia permite recuperar $X(f)$ a partir de $X_s(f)$?",
        hint: "Una ventana rectangular centrada en el origen con ancho $2B$ y ganancia $T_s$.",
        keyTokens: ["X_s(f)", "T_s", "rect", "2B"],
      },
      {
        stepNumber: 5,
        name: "Antitransformada y Fórmula de Interpolación Whittaker-Shannon",
        explanation: "La antitransformada de Fourier del producto es la convolución de las muestras discretas con la respuesta impulsiva sinc: $h(t) = \\text{sinc}(t/T_s)$, logrando la reconstrucción analógica perfecta.",
        latexFormula: "x(t) = \\sum_{n=-\\infty}^{\\infty} x(n T_s) \\, \\text{sinc}\\left( \\frac{t - n T_s}{T_s} \\right)",
        cognitiveQuestion: "¿Cuál es la expresión temporal cerrada de interpolación cardinal de Shannon?",
        hint: "Suma infinita de muestras ponderadas por funciones sinc desplazadas.",
        keyTokens: ["sum", "x(n T_s)", "sinc", "t - n T_s"],
      },
    ],
  },
  {
    id: "theorem-fundamental-calculus",
    title: "Primer Teorema Fundamental del Cálculo",
    field: "Matemática & Física",
    historicalContext: "Demostrado por Isaac Barrow y consolidado por Isaac Newton y Gottfried Leibniz. Unifica el cálculo diferencial y el cálculo integral como operaciones inversas mutuas.",
    statementLatex: "F(x) = \\int_a^x f(t)\\,dt \\quad \\implies \\quad F'(x) = f(x)",
    hypotheses: [
      "La función $f: [a, b] \\to \\mathbb{R}$ es continua en todo el intervalo cerrado $[a, b]$.",
      "La función acumulación de área se define como $F(x) = \\int_a^x f(t)\\,dt$ para cualquier $x \\in [a, b]$.",
    ],
    thesisLatex: "F'(x) = \\lim_{h \\to 0} \\frac{F(x+h) - F(x)}{h} = f(x) \\quad \\forall x \\in (a, b)",
    steps: [
      {
        stepNumber: 1,
        name: "Planteo del Cociente Incremental de la Derivada",
        explanation: "Por definición de derivada en un punto $x$, aplicamos el límite del cociente de diferencias sobre la función de área acumulada $F(x)$.",
        latexFormula: "F'(x) = \\lim_{h \\to 0} \\frac{F(x+h) - F(x)}{h} = \\lim_{h \\to 0} \\frac{1}{h} \\left[ \\int_a^{x+h} f(t)\\,dt - \\int_a^x f(t)\\,dt \\right]",
        cognitiveQuestion: "¿Cómo se expresa el límite incremental de $F'(x)$ sustituyendo las integrales correspondientes?",
        hint: "Cociente incremental con la diferencia de integrales de $a$ a $x+h$ y de $a$ a $x$.",
        keyTokens: ["lim_{h \\to 0}", "frac{1}{h}", "int_a^{x+h}", "int_a^x"],
      },
      {
        stepNumber: 2,
        name: "Propiedad de Aditividad del Intervalo de Integración",
        explanation: "Por aditividad de la integral de Riemann: $\\int_a^{x+h} f(t)\\,dt = \\int_a^x f(t)\\,dt + \\int_x^{x+h} f(t)\\,dt$. Cancelando el término común queda la integral restringida al segmento $[x, x+h]$.",
        latexFormula: "F(x+h) - F(x) = \\int_x^{x+h} f(t)\\,dt",
        cognitiveQuestion: "¿Cuál es el resultado de simplificar la resta de integrales usando la aditividad de dominios?",
        hint: "Queda únicamente la integral en la ventana estrecha de ancho $h$, de $x$ a $x+h$.",
        keyTokens: ["int_x^{x+h}", "f(t)", "dt"],
      },
      {
        stepNumber: 3,
        name: "Aplicación del Teorema del Valor Medio para Integrales",
        explanation: "Como $f$ es continua en $[x, x+h]$, existe al menos un valor intermedio $c_h \\in [x, x+h]$ tal que la integral equivale al área del rectángulo de altura $f(c_h)$ y base $h$.",
        latexFormula: "\\int_x^{x+h} f(t)\\,dt = f(c_h) \\cdot h \\quad \\text{con} \\quad c_h \\in [x, x+h]",
        cognitiveQuestion: "¿Qué igualdad garantiza el Teorema del Valor Medio para integrales continuas?",
        hint: "La integral se iguala a $f(c_h) \\cdot h$ para algún $c_h$ intermedio.",
        keyTokens: ["f(c_h)", "h", "c_h \\in"],
      },
      {
        stepNumber: 4,
        name: "Sustitución en el Cociente Incremental y Paso al Límite",
        explanation: "Sustituyendo el valor medio en el cociente incremental, la variable $h$ se simplifica en el numerador y denominador. Al tomar el límite $h \\to 0$, por el teorema del sándwich $c_h \\to x$, y por continuidad de $f$, $f(c_h) \\to f(x)$.",
        latexFormula: "F'(x) = \\lim_{h \\to 0} \\frac{f(c_h) \\cdot h}{h} = \\lim_{h \\to 0} f(c_h) = f(x)",
        cognitiveQuestion: "¿Por qué el límite final converge exactamente a $f(x)$?",
        hint: "Se simplifica $h$ y por continuidad de $f$, cuando $h \\to 0$, $c_h \\to x$ y por ende $f(c_h) \\to f(x)$.",
        keyTokens: ["lim", "f(c_h)", "f(x)"],
      },
    ],
  },
  {
    id: "theorem-euler-consumption",
    title: "Ecuación de Euler de Consumo Intertemporal",
    field: "Economía & Finanzas Cuantitativas",
    historicalContext: "Pilar de la macroeconomía moderna y el modelo de ciclo vital de Fisher y Ramsey. Describe la trayectoria óptima de consumo intertemporal bajo tasa de interés y descuento temporal.",
    statementLatex: "\\max_{\{c_t, c_{t+1}\\}} \\left[ u(c_t) + \\beta \\, u(c_{t+1}) \\right] \\quad \\text{s.a.} \\quad c_{t+1} = (1+r)(y_t - c_t)",
    hypotheses: [
      "La función de utilidad instantánea $u(c)$ es estrictamente creciente y cóncava ($u' > 0, u'' < 0$).",
      "El agente descuenta el futuro a una tasa subjetiva $\\beta = \\frac{1}{1+\\rho} \\in (0, 1)$.",
      "Existe un mercado de crédito con tasa de interés real libre de riesgo $r$.",
    ],
    thesisLatex: "u'(c_t) = \\beta (1 + r) \\, u'(c_{t+1})",
    steps: [
      {
        stepNumber: 1,
        name: "Restricción Presupuestaria Intertemporal Unificada",
        explanation: "El ahorro en el período $t$ es $s_t = y_t - c_t$. En el período $t+1$, el agente consume el ingreso futuro $y_{t+1}$ más el retorno del capital ahorrado $(1+r)s_t$.",
        latexFormula: "c_t + \\frac{c_{t+1}}{1+r} = y_t + \\frac{y_{t+1}}{1+r}",
        cognitiveQuestion: "¿Cómo se formula la restricción presupuestaria en valor presente descontado?",
        hint: "El valor presente del consumo debe igualar al valor presente de los ingresos.",
        keyTokens: ["c_t", "frac{c_{t+1}}{1+r}", "y_t"],
      },
      {
        stepNumber: 2,
        name: "Formulación del Lagrangiano de Optimización",
        explanation: "Planteamos la función Lagrangiana $\\mathcal{L}$ maximizando la utilidad intertemporal sujeta a la restricción presupuestaria con multiplicador de sombra $\\lambda$.",
        latexFormula: "\\mathcal{L} = u(c_t) + \\beta u(c_{t+1}) + \\lambda \\left[ y_t + \\frac{y_{t+1}}{1+r} - c_t - \\frac{c_{t+1}}{1+r} \\right]",
        cognitiveQuestion: "¿Cómo se escribe el Lagrangiano $\\mathcal{L}$ para este problema de dos períodos?",
        hint: "Suma de utilidades descontadas más $\\lambda$ multiplicando la restricción presupuestaria.",
        keyTokens: ["u(c_t)", "\\beta u(c_{t+1})", "\\lambda", "1+r"],
      },
      {
        stepNumber: 3,
        name: "Condiciones de Primer Orden (FOCs)",
        explanation: "Derivamos el Lagrangiano respecto al consumo del período presente $c_t$ y del período futuro $c_{t+1}$, igualando ambas derivadas parciales a cero.",
        latexFormula: "\\frac{\\partial \\mathcal{L}}{\\partial c_t} = u'(c_t) - \\lambda = 0 \\implies u'(c_t) = \\lambda",
        cognitiveQuestion: "¿Cuál es la condición de primer orden respecto al consumo presente $c_t$?",
        hint: "La utilidad marginal presente $u'(c_t)$ debe igualar al multiplicador sombra $\\lambda$.",
        keyTokens: ["u'(c_t)", "\\lambda"],
      },
      {
        stepNumber: 4,
        name: "Derivada respecto al Consumo Futuro y Despeje de Lambda",
        explanation: "Calculamos la condición respecto a $c_{t+1}$, considerando el factor de descuento $\\beta$ y el costo de oportunidad del interés.",
        latexFormula: "\\frac{\\partial \\mathcal{L}}{\\partial c_{t+1}} = \\beta u'(c_{t+1}) - \\frac{\\lambda}{1+r} = 0 \\implies \\lambda = \\beta (1+r) u'(c_{t+1})",
        cognitiveQuestion: "¿Cuál es la expresión resultante al despejar $\\lambda$ de la condición para $c_{t+1}$?",
        hint: "$\\lambda = \\beta (1+r) u'(c_{t+1})$.",
        keyTokens: ["\\beta", "1+r", "u'(c_{t+1})", "\\lambda"],
      },
      {
        stepNumber: 5,
        name: "Igualación de Multiplicadores y Ecuación Final de Euler",
        explanation: "Igualando ambas expresiones para $\\lambda$, obtenemos la Ecuación de Euler: la tasa marginal de sustitución intertemporal iguala el precio relativo del consumo futuro.",
        latexFormula: "u'(c_t) = \\beta (1 + r) \\, u'(c_{t+1})",
        cognitiveQuestion: "¿Cuál es la ecuación de equilibrio de Euler intertemporal?",
        hint: "Utilidad marginal hoy igual a factor de descuento por tasa de retorno por utilidad marginal mañana.",
        keyTokens: ["u'(c_t)", "\\beta (1 + r)", "u'(c_{t+1})"],
      },
    ],
  },
  {
    id: "theorem-svd-decomposition",
    title: "Descomposición en Valores Singulares (SVD)",
    field: "Computación & Algoritmos",
    historicalContext: "Desarrollada por Eugenio Beltrami (1873) y Camille Jordan (1874). Base matemática del Análisis de Componentes Principales (PCA), compresión de datos y embeddings en Machine Learning.",
    statementLatex: "A \\in \\mathbb{R}^{m \\times n} \\implies A = U \\Sigma V^T",
    hypotheses: [
      "$A$ es una matriz real arbitraria de dimensión $m \\times n$ con rango $r \\le \\min(m, n)$.",
      "La matriz gramiana $A^T A \\in \\mathbb{R}^{n \\times n}$ es simétrica y semidefinida positiva.",
    ],
    thesisLatex: "A = \\sum_{i=1}^r \\sigma_i \\, u_i v_i^T \\quad \\text{con} \\quad U^T U = I_m, \\; V^T V = I_n",
    steps: [
      {
        stepNumber: 1,
        name: "Simetría y Diagonalización de la Matriz Gramiana",
        explanation: "Como $A^T A$ es simétrica ($ (A^T A)^T = A^T A $), por el Teorema Espectral existe una base ortonormal de autovectores $\{v_1, \\dots, v_n\}$ con autovalores reales no negativos $\\lambda_1 \\ge \\lambda_2 \\ge \\dots \\ge \\lambda_n \\ge 0$.",
        latexFormula: "A^T A \\, v_i = \\lambda_i \\, v_i \\quad \\text{con} \\quad v_i^T v_j = \\delta_{ij}",
        cognitiveQuestion: "¿Cómo se expresa la ecuación de autovalores de la matriz simétrica $A^T A$?",
        hint: "$A^T A v_i = \\lambda_i v_i$ con vectores $v_i$ ortonormales.",
        keyTokens: ["A^T A", "v_i", "\\lambda_i", "delta_{ij}"],
      },
      {
        stepNumber: 2,
        name: "Definición de Valores Singulares y No Negatividad",
        explanation: "Para cualquier vector $v_i$, $\\|A v_i\\|^2 = v_i^T A^T A v_i = \\lambda_i \\|v_i\\|^2 = \\lambda_i \\ge 0$. Definimos los valores singulares $\\sigma_i$ como las raíces cuadradas positivas de $\\lambda_i$.",
        latexFormula: "\\sigma_i = \\sqrt{\\lambda_i} \\ge 0 \\quad \\forall i = 1, \\dots, r",
        cognitiveQuestion: "¿Cuál es la relación matemática exacta entre los valores singulares $\\sigma_i$ y los autovalores $\\lambda_i$?",
        hint: "$\\sigma_i = \\sqrt{\\lambda_i}$.",
        keyTokens: ["\\sigma_i", "\\sqrt{\\lambda_i}", "\\ge 0"],
      },
      {
        stepNumber: 3,
        name: "Construcción de los Vectores Singulares Izquierdos",
        explanation: "Para los $r$ autovalores estrictamente positivos ($\\sigma_i > 0$), definimos los vectores columna de $U$ como la imagen normalizada de $v_i$: $u_i = \\frac{1}{\\sigma_i} A v_i$.",
        latexFormula: "u_i = \\frac{1}{\\sigma_i} A v_i \\iff A v_i = \\sigma_i u_i",
        cognitiveQuestion: "¿Cómo se definen los vectores ortonormales izquierdos $u_i$ en función de $A$ y $v_i$?",
        hint: "$u_i = \\frac{1}{\\sigma_i} A v_i$.",
        keyTokens: ["u_i", "frac{1}{\\sigma_i}", "A v_i"],
      },
      {
        stepNumber: 4,
        name: "Demostración de Ortonormalidad de los Vectores Izquierdos",
        explanation: "Comprobamos el producto interno $u_i^T u_j$: $\\frac{1}{\\sigma_i \\sigma_j} v_i^T (A^T A) v_j = \\frac{\\lambda_j}{\\sigma_i \\sigma_j} v_i^T v_j = \\delta_{ij}$. Por lo tanto, los $u_i$ son mutuamente ortonormales.",
        latexFormula: "u_i^T u_j = \\frac{1}{\\sigma_i \\sigma_j} v_i^T A^T A v_j = \\frac{\\sigma_j^2}{\\sigma_i \\sigma_j} \\delta_{ij} = \\delta_{ij}",
        cognitiveQuestion: "¿Cómo se comprueba que el conjunto $\{u_1, \\dots, u_r\}$ es ortonormal?",
        hint: "Sustituyendo $A^T A v_j = \\sigma_j^2 v_j$ y usando la ortonormalidad de los $v$.",
        keyTokens: ["u_i^T u_j", "delta_{ij}", "sigma_i"],
      },
      {
        stepNumber: 5,
        name: "Síntesis Matricial de SVD (Forma Diádica)",
        explanation: "Como cualquier vector $x$ puede expresarse en la base ortonormal $V$, $A x = A \\sum (v_i^T x) v_i = \\sum \\sigma_i u_i (v_i^T x)$. Expresado en matrices completas resulta $A = U \\Sigma V^T$.",
        latexFormula: "A = U \\Sigma V^T = \\sum_{i=1}^r \\sigma_i \\, u_i v_i^T",
        cognitiveQuestion: "¿Cuál es la factorización matricial final de SVD?",
        hint: "$A = U \\Sigma V^T$ o suma diádica de productos exteriores $u_i v_i^T$.",
        keyTokens: ["U \\Sigma V^T", "sum", "sigma_i", "u_i v_i^T"],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// EVALUADOR DE DEDUCCIONES ALGEBRAICAS
// -----------------------------------------------------------------------------

export function cleanMathFormula(f: string): string {
  return f
    .replace(/\\left|\\right/g, "")
    .replace(/\s+/g, "")
    .replace(/\\cdot/g, "")
    .replace(/\*/g, "")
    .toLowerCase();
}

export function validateStepDerivation(
  userAttempt: string,
  expectedFormula: string,
  keyTokens: string[],
): { isCorrect: boolean; score: number; feedback: string } {
  const attempt = userAttempt.trim();
  if (!attempt) {
    return {
      isCorrect: false,
      score: 0,
      feedback: "No has ingresado ninguna expresión para este paso deductivo.",
    };
  }

  const cleanUser = cleanMathFormula(attempt);
  const cleanExp = cleanMathFormula(expectedFormula);

  // Coincidencia exacta o casi idéntica
  if (cleanUser === cleanExp || cleanUser.includes(cleanExp) || cleanExp.includes(cleanUser)) {
    return {
      isCorrect: true,
      score: 10,
      feedback: "¡Deducción rigurosa y matemáticamente impecable! La expresión concuerda plenamente con el paso analítico.",
    };
  }

  // Comprobar presencia de tokens y símbolos clave
  let matchedTokens = 0;
  for (const token of keyTokens) {
    const cleanToken = cleanMathFormula(token);
    if (cleanUser.includes(cleanToken)) {
      matchedTokens++;
    }
  }

  const tokenRatio = matchedTokens / (keyTokens.length || 1);

  if (tokenRatio >= 0.7) {
    return {
      isCorrect: true,
      score: 8.5,
      feedback: "Deducción sustancialmente correcta. Incluiste los operadores y variables clave requeridos para el paso.",
    };
  } else if (tokenRatio >= 0.4) {
    return {
      isCorrect: false,
      score: 5.0,
      feedback: "Identificaste algunos términos correctos, pero falta justificar la estructura o balancear los factores de escala.",
    };
  } else {
    return {
      isCorrect: false,
      score: 2.0,
      feedback: "La expresión propuesta diverge del paso requerido. Revisá la pista o repasá la hipótesis de partida.",
    };
  }
}

// -----------------------------------------------------------------------------
// PERSISTENCIA DE SESIÓN EN INDEXEDDB
// -----------------------------------------------------------------------------

export async function saveMathBlackboardSessionRecord(
  theoremTitle: string,
  durationSec: number,
  stepsCompleted: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void theoremTitle;
  void stepsCompleted;
  const recordId = `math_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "math-blackboard",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
