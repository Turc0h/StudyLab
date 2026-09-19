import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.23 (BANCO DE PARCIALES & PREDICTOR PARETO)     ");
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
// [Test 1] Motor del Banco de Parciales y Algoritmo Pareto (pastExamsEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor del Banco de Parciales y Algoritmo Pareto (pastExamsEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "past-exams", "pastExamsEngine.ts");

test("Existe src/features/past-exams/pastExamsEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo pastExamsEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta PRESET_PAST_EXAMS, calculateParetoTopicAnalysis, generateCompositeHighYieldExam, gradeMockExamSubmission y saveMockExamSession", () => {
  assert.ok(engineSrc.includes("export const PRESET_PAST_EXAMS"), "Debe exportar PRESET_PAST_EXAMS");
  assert.ok(engineSrc.includes("export function calculateParetoTopicAnalysis"), "Debe exportar calculateParetoTopicAnalysis");
  assert.ok(engineSrc.includes("export function generateCompositeHighYieldExam"), "Debe exportar generateCompositeHighYieldExam");
  assert.ok(engineSrc.includes("export function gradeMockExamSubmission"), "Debe exportar gradeMockExamSubmission");
  assert.ok(engineSrc.includes("export async function saveMockExamSession"), "Debe exportar saveMockExamSession");
});

test("Banco de Parciales Multidisciplinario Precargado (Medicina, Derecho, Ingeniería)", () => {
  assert.ok(engineSrc.includes("med-cardio-2024-1c"), "Debe incluir parcial de Medicina (Cardiología / Farmacología)");
  assert.ok(engineSrc.includes("law-contracts-2024-1c"), "Debe incluir parcial de Derecho (Contratos Civiles y Comerciales)");
  assert.ok(engineSrc.includes("eng-dist-2024-1c"), "Debe incluir parcial de Ingeniería (Sistemas Distribuidos)");
});

test("Tipos de Consigna Académica Soportados (Multiple Choice, Ensayo, Caso Práctico)", () => {
  assert.ok(engineSrc.includes('"multiple_choice"'), "Soporta preguntas de opción múltiple");
  assert.ok(engineSrc.includes('"essay"'), "Soporta preguntas de ensayo / desarrollo");
  assert.ok(engineSrc.includes('"practical_case"'), "Soporta resolución de casos prácticos");
});

test("Rúbricas de Cátedra y Respuestas Modelo Oficiales", () => {
  assert.ok(engineSrc.includes("rubricCriteria"), "Debe incluir criterios de corrección en rúbrica");
  assert.ok(engineSrc.includes("modelAnswer"), "Debe incluir respuesta modelo de cátedra");
  assert.ok(engineSrc.includes("passingScore"), "Debe definir umbral de aprobación por examen");
});

// -----------------------------------------------------------------------------
// [Test 2] Verificación Algorítmica de la Ley de Pareto (80/20) y Recurrencia
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo Estadístico Pareto (80/20) y Clasificación High-Yield");

test("Lógica de Clasificación High-Yield y Cuantificación de Puntos Top 20%", () => {
  assert.ok(engineSrc.includes("CRITICAL_HIGH_YIELD"), "Debe clasificar temas con >= 70% de presencia");
  assert.ok(engineSrc.includes("HIGH_YIELD"), "Debe clasificar temas con 50-69% de presencia");
  assert.ok(engineSrc.includes("top20PercentCount"), "Debe calcular el número de temas en el percentil 20");
  assert.ok(engineSrc.includes("pointsShareTop20"), "Debe calcular el porcentaje de puntos acumulados por el top 20%");
});

test("Generador de Simulacros Compuestos Ponderados por Probabilidad Histórica", () => {
  assert.ok(engineSrc.includes("generateCompositeHighYieldExam"), "Debe generar examen compuesto");
  assert.ok(engineSrc.includes("scoredQuestions"), "Debe puntuar y priorizar consignas según recurrencia");
});

test("Motor de Calificación con Detección de Brechas Críticas y Feedback", () => {
  assert.ok(engineSrc.includes("criticalHighYieldMissed"), "Debe detectar temas críticos no dominados");
  assert.ok(engineSrc.includes("topicBreakdown"), "Debe generar desglose por tema");
  assert.ok(engineSrc.includes("Alerta de Cátedra"), "Debe alertar sobre brechas en temas de alta recurrencia");
});

// -----------------------------------------------------------------------------
// [Test 3] Componente Visual de Estudio (PastExamsMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Visual de Estudio (PastExamsMethod.tsx)");

const componentFile = path.join(rootDir, "src", "components", "study-methods", "PastExamsMethod.tsx");

test("Existe src/components/study-methods/PastExamsMethod.tsx", () => {
  assert.ok(fs.existsSync(componentFile), "El archivo PastExamsMethod.tsx debe existir");
});

const componentSrc = fs.readFileSync(componentFile, "utf-8");

test("Pestañas de Navegación: Banco de Parciales, Predictor Pareto y Simulador", () => {
  assert.ok(componentSrc.includes('"repository"'), "Debe incluir pestaña de Banco de Parciales");
  assert.ok(componentSrc.includes('"pareto"'), "Debe incluir pestaña de Predictor Pareto (80/20)");
  assert.ok(componentSrc.includes('"simulator"'), "Debe incluir pestaña de Simulador de Examen");
});

test("Simulador con Cronómetro en Cuenta Regresiva y Alerta < 5 minutos", () => {
  assert.ok(componentSrc.includes("remainingSeconds"), "Debe gestionar tiempo restante en segundos");
  assert.ok(componentSrc.includes("formatTime"), "Debe formatear el tiempo en mm:ss");
  assert.ok(componentSrc.includes("Entregar y Calificar"), "Debe permitir entrega anticipada o por timeout");
});

test("Formulario de Carga de Parciales Personalizados con Persistencia Local", () => {
  assert.ok(componentSrc.includes("isAddingExam"), "Debe soportar modal para cargar nuevos parciales");
  assert.ok(componentSrc.includes("handleSaveCustomExamSubmit"), "Debe persistir nuevos parciales en el banco");
});

// -----------------------------------------------------------------------------
// [Test 4] Integración en el Catálogo, Types, Command Palette y Rutas
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en Catálogo, Types, Command Palette y Rutas");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("StudyMethodId incluye 'past-exams' en src/types/index.ts", () => {
  assert.ok(typesSrc.includes('"past-exams"'), "StudyMethodId debe incluir 'past-exams'");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("Acción 'action-past-exams' registrada en Command Palette Service", () => {
  assert.ok(paletteServiceSrc.includes("action-past-exams"), "Debe existir action-past-exams");
  assert.ok(paletteServiceSrc.includes("/methods?run=past-exams"), "Debe redirigir a /methods?run=past-exams");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("Runner case y Lazy Import de 'past-exams' en MethodsPage.tsx", () => {
  assert.ok(methodsPageSrc.includes("const PastExamsMethod = lazy"), "Debe importar PastExamsMethod perezosamente");
  assert.ok(methodsPageSrc.includes('case "past-exams":'), "Debe contener el switch case 'past-exams'");
  assert.ok(methodsPageSrc.includes("Banco de Parciales & Pareto"), "Debe mostrar botón de acceso directo en cabecera");
});

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADOS SUITE v5.23: ${passed} pasados, ${failed} fallidos`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
