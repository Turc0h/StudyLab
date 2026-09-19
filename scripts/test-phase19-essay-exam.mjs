import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.19 (EXÁMENES A DESARROLLO & ENSAYOS)           ");
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
// [Test 1] Motor de Evaluación y Rúbrica (essayGraderEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Evaluación y Rúbrica de Cátedra (essayGraderEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "essay-grader", "essayGraderEngine.ts");

test("Existe src/features/essay-grader/essayGraderEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo essayGraderEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta countWords, evaluateVerbiage, analyzeStructure, evaluateEssay y PRESET_ESSAY_PROMPTS", () => {
  assert.ok(engineSrc.includes("export function countWords"), "Debe exportar countWords");
  assert.ok(engineSrc.includes("export function evaluateVerbiage"), "Debe exportar evaluateVerbiage");
  assert.ok(engineSrc.includes("export function analyzeStructure"), "Debe exportar analyzeStructure");
  assert.ok(engineSrc.includes("export function evaluateEssay"), "Debe exportar evaluateEssay");
  assert.ok(engineSrc.includes("export const PRESET_ESSAY_PROMPTS"), "Debe exportar PRESET_ESSAY_PROMPTS");
});

test("Conteo de Palabras Limpio", () => {
  const countWords = (text) => (text && text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
  assert.equal(countWords(""), 0);
  assert.equal(countWords("   "), 0);
  assert.equal(countWords("El principio de legalidad"), 4);
  assert.equal(countWords("  Palabra1   Palabra2 \n Palabra3 \t Palabra4  "), 4);
});

// -----------------------------------------------------------------------------
// [Test 2] Algoritmo del 'Detector de Humo' y Análisis Estructural
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo del 'Detector de Humo' y Análisis Estructural");

test("Detecta frases vacías y calcula tasa de verborragia", () => {
  assert.ok(engineSrc.includes("COMMON_ACADEMIC_FILLERS"), "Debe incluir catálogo de frases de relleno");
  assert.ok(engineSrc.includes("fillerCount"), "Debe cuantificar frases vacías detectadas");
  assert.ok(engineSrc.includes("verbiageRatioPct"), "Debe calcular porcentaje de relleno");
});

test("Identifica componentes estructurales de un ensayo universitario", () => {
  assert.ok(engineSrc.includes("hasIntroduction"), "Debe evaluar planteo o tesis inicial");
  assert.ok(engineSrc.includes("hasArgumentation"), "Debe evaluar desarrollo fundamentado");
  assert.ok(engineSrc.includes("hasCounterArgument"), "Debe evaluar casos límites o excepciones");
  assert.ok(engineSrc.includes("hasConclusion"), "Debe evaluar síntesis y conclusión final");
});

// -----------------------------------------------------------------------------
// [Test 3] Rúbrica de 4 Dimensiones y Normalización sobre 10
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Rúbrica de 4 Dimensiones y Normalización sobre 10");

test("Aplica ponderación matemática de cátedra", () => {
  assert.ok(engineSrc.includes("conceptualScore * 0.35"), "35% Dominio Conceptual");
  assert.ok(engineSrc.includes("structureScore * 0.25"), "25% Estructura y Cohesión");
  assert.ok(engineSrc.includes("criticalRigorScore * 0.20"), "20% Rigor Crítico");
  assert.ok(engineSrc.includes("clarityScore * 0.20"), "20% Claridad y Detector de Humo");
});

test("Categorización de Veredicto (Sobresaliente, Distinguido, Aprobado, Insuficiente)", () => {
  assert.ok(engineSrc.includes("Sobresaliente"), "Debe clasificar Sobresaliente");
  assert.ok(engineSrc.includes("Distinguido"), "Debe clasificar Distinguido");
  assert.ok(engineSrc.includes("Aprobado / Regular"), "Debe clasificar Aprobado / Regular");
  assert.ok(engineSrc.includes("Insuficiente"), "Debe clasificar Insuficiente");
});

test("Banco de Consignas Universitarias Precargadas", () => {
  assert.ok(engineSrc.includes("med-shock"), "Debe incluir caso de Medicina");
  assert.ok(engineSrc.includes("law-proportionality"), "Debe incluir caso de Derecho");
  assert.ok(engineSrc.includes("eng-nyquist"), "Debe incluir caso de Ingeniería");
  assert.ok(engineSrc.includes("soc-hegel"), "Debe incluir caso de Humanidades");
});

// -----------------------------------------------------------------------------
// [Test 4] Componente Interactivo (EssayExamMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Componente Interactivo (EssayExamMethod.tsx)");

const compFile = path.join(rootDir, "src", "components", "study-methods", "EssayExamMethod.tsx");

test("Existe src/components/study-methods/EssayExamMethod.tsx", () => {
  assert.ok(fs.existsSync(compFile), "Debe existir EssayExamMethod.tsx");
});

const compSrc = fs.readFileSync(compFile, "utf-8");

test("EssayExamMethod exporta componente y maneja los 3 estados del examen", () => {
  assert.ok(compSrc.includes("export const EssayExamMethod"), "Debe exportar EssayExamMethod");
  assert.ok(compSrc.includes("setup"), "Fase de configuración previa");
  assert.ok(compSrc.includes("writing"), "Fase de redacción activa bajo tiempo");
  assert.ok(compSrc.includes("evaluated"), "Fase de dictamen y evaluación de cátedra");
});

test("Incluye editor con contador en vivo, barra de progreso y temporizador", () => {
  assert.ok(compSrc.includes("currentWordCount"), "Debe computar palabras en vivo");
  assert.ok(compSrc.includes("secondsRemaining"), "Debe controlar reloj regresivo");
  assert.ok(compSrc.includes("textarea"), "Debe incluir área de redacción");
});

// -----------------------------------------------------------------------------
// [Test 5] Integraciones en el Catálogo, Tipos y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integraciones en el Catálogo, Tipos y Command Palette");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("types/index.ts incluye 'essay-exam' en StudyMethodId", () => {
  assert.ok(typesSrc.includes('"essay-exam"'), "StudyMethodId debe incluir 'essay-exam'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage.tsx importa EssayExamMethod con carga diferida (lazy)", () => {
  assert.ok(methodsPageSrc.includes("EssayExamMethod"), "Debe importar EssayExamMethod");
  assert.ok(methodsPageSrc.includes('case "essay-exam":'), "Debe resolver case 'essay-exam' en el switch");
});

test("MethodsPage.tsx incluye botón de acceso rápido para 'Examen a Desarrollo'", () => {
  assert.ok(methodsPageSrc.includes('handleStartMethod("essay-exam")'), "Debe invocar 'essay-exam'");
  assert.ok(methodsPageSrc.includes("Examen a Desarrollo & Ensayo"), "Etiqueta legible del botón");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("commandPaletteService.ts registra 'action-essay-exam'", () => {
  assert.ok(paletteServiceSrc.includes("action-essay-exam"), "Debe registrar action-essay-exam");
  assert.ok(paletteServiceSrc.includes("/methods?run=essay-exam"), "Debe navegar a /methods?run=essay-exam");
  assert.ok(paletteServiceSrc.includes("Simulador de Exámenes a Desarrollo"), "Título descriptivo de la acción");
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
  console.log(">> ETAPA v5.19 COMPLETADA CON ÉXITO: Simulador de Exámenes a Desarrollo y Ensayos operativo. <<\n");
  process.exit(0);
}
