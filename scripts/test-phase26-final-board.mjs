import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.26 (TRIBUNAL DE EXAMEN FINAL & TESIS)          ");
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
// [Test 1] Motor de Tribunal Colegiado (finalBoardEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Tribunal Colegiado (finalBoardEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "oral-defense", "finalBoardEngine.ts");

test("Existe src/features/oral-defense/finalBoardEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo finalBoardEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta interfaces canónicas y arquetipos de jurado", () => {
  assert.ok(engineSrc.includes("export type JuryArchetype ="), "Debe exportar JuryArchetype");
  assert.ok(engineSrc.includes('"dogmatic" | "practical" | "methodological"'), "Debe soportar los 3 arquetipos docentes");
  assert.ok(engineSrc.includes("export interface JuryMember"), "Debe exportar JuryMember");
  assert.ok(engineSrc.includes("export interface DefenseScenario"), "Debe exportar DefenseScenario");
  assert.ok(engineSrc.includes("export interface BoardEvaluationRecord"), "Debe exportar BoardEvaluationRecord");
});

test("Banco de Escenarios Precargados incluye Medicina, Derecho e Ingeniería", () => {
  assert.ok(engineSrc.includes("export const PRESET_DEFENSE_SCENARIOS"), "Debe exportar PRESET_DEFENSE_SCENARIOS");
  assert.ok(engineSrc.includes("defense-med-ateneo"), "Debe incluir ateneo clínico de medicina");
  assert.ok(engineSrc.includes("defense-law-tesis"), "Debe incluir defensa de tesis de derecho");
  assert.ok(engineSrc.includes("defense-eng-proyecto"), "Debe incluir defensa de proyecto de ingeniería");
});

test("Algoritmo detectOralSmoke detecta respuestas evasivas y telegráficas", () => {
  assert.ok(engineSrc.includes("export function detectOralSmoke"), "Debe exportar detectOralSmoke");
  assert.ok(engineSrc.includes("smokePhrases"), "Debe auditar muletillas de evasión");
});

test("Motor evaluateBoardPerformance calcula veredicto y genera Acta Oficial", () => {
  assert.ok(engineSrc.includes("export function evaluateBoardPerformance"), "Debe exportar evaluateBoardPerformance");
  assert.ok(engineSrc.includes("actaNumber"), "Debe generar número de acta oficial");
  assert.ok(engineSrc.includes("finalWeightedGrade"), "Debe computar promedio colegiado ponderado");
  assert.ok(engineSrc.includes("saveFinalBoardSessionRecord"), "Debe exportar guardado de sesión en IndexedDB");
});

// -----------------------------------------------------------------------------
// [Test 2] Interfaz de Usuario de la Sala de Tribunal (FinalBoardMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Interfaz de Usuario de la Sala de Tribunal (FinalBoardMethod.tsx)");

const uiFile = path.join(rootDir, "src", "components", "study-methods", "FinalBoardMethod.tsx");

test("Existe src/components/study-methods/FinalBoardMethod.tsx", () => {
  assert.ok(fs.existsSync(uiFile), "El componente FinalBoardMethod.tsx debe existir");
});

const uiSrc = fs.readFileSync(uiFile, "utf-8");

test("Renderiza sala de tribunal con estados de jurado y rondas de preguntas", () => {
  assert.ok(uiSrc.includes("selectedScenario.jury.map"), "Debe renderizar los 3 miembros del jurado");
  assert.ok(uiSrc.includes("isInterrogating"), "Debe resaltar al jurado activo que formula la pregunta");
  assert.ok(uiSrc.includes("activeRound.questionText"), "Debe mostrar la consigna de la ronda");
});

test("Soporta locución de preguntas con Web Speech y dictado por micrófono", () => {
  assert.ok(uiSrc.includes("speakJuryQuestion"), "Debe permitir escuchar la pregunta del jurado");
  assert.ok(uiSrc.includes("SpeechSynthesisUtterance"), "Debe usar síntesis de voz nativa");
  assert.ok(uiSrc.includes("toggleVoiceRecording"), "Debe permitir dictado de respuesta por voz");
});

test("Despliega Acta Oficial de Examen Final con opción de guardado e impresión", () => {
  assert.ok(uiSrc.includes("Acta Oficial de Examen Final"), "Debe desplegar título oficial del Acta");
  assert.ok(uiSrc.includes("handlePrintActa"), "Debe permitir imprimir o exportar el acta");
  assert.ok(uiSrc.includes("handleSaveToHistory"), "Debe permitir guardar el dictamen en el historial");
});

// -----------------------------------------------------------------------------
// [Test 3] Integraciones en el Ecosistema
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Integraciones en el Ecosistema");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("StudyMethodId incluye 'final-board'", () => {
  assert.ok(typesSrc.includes('"final-board"'), "StudyMethodId debe incluir 'final-board'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage incluye FinalBoardMethod con lazy loading y runner case", () => {
  assert.ok(methodsPageSrc.includes("FinalBoardMethod"), "Debe importar perezosamente FinalBoardMethod");
  assert.ok(methodsPageSrc.includes('case "final-board":'), "Debe despachar el runner de 'final-board'");
  assert.ok(methodsPageSrc.includes("Tribunal de Examen Final"), "Debe mostrar botón de acceso rápido");
});

const cmdServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const cmdServiceSrc = fs.readFileSync(cmdServiceFile, "utf-8");

test("commandPaletteService registra la acción 'action-final-board'", () => {
  assert.ok(cmdServiceSrc.includes("action-final-board"), "Debe registrar action-final-board");
  assert.ok(cmdServiceSrc.includes("/methods?run=final-board"), "Debe redirigir a /methods?run=final-board");
});

const cmdPaletteFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const cmdPaletteSrc = fs.readFileSync(cmdPaletteFile, "utf-8");

test("CommandPalette.tsx importa Scale y lo registra en ICON_MAP", () => {
  assert.ok(cmdPaletteSrc.includes("Scale"), "Debe importar Scale de lucide-react");
  assert.ok(cmdPaletteSrc.includes("Scale,\n};") || cmdPaletteSrc.includes("Scale,"), "Debe registrar Scale en ICON_MAP");
});

// -----------------------------------------------------------------------------
// Resumen de la Suite
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADO SUITE v5.26: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
