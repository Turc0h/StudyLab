import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// =============================================================================
// IMPORTACIÓN DE FUNCIONES REALES DIRECTAS DESDE LOS MÓDULOS DE TYPESCRIPT
// =============================================================================
import {
  computeStreak,
  countBySubject,
  getTopSubjectRows,
  formatDueDate,
  formatRelativeDate,
  buildUpcomingDeadlines,
} from "../src/features/dashboard/stats.ts";

import {
  calculateAverageHalfLife,
  calculateIllusionOfCompetenceIndex,
} from "../src/features/fsrs/scheduler.ts";

import { calculateHalfLife } from "../src/features/fsrs/fsrsModel.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB TELEMETRÍA DE DASHBOARD (MÓDULOS REALES IMPORTADOS)     ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Test 1] Integridad de Diseño y Estructura en Dashboard.tsx
// -----------------------------------------------------------------------------
console.log("[Test 1] Integridad de Diseño y Estructura en Dashboard.tsx");

const dashboardFile = path.join(rootDir, "src", "pages", "Dashboard.tsx");

test("Existe src/pages/Dashboard.tsx", () => {
  assert.ok(fs.existsSync(dashboardFile), "El archivo Dashboard.tsx debe existir");
});

const dashboardSrc = fs.readFileSync(dashboardFile, "utf-8");

test("Dashboard importa y conecta las funciones de telemetría reales sin duplicar lógica inline", () => {
  assert.ok(dashboardSrc.includes("calculateAverageHalfLife"), "Debe importar calculateAverageHalfLife");
  assert.ok(dashboardSrc.includes("calculateIllusionOfCompetenceIndex"), "Debe importar calculateIllusionOfCompetenceIndex");
  assert.ok(dashboardSrc.includes("computeStreak"), "Debe importar computeStreak");
  assert.ok(dashboardSrc.includes("getTopSubjectRows"), "Debe importar getTopSubjectRows (lógica extraída)");
  assert.ok(dashboardSrc.includes("buildUpcomingDeadlines"), "Debe importar buildUpcomingDeadlines (lógica extraída)");
  assert.ok(dashboardSrc.includes("formatDueDate"), "Debe importar formatDueDate");
  assert.ok(dashboardSrc.includes("formatRelativeDate"), "Debe importar formatRelativeDate");
});

test("Dashboard presenta los paneles clave del Atril de Control Diario", () => {
  assert.ok(dashboardSrc.includes("Estabilidad de Memoria (t½)"), "Debe incluir panel de Vida Media FSRS");
  assert.ok(dashboardSrc.includes("Calibración Metacognitiva"), "Debe incluir panel de Calibración ICI");
  assert.ok(dashboardSrc.includes("Continuidad de Estudio"), "Debe incluir panel de Racha de Estudio");
  assert.ok(dashboardSrc.includes("Dominio por Cátedra"), "Debe incluir panel de Dominio por Cátedra");
  assert.ok(dashboardSrc.includes("Bitácora de Sesiones Recientes"), "Debe incluir Bitácora de Sesiones");
  assert.ok(dashboardSrc.includes("Mesas de Examen y Vencimientos"), "Debe incluir panel de Mesas de Examen");
});

test("Dashboard respeta la paleta académica y no usa colores cian neón ni mayúsculas agresivas", () => {
  assert.ok(!dashboardSrc.includes("cyan-"), "No debe contener clases cian neón (cyan-)");
  assert.ok(!dashboardSrc.includes("uppercase tracking-wider"), "No debe tener títulos estridentes con tracking-wider");
  assert.ok(!dashboardSrc.includes("UPPERCASE"), "No debe tener constantes en mayúsculas decorativas");
});

// -----------------------------------------------------------------------------
// [Test 2] Algoritmo de Racha de Estudio (computeStreak real importado de stats.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo de Racha de Estudio (computeStreak real importado)");

test("computeStreak devuelve 0 si no hay sesiones registradas", () => {
  const streak = computeStreak([]);
  assert.strictEqual(streak, 0, "Racha sin sesiones debe ser 0");
});

test("computeStreak calcula correctamente racha activa si se estudió hoy", () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sessions = [
    { startedAt: now },
    { startedAt: now - oneDay },
    { startedAt: now - 2 * oneDay },
  ];
  const streak = computeStreak(sessions);
  assert.strictEqual(streak, 3, "3 días consecutivos estudiando hoy debe dar racha de 3");
});

test("computeStreak preserva la racha si ayer se estudió pero hoy todavía no", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date();
  dayBefore.setDate(dayBefore.getDate() - 2);

  const sessions = [
    { startedAt: yesterday.getTime() },
    { startedAt: dayBefore.getTime() },
  ];
  const streak = computeStreak(sessions);
  assert.strictEqual(streak, 2, "Debe preservar racha de 2 si ayer se estudió aunque hoy aún no");
});

test("computeStreak detecta corte de racha si pasaron más de 2 días", () => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const sessions = [
    { startedAt: threeDaysAgo.getTime() },
  ];
  const streak = computeStreak(sessions);
  assert.strictEqual(streak, 0, "Racha debe ser 0 si el último estudio fue hace 3 días");
});

// -----------------------------------------------------------------------------
// [Test 3] Algoritmo de Dominio por Cátedra (countBySubject y getTopSubjectRows reales)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Algoritmo de Dominio por Cátedra (countBySubject y getTopSubjectRows reales)");

test("countBySubject agrupa y contabiliza sesiones por cátedra ignorando nulos", () => {
  const sessions = [
    { subjectFolderId: "catedra-fisiologia" },
    { subjectFolderId: "catedra-fisiologia" },
    { subjectFolderId: "catedra-anatomia" },
    { subjectFolderId: null },
    { subjectFolderId: undefined },
  ];
  const counts = countBySubject(sessions);
  assert.strictEqual(counts.get("catedra-fisiologia"), 2);
  assert.strictEqual(counts.get("catedra-anatomia"), 1);
  assert.strictEqual(counts.size, 2);
});

test("getTopSubjectRows mapea nombres de carpetas, ordena desc y corta al límite solicitado", () => {
  const sessions = [
    { subjectFolderId: "f1" },
    { subjectFolderId: "f1" },
    { subjectFolderId: "f1" },
    { subjectFolderId: "f2" },
    { subjectFolderId: "f2" },
    { subjectFolderId: "f3" },
    { subjectFolderId: "f4-unnamed" },
    { subjectFolderId: "f5" },
  ];
  const folders = [
    { id: "f1", name: "Anatomía Descriptiva" },
    { id: "f2", name: "Fisiología Médica" },
    { id: "f3", name: "Histología" },
    { id: "f5", name: "Bioquímica" },
  ];

  const topRows = getTopSubjectRows(sessions, folders, 3);
  assert.strictEqual(topRows.length, 3, "Debe limitar a top 3");
  assert.strictEqual(topRows[0].name, "Anatomía Descriptiva");
  assert.strictEqual(topRows[0].count, 3);
  assert.strictEqual(topRows[1].name, "Fisiología Médica");
  assert.strictEqual(topRows[1].count, 2);
});

test("getTopSubjectRows asigna 'Sin materia' si la carpeta fue borrada o no existe", () => {
  const sessions = [{ subjectFolderId: "orphan-id" }];
  const topRows = getTopSubjectRows(sessions, [], 4);
  assert.strictEqual(topRows.length, 1);
  assert.strictEqual(topRows[0].name, "Sin materia");
  assert.strictEqual(topRows[0].count, 1);
});

// -----------------------------------------------------------------------------
// [Test 4] Formateo de Vencimientos, Fechas y Agrupación de Exámenes
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Formateo de Vencimientos, Fechas y Agrupación de Exámenes");

test("formatDueDate maneja fechas pasadas, actuales y futuras con precisión", () => {
  const now = new Date();
  const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime();
  assert.strictEqual(formatDueDate(todayTs), "Hoy");

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.strictEqual(formatDueDate(tomorrow.getTime()), "Mañana");

  const inFiveDays = new Date(now);
  inFiveDays.setDate(inFiveDays.getDate() + 5);
  assert.strictEqual(formatDueDate(inFiveDays.getTime()), "En 5 días");

  const past = new Date(now);
  past.setDate(past.getDate() - 2);
  assert.strictEqual(formatDueDate(past.getTime()), "Vencido");
});

test("formatRelativeDate formatea fechas de sesiones recientes", () => {
  const now = Date.now();
  assert.strictEqual(formatRelativeDate(now), "Hoy");
  assert.strictEqual(formatRelativeDate(now - 24 * 60 * 60 * 1000), "Ayer");
  assert.strictEqual(formatRelativeDate(now - 3 * 24 * 60 * 60 * 1000), "Hace 3 días");
});

test("buildUpcomingDeadlines combina manuales y calendar, filtra >24h vencidos y ordena cronológicamente", () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const deadlines = [
    { id: "d1", title: "Final de Farmacología", dueDate: now + 3 * oneDay },
    { id: "d-old", title: "Examen Pasado", dueDate: now - 3 * oneDay },
  ];

  const calendarEvents = [
    { id: "cal-1", title: "Mesa de Anatomía", start: new Date(now + 1 * oneDay).toISOString() },
    { id: "cal-no-start", title: "Sin fecha", start: null },
  ];

  const upcoming = buildUpcomingDeadlines(deadlines, calendarEvents, now, 4);

  assert.strictEqual(upcoming.length, 2, "Debe incluir 2 eventos válidos");
  assert.strictEqual(upcoming[0].id, "cal-1", "El evento más cercano debe ir primero");
  assert.strictEqual(upcoming[0].fromCalendar, true);
  assert.strictEqual(upcoming[1].id, "d1");
  assert.strictEqual(upcoming[1].fromCalendar, false);
});

// -----------------------------------------------------------------------------
// [Test 5] Telemetría FSRS: Vida Media (t1/2) y Calibración ICI (scheduler.ts y fsrsModel.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Telemetría FSRS: Vida Media (t1/2) y Calibración ICI (módulos reales)");

test("calculateAverageHalfLife real calcula promedio exacto sobre colección de tarjetas", () => {
  const empty = calculateAverageHalfLife([]);
  assert.strictEqual(empty, 0, "Sin tarjetas debe dar 0");

  const cards = [
    { stability: 10, halfLife: calculateHalfLife(10) },
    { stability: 20, halfLife: calculateHalfLife(20) },
  ];
  const avg = calculateAverageHalfLife(cards);
  assert.strictEqual(avg, 2.37, `Promedio real FSRS (3/19 * s) esperado 2.37, obtenido ${avg}`);
});

test("calculateIllusionOfCompetenceIndex real clasifica correctamente usuarios calibrados vs sobreconfiados", () => {
  // Caso 1: Menos de 5 logs
  const small = calculateIllusionOfCompetenceIndex([{ rating: 4, latencyMs: 1000, stabilityBefore: 1 }]);
  assert.strictEqual(small.level, "optimal");
  assert.strictEqual(small.indexPct, 0);

  // Caso 2: Calibrado (buenas respuestas, latencia reflexiva, pocos lapsos)
  const calibratedLogs = Array.from({ length: 10 }, () => ({
    rating: 3,
    latencyMs: 3500,
    stabilityBefore: 5.0,
  }));
  const calResult = calculateIllusionOfCompetenceIndex(calibratedLogs);
  assert.strictEqual(calResult.level, "optimal", "Usuario reflexivo debe tener nivel óptimo");

  // Caso 3: Sobreconfiado (marca 'Easy' en <800ms con tarjetas inestables y falla repetidamente)
  const overconfidentLogs = Array.from({ length: 10 }, (_, i) => ({
    rating: i % 2 === 0 ? 4 : 1,
    latencyMs: 700,
    stabilityBefore: 1.5,
  }));
  const overResult = calculateIllusionOfCompetenceIndex(overconfidentLogs);
  assert.ok(overResult.indexPct > 45, `ICI de usuario sobreconfiado debe ser significativo (>45%), obtenido ${overResult.indexPct}%`);
  assert.ok(overResult.level === "moderate" || overResult.level === "high");
});

// -----------------------------------------------------------------------------
// [Test 6] Tokens Semánticos del Sistema en index.css y Pizarra Virtual
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Tokens Semánticos del Sistema en index.css y Pizarra Virtual");

const indexCssPath = path.join(rootDir, "src", "index.css");
const indexCssSrc = fs.readFileSync(indexCssPath, "utf-8");

test("index.css define tokens --color-system-notice en :root, .dark y @theme", () => {
  assert.ok(indexCssSrc.includes("--color-system-notice: #4A4D54;"), "Debe tener --color-system-notice en :root");
  assert.ok(indexCssSrc.includes("--color-system-notice-bg: #EFECE6;"), "Debe tener --color-system-notice-bg en :root");
  assert.ok(indexCssSrc.includes("--color-system-notice-border: #D6D2C8;"), "Debe tener --color-system-notice-border en :root");

  assert.ok(indexCssSrc.includes("--color-system-notice: #A8ABB3;"), "Debe tener --color-system-notice en .dark");
  assert.ok(indexCssSrc.includes("--color-system-notice-bg: #222428;"), "Debe tener --color-system-notice-bg en .dark");
  assert.ok(indexCssSrc.includes("--color-system-notice-border: #35383F;"), "Debe tener --color-system-notice-border en .dark");

  assert.ok(indexCssSrc.includes("--color-system-notice: var(--color-system-notice);"), "Debe exponer --color-system-notice en @theme");
  assert.ok(indexCssSrc.includes("--color-system-notice-bg: var(--color-system-notice-bg);"), "Debe exponer --color-system-notice-bg en @theme");
  assert.ok(indexCssSrc.includes("--color-system-notice-border: var(--color-system-notice-border);"), "Debe exponer --color-system-notice-border en @theme");
});

const whiteboardPath = path.join(rootDir, "src", "components", "whiteboard", "VirtualBlackboard.tsx");
const whiteboardSrc = fs.readFileSync(whiteboardPath, "utf-8");

test("VirtualBlackboard.tsx utiliza los tokens de sistema y no clases 'stone' hardcodeadas", () => {
  assert.ok(!whiteboardSrc.includes("bg-stone-"), "No debe tener clases bg-stone-");
  assert.ok(!whiteboardSrc.includes("text-stone-"), "No debe tener clases text-stone-");
  assert.ok(!whiteboardSrc.includes("border-stone-"), "No debe tener clases border-stone-");

  assert.ok(whiteboardSrc.includes("bg-system-notice-bg"), "Debe usar bg-system-notice-bg");
  assert.ok(whiteboardSrc.includes("border-system-notice-border"), "Debe usar border-system-notice-border");
  assert.ok(whiteboardSrc.includes("text-system-notice"), "Debe usar text-system-notice");
});

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADOS: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> VERIFICACIÓN COMPLETA Y EXITOSA: Funciones reales de TypeScript importadas y validadas.");
}
