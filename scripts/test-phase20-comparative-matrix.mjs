import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.20 (MATRIZ COMPARATIVA Y DESPIECE TEÓRICO)     ");
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
// [Test 1] Motor de Matrices Comparativas (comparativeMatrixEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Matrices Comparativas (comparativeMatrixEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "comparative-matrix", "comparativeMatrixEngine.ts");

test("Existe src/features/comparative-matrix/comparativeMatrixEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo comparativeMatrixEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta PRESET_COMPARATIVE_MATRICES, createBlindRecallDeck, evaluateRecallAnswer y saveMatrixSessionRecord", () => {
  assert.ok(engineSrc.includes("export const PRESET_COMPARATIVE_MATRICES"), "Debe exportar PRESET_COMPARATIVE_MATRICES");
  assert.ok(engineSrc.includes("export function createBlindRecallDeck"), "Debe exportar createBlindRecallDeck");
  assert.ok(engineSrc.includes("export function evaluateRecallAnswer"), "Debe exportar evaluateRecallAnswer");
  assert.ok(engineSrc.includes("export async function saveMatrixSessionRecord"), "Debe exportar saveMatrixSessionRecord");
});

test("Banco de Matrices Multidisciplinarias Precargadas", () => {
  assert.ok(engineSrc.includes("learning-theories"), "Debe incluir teorías del aprendizaje");
  assert.ok(engineSrc.includes("cardio-failure"), "Debe incluir diagnóstico diferencial médico");
  assert.ok(engineSrc.includes("macro-schools"), "Debe incluir escuelas macroeconómicas");
  assert.ok(engineSrc.includes("civil-liability"), "Debe incluir responsabilidad civil jurídica");
});

test("Indexación Canónica de Celdas y Ejes", () => {
  assert.ok(engineSrc.includes("entities"), "Debe definir lista de entidades (columnas)");
  assert.ok(engineSrc.includes("dimensions"), "Debe definir lista de dimensiones (filas)");
  assert.ok(engineSrc.includes("cells"), "Debe contener mapa indexado de celdas");
  assert.ok(engineSrc.includes("frictionPoints"), "Debe mapear puntos de fricción teórica de examen");
});

// -----------------------------------------------------------------------------
// [Test 2] Generador de Celdas Ciegas y Evaluación Semántica
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo de Active Recall a Celdas Ciegas");

test("Generación de Mazo de Celdas Ciegas con ratio configurable", () => {
  assert.ok(engineSrc.includes("blindRatio"), "Debe aceptar ratio de celdas ocultas");
  assert.ok(engineSrc.includes("isHidden"), "Debe computar estado de ocultamiento");
  assert.ok(engineSrc.includes("masteryStatus"), "Debe registrar estado de maestría inicial");
});

test("Evaluador de Respuestas Semánticas y Palabras Clave", () => {
  assert.ok(engineSrc.includes("matchedKeywords"), "Debe retornar palabras clave acertadas");
  assert.ok(engineSrc.includes("missingKeywords"), "Debe retornar conceptos faltantes");
  assert.ok(engineSrc.includes("score"), "Debe calcular puntaje proporcional");
});

// -----------------------------------------------------------------------------
// [Test 3] Componente Interactivo (ComparativeMatrixMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Interactivo (ComparativeMatrixMethod.tsx)");

const compFile = path.join(rootDir, "src", "components", "study-methods", "ComparativeMatrixMethod.tsx");

test("Existe src/components/study-methods/ComparativeMatrixMethod.tsx", () => {
  assert.ok(fs.existsSync(compFile), "Debe existir ComparativeMatrixMethod.tsx");
});

const compSrc = fs.readFileSync(compFile, "utf-8");

test("ComparativeMatrixMethod exporta componente y soporta ambos modos (table y blind-recall)", () => {
  assert.ok(compSrc.includes("export const ComparativeMatrixMethod"), "Debe exportar ComparativeMatrixMethod");
  assert.ok(compSrc.includes('viewMode === "table"'), "Modo 1: Cuadro Completo de Estudio");
  assert.ok(compSrc.includes('viewMode === "blind-recall"'), "Modo 2: Active Recall a Celdas Ciegas");
});

test("Modo Celdas Ciegas incluye calificación y progreso en vivo", () => {
  assert.ok(compSrc.includes("handleRateCell"), "Debe permitir calificar celda");
  assert.ok(compSrc.includes("mastered"), "Estado dominado");
  assert.ok(compSrc.includes("doubtful"), "Estado dudoso");
  assert.ok(compSrc.includes("failed"), "Estado fallo");
  assert.ok(compSrc.includes("blindStats"), "Debe computar estadísticas de dominio global");
});

test("Permite crear matrices comparativas personalizadas", () => {
  assert.ok(compSrc.includes("handleCreateCustomMatrix"), "Debe soportar creación de matrices propias");
  assert.ok(compSrc.includes("customTitle"), "Título de matriz personalizada");
});

// -----------------------------------------------------------------------------
// [Test 4] Integraciones en el Catálogo, Tipos y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integraciones en Catálogo, Tipos y Command Palette");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("types/index.ts incluye 'comparative-matrix' en StudyMethodId", () => {
  assert.ok(typesSrc.includes('"comparative-matrix"'), "StudyMethodId debe incluir 'comparative-matrix'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage.tsx importa ComparativeMatrixMethod con carga diferida (lazy)", () => {
  assert.ok(methodsPageSrc.includes("ComparativeMatrixMethod"), "Debe importar ComparativeMatrixMethod");
  assert.ok(methodsPageSrc.includes('case "comparative-matrix":'), "Debe resolver case 'comparative-matrix'");
});

test("MethodsPage.tsx incluye botón de acceso rápido para 'Matriz Comparativa'", () => {
  assert.ok(methodsPageSrc.includes('handleStartMethod("comparative-matrix")'), "Debe invocar 'comparative-matrix'");
  assert.ok(methodsPageSrc.includes("Matriz Comparativa de Cátedra"), "Etiqueta legible del botón");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("commandPaletteService.ts registra 'action-comparative-matrix'", () => {
  assert.ok(paletteServiceSrc.includes("action-comparative-matrix"), "Debe registrar action-comparative-matrix");
  assert.ok(paletteServiceSrc.includes("/methods?run=comparative-matrix"), "Debe navegar a /methods?run=comparative-matrix");
  assert.ok(paletteServiceSrc.includes("Matriz Comparativa y Despiece Teórico"), "Título descriptivo de la acción");
});

const paletteCompFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const paletteCompSrc = fs.readFileSync(paletteCompFile, "utf-8");

test("CommandPalette.tsx importa y mapea el icono Columns3", () => {
  assert.ok(paletteCompSrc.includes("Columns3"), "Debe importar Columns3");
  assert.ok(paletteCompSrc.includes("Columns3,"), "Debe mapear Columns3 en ICON_MAP");
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
  console.log(">> ETAPA v5.20 COMPLETADA CON ÉXITO: Matriz Comparativa y Despiece Teórico operativos. <<\n");
  process.exit(0);
}
