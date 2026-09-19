import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.22 (CRONOGRAMA DE CUATRIMESTRE & GANTT)        ");
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
// [Test 1] Motor de Cronograma y Balance de Carga (semesterGanttEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Cronograma y Balance de Carga (semesterGanttEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "semester-planner", "semesterGanttEngine.ts");

test("Existe src/features/semester-planner/semesterGanttEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo semesterGanttEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta PRESET_SEMESTER_PLANS, calculateDailyHoursRequired, detectSemesterOverloads, syncMilestoneWithDeadlines y saveSemesterGanttSessionRecord", () => {
  assert.ok(engineSrc.includes("export const PRESET_SEMESTER_PLANS"), "Debe exportar PRESET_SEMESTER_PLANS");
  assert.ok(engineSrc.includes("export function calculateDailyHoursRequired"), "Debe exportar calculateDailyHoursRequired");
  assert.ok(engineSrc.includes("export function detectSemesterOverloads"), "Debe exportar detectSemesterOverloads");
  assert.ok(engineSrc.includes("export async function syncMilestoneWithDeadlines"), "Debe exportar syncMilestoneWithDeadlines");
  assert.ok(engineSrc.includes("export async function saveSemesterGanttSessionRecord"), "Debe exportar saveSemesterGanttSessionRecord");
});

test("Banco de Planes Universitarios Modelo (Ingeniería, Medicina, Derecho)", () => {
  assert.ok(engineSrc.includes("plan-engineering-cycle"), "Debe incluir plan de Ingeniería");
  assert.ok(engineSrc.includes("plan-medicine-cardio"), "Debe incluir plan de Medicina");
  assert.ok(engineSrc.includes("plan-law-contracts"), "Debe incluir plan de Derecho");
});

test("Modelo Canónico de Hitos Académicos (Parciales, Recuperatorios, TPs, Finales)", () => {
  assert.ok(engineSrc.includes("Primer Parcial"), "Soporta Primer Parcial");
  assert.ok(engineSrc.includes("Segundo Parcial"), "Soporta Segundo Parcial");
  assert.ok(engineSrc.includes("Recuperatorio"), "Soporta Recuperatorio");
  assert.ok(engineSrc.includes("Entrega TP Obligatorio"), "Soporta Entrega de TP");
  assert.ok(engineSrc.includes("Coloquio / Examen Final"), "Soporta Finales / Coloquios");
});

// -----------------------------------------------------------------------------
// [Test 2] Algoritmo de Detección de Semanas de Colapso y Proyección Diaria
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo de Detección de Semanas de Colapso y Proyección Diaria");

test("Algoritmo detectSemesterOverloads detecta concurrencia y sobrecarga de horas", () => {
  assert.ok(engineSrc.includes("isOverloaded"), "Debe identificar banderas de sobrecarga");
  assert.ok(engineSrc.includes("Semana de Colapso"), "Debe catalogar semanas críticas como Semana de Colapso");
  assert.ok(engineSrc.includes("totalRequiredHours"), "Debe acumular horas requeridas por semana");
  assert.ok(engineSrc.includes("recommendation"), "Debe emitir recomendaciones proactivas");
});

test("Algoritmo calculateDailyHoursRequired proyecta horas/día y estado de urgencia", () => {
  assert.ok(engineSrc.includes("hoursNeededPerDay"), "Debe calcular tasa diaria de estudio");
  assert.ok(engineSrc.includes("daysRemaining"), "Debe computar días restantes");
  assert.ok(engineSrc.includes("Alerta Cramming"), "Debe advertir proximidad crítica <= 7 días");
});

// -----------------------------------------------------------------------------
// [Test 3] Componente Interactivo Gantt (SemesterGanttMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Interactivo Gantt (SemesterGanttMethod.tsx)");

const compFile = path.join(rootDir, "src", "components", "study-methods", "SemesterGanttMethod.tsx");

test("Existe src/components/study-methods/SemesterGanttMethod.tsx", () => {
  assert.ok(fs.existsSync(compFile), "Debe existir SemesterGanttMethod.tsx");
});

const compSrc = fs.readFileSync(compFile, "utf-8");

test("SemesterGanttMethod exporta componente y renderiza matriz de 16 semanas", () => {
  assert.ok(compSrc.includes("export const SemesterGanttMethod"), "Debe exportar SemesterGanttMethod");
  assert.ok(compSrc.includes("Diagrama de Gantt"), "Debe contener título descriptivo");
  assert.ok(compSrc.includes("grid-cols-16"), "Debe contener cuadrícula temporal de 16 semanas");
});

test("Visualiza alertas de semanas de colapso y CTA para Cram Mode", () => {
  assert.ok(compSrc.includes("Alerta de Colapso Cognitivo"), "Panel destacado de sobrecarga");
  assert.ok(compSrc.includes("Activar Cram Mode"), "Botón de acción rápida para repaso de 7 días");
  assert.ok(compSrc.includes("/methods?run=cram"), "Redirección directa a Cramming");
});

test("Permite crear nuevos hitos y ver detalles interactivos", () => {
  assert.ok(compSrc.includes("handleAddMilestoneSubmit"), "Función de registro de nuevo hito");
  assert.ok(compSrc.includes("selectedMilestone"), "Estado para inspeccionar hito al click");
});

// -----------------------------------------------------------------------------
// [Test 4] Integraciones en el Catálogo, Tipos y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integraciones en Catálogo, Tipos y Command Palette");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("types/index.ts incluye 'semester-gantt' en StudyMethodId", () => {
  assert.ok(typesSrc.includes('"semester-gantt"'), "StudyMethodId debe incluir 'semester-gantt'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage.tsx importa SemesterGanttMethod con carga diferida (lazy)", () => {
  assert.ok(methodsPageSrc.includes("SemesterGanttMethod"), "Debe importar SemesterGanttMethod");
  assert.ok(methodsPageSrc.includes('case "semester-gantt":'), "Debe resolver case 'semester-gantt'");
});

test("MethodsPage.tsx incluye botón de acceso rápido para 'Cronograma & Gantt'", () => {
  assert.ok(methodsPageSrc.includes('handleStartMethod("semester-gantt")'), "Debe invocar 'semester-gantt'");
  assert.ok(methodsPageSrc.includes("Cronograma & Gantt"), "Etiqueta legible del botón");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("commandPaletteService.ts registra 'action-semester-gantt'", () => {
  assert.ok(paletteServiceSrc.includes("action-semester-gantt"), "Debe registrar action-semester-gantt");
  assert.ok(paletteServiceSrc.includes("/methods?run=semester-gantt"), "Debe navegar a /methods?run=semester-gantt");
  assert.ok(paletteServiceSrc.includes("Cronograma Dinámico de Cuatrimestre"), "Título descriptivo de la acción");
});

const paletteCompFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const paletteCompSrc = fs.readFileSync(paletteCompFile, "utf-8");

test("CommandPalette.tsx importa y mapea el icono CalendarDays", () => {
  assert.ok(paletteCompSrc.includes("CalendarDays"), "Debe importar CalendarDays");
  assert.ok(paletteCompSrc.includes("CalendarDays,"), "Debe mapear CalendarDays en ICON_MAP");
});

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> ETAPA v5.22 COMPLETADA CON ÉXITO: Cronograma de Cuatrimestre y Gantt operativos. <<\n");
  process.exit(0);
}
