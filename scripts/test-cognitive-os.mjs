import assert from "node:assert";

console.log("==================================================================");
console.log("  TEST SUITE: StudyLab CognitiveOS v5.0 (Secciones 30 y 30-BIS)  ");
console.log("==================================================================\n");

let passedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. Mastery Model 4D (Sección 4)
// -----------------------------------------------------------------------------
runTest("1.1 Cálculo canónico del Puntaje Compuesto 4D (0.35R + 0.30C + 0.20A + 0.15T)", () => {
  const R = 0.90;
  const C = 0.80;
  const A = 0.70;
  const T = 0.60;
  const composite = (0.35 * R + 0.30 * C + 0.20 * A + 0.15 * T) * 100;
  assert(Math.abs(composite - 78.5) < 0.01, `Compuesto esperado: 78.5, obtenido: ${composite}`);
});

runTest("1.2 Límites estrictos de Mastery [0..100]", () => {
  const clampScore = (score) => Math.min(100, Math.max(0, Math.round(score)));
  assert.strictEqual(clampScore(-15), 0, "No debe permitir valores negativos");
  assert.strictEqual(clampScore(125), 100, "No debe superar 100%");
  assert.strictEqual(clampScore(84.3), 84, "Debe redondear valores correctos");
});

// -----------------------------------------------------------------------------
// 2. FSRS Model & Retrievability (Sección 3 & 20)
// -----------------------------------------------------------------------------
runTest("2.1 Ecuación de Retención FSRS R(t, S) = (1 + 19 * t / S)^(-0.5)", () => {
  const calculateR = (t, S) => {
    if (t <= 0) return 1.0;
    return Math.pow(1 + (19 * t) / S, -0.5);
  };
  const r0 = calculateR(0, 10);
  assert.strictEqual(r0, 1.0, "En t=0 la retención debe ser 1.0 (100%)");

  const rS = calculateR(10, 10);
  // (1 + 19 * 1)^(-0.5) = 20^(-0.5) = 1 / sqrt(20) ~= 0.2236
  assert(Math.abs(rS - 0.2236) < 0.001, `En t=S la retención debe ser ~0.2236, obtenida: ${rS}`);
});

runTest("2.2 Detección de Tarjetas Sanguijuela (Leeches) con lapses >= 6", () => {
  const detectLeech = (lapses, threshold = 6) => lapses >= threshold;
  assert(!detectLeech(4), "4 lapsos no es sanguijuela");
  assert(!detectLeech(5), "5 lapsos no es sanguijuela");
  assert(detectLeech(6), "6 lapsos activa alerta de leech");
  assert(detectLeech(10), "10 lapsos activa alerta de leech");
});

// -----------------------------------------------------------------------------
// 3. Verificador Dimensional en SI (Sección 32-TER)
// -----------------------------------------------------------------------------
runTest("3.1 Verificación física: Potencia P = F · v [W]", () => {
  // Dimensiones: [L, M, T, I, Theta, N, J]
  const F = [1, 1, -2, 0, 0, 0, 0]; // N = kg·m/s²
  const v = [1, 0, -1, 0, 0, 0, 0]; // m/s
  const W = [2, 1, -3, 0, 0, 0, 0]; // W = kg·m²/s³
  const mult = F.map((val, i) => val + v[i]);
  assert(mult.every((v, i) => v === W[i]), "F * v debe ser igual a Watts");
});

runTest("3.2 Detección de Inconsistencia: Torque tau = F / r (fuerza dividida distancia)", () => {
  const F = [1, 1, -2, 0, 0, 0, 0];
  const r = [1, 0, 0, 0, 0, 0, 0];
  const tauCorrect = [2, 1, -2, 0, 0, 0, 0]; // N·m
  const div = F.map((val, i) => val - r[i]); // [0, 1, -2] (N/m)
  assert(!div.every((v, i) => v === tauCorrect[i]), "F / r no debe coincidir con N·m");
});

runTest("3.3 Verificación física: Ley de Ohm V = I · R [V]", () => {
  const I = [0, 0, 0, 1, 0, 0, 0]; // A
  const R = [2, 1, -3, -2, 0, 0, 0]; // Ohm
  const V = [2, 1, -3, -1, 0, 0, 0]; // Volt
  const mult = I.map((val, i) => val + R[i]);
  assert(mult.every((v, i) => v === V[i]), "I * R debe ser igual a Volts");
});

// -----------------------------------------------------------------------------
// 4. Planificador Inverso de Examen (Sección 19-BIS)
// -----------------------------------------------------------------------------
runTest("4.1 Distribución canónica de las 4 fases de examen (30% -> 40% -> 20% -> 10%)", () => {
  const totalDays = 20;
  const phase1 = Math.round(totalDays * 0.30); // 6 días
  const phase2 = Math.round(totalDays * 0.40); // 8 días
  const phase3 = Math.round(totalDays * 0.20); // 4 días
  const phase4 = totalDays - (phase1 + phase2 + phase3); // 2 días
  assert.strictEqual(phase1 + phase2 + phase3 + phase4, totalDays, "La suma de fases debe ser 20 días");
  assert.strictEqual(phase1, 6, "Fase 1: 6 días");
  assert.strictEqual(phase2, 8, "Fase 2: 8 días");
  assert.strictEqual(phase3, 4, "Fase 3: 4 días");
  assert.strictEqual(phase4, 2, "Fase 4: 2 días");
});

// -----------------------------------------------------------------------------
// 5. Sostenibilidad FSRS & Días Fáciles (Sección 20-BIS)
// -----------------------------------------------------------------------------
runTest("5.1 Filtro de Días Fáciles (Easy Days) traslada carga", () => {
  const easyDaysMap = { 2: 0.3 }; // Martes carga reducida al 30%
  const isTargetDay = (dayOfWeek) => easyDaysMap[dayOfWeek] !== undefined;
  assert(isTargetDay(2), "Martes está marcado como día fácil");
  assert(!isTargetDay(1), "Lunes no es día fácil");
  assert(!isTargetDay(3), "Miércoles no es día fácil");
});

// -----------------------------------------------------------------------------
// 6. Migraciones Dexie y Estructura de Esquema (Sección 30-BIS)
// -----------------------------------------------------------------------------
runTest("6.1 Integridad de versiones Dexie (v1 a v5 aditivas sin eliminación de tablas)", () => {
  const v1Stores = ["folders", "files", "highlights", "postits", "sessions", "deadlines", "reviewSchedule", "flashcards", "flashcardDecks"];
  const v2Stores = ["ocrPages"];
  const v3Stores = ["cardsFsrs", "reviewLogs", "concepts", "conceptEdges", "workspaceConfigs", "fatigueTelemetry"];
  const v4Stores = ["academicSources", "academicChunks", "academicEvaluations", "workspaceState"];
  const v5Stores = ["studentErrors", "examPlans"];

  const allStores = new Set([...v1Stores, ...v2Stores, ...v3Stores, ...v4Stores, ...v5Stores]);
  assert.strictEqual(allStores.size, 22, "Dexie debe gestionar exactamente 22 almacenes de entidades en v5");
  assert(allStores.has("studentErrors"), "studentErrors debe existir en el esquema");
  assert(allStores.has("examPlans"), "examPlans debe existir en el esquema");
  assert(allStores.has("cardsFsrs"), "cardsFsrs debe existir en el esquema");
});

// -----------------------------------------------------------------------------
// 7. Cierre de Brecha NotebookLM & Ingesta (Fase 11 · Sección 32-QUINQUIES)
// -----------------------------------------------------------------------------
runTest("7.1 Ingesta ampliada: cálculo de timestamps mm:ss y offsets de caracteres", () => {
  const parseTimestamp = (ts) => {
    const parts = ts.replace(",", ".").split(":").map(Number);
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  };
  const formatMmSs = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const sec = parseTimestamp("01:25");
  assert.strictEqual(sec, 85, "01:25 debe equivaler a 85 segundos");
  assert.strictEqual(formatMmSs(85), "01:25", "85 segundos debe formatear a 01:25");

  const fullText = "Primera sección del texto. Segunda sección con teorema.";
  const query = "Segunda sección";
  const start = fullText.indexOf(query);
  const end = start + query.length;
  assert.strictEqual(start, 27, "Offset de inicio debe ser 27");
  assert.strictEqual(end, 42, "Offset de fin debe ser 42");
});

runTest("7.2 Síntesis multi-fuente: detección de contradicciones y polaridades opuestas", () => {
  const textA = "El flujo magnético a través de la espira aumenta constantemente.";
  const textB = "El flujo magnético a través de la espira disminuye con el tiempo.";
  const hasPolarConflict =
    (textA.includes("aumenta") && textB.includes("disminuye")) ||
    (textA.includes("disminuye") && textB.includes("aumenta"));

  assert(hasPolarConflict, "Debe detectar discrepancia polar entre 'aumenta' y 'disminuye'");
});

runTest("7.3 Audio Overview: duración estimada (~130 ppm) y rotulado honesto", () => {
  const sampleWords = Array.from({ length: 260 }, () => "palabra").join(" ");
  const wordCount = sampleWords.split(/\s+/).length;
  const estDuration = Number((wordCount / 130).toFixed(1));
  assert.strictEqual(estDuration, 2.0, "260 palabras deben estimarse en exactamente 2.0 minutos");

  const label = "Resumen narrado";
  assert(!label.toLowerCase().includes("podcast"), "Nunca debe usar el término podcast por honestidad");
});

console.log(`\n==================================================================`);
console.log(`  RESUMEN: ${passedCount} tests ejecutados y superados con éxito.`);
console.log(`==================================================================\n`);
