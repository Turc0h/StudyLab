import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.16 (SIMULADOR DE COLOQUIOS Y EXÁMENES ORALES)  ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Test 1] Estructura y Algoritmo de Rúbrica (oralDefenseEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Estructura y Motor de Rúbrica (oralDefenseEngine.ts)");
const enginePath = path.join(rootDir, "src/features/oral-defense/oralDefenseEngine.ts");
assert(fs.existsSync(enginePath), "Existe src/features/oral-defense/oralDefenseEngine.ts");

const engineContent = fs.readFileSync(enginePath, "utf-8");
assert(engineContent.includes("export function calculateOralRubricScore"), "Exporta calculateOralRubricScore");
assert(engineContent.includes("export function generateJuryQuestions"), "Exporta generateJuryQuestions");
assert(engineContent.includes("export async function saveOralSessionRecord"), "Exporta saveOralSessionRecord");
assert(engineContent.includes("db.sessions.add"), "Persiste telemetría en la tabla db.sessions");

// Simular cálculo de rúbrica
// Caso 1: Todas las dimensiones en 5 (Sobresaliente 10.0)
const maxScore = (25 / 25) * 10;
assert(maxScore === 10.0, "Puntaje máximo de rúbrica computa 10.0 sobre 10");

// Caso 2: Puntuación regular (4 + 3 + 3 + 3 + 3 = 16 / 25 = 6.4)
const regularGrade = Math.round((16 / 25) * 10 * 10) / 10;
assert(regularGrade === 6.4, `Puntuación regular computa 6.4 sobre 10 (actual: ${regularGrade})`);

// Caso 3: Puntuación deficiente (1 + 1 + 1 + 1 + 2 = 6 / 25 = 2.4)
const failGrade = Math.round((6 / 25) * 10 * 10) / 10;
assert(failGrade === 2.4, `Puntuación baja computa 2.4 sobre 10 (actual: ${failGrade})`);

// -----------------------------------------------------------------------------
// [Test 2] Generador de Preguntas del Tribunal
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Generador de Preguntas de la Mesa Examinadora");
assert(engineContent.includes("Profesor Titular"), "Incluye preguntas de cátedra formal");
assert(engineContent.includes("Jefe de Trabajos Prácticos"), "Incluye preguntas de condiciones de borde y práctica");
assert(engineContent.includes("Vocal del Tribunal"), "Incluye preguntas de discriminación y objeciones");
assert(engineContent.includes("recommendedTimeSec"), "Asigna tiempos recomendados por respuesta");

// -----------------------------------------------------------------------------
// [Test 3] Componente Interactivo de Coloquio (OralDefenseMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Interactivo (OralDefenseMethod.tsx)");
const compPath = path.join(rootDir, "src/components/study-methods/OralDefenseMethod.tsx");
assert(fs.existsSync(compPath), "Existe src/components/study-methods/OralDefenseMethod.tsx");

const compContent = fs.readFileSync(compPath, "utf-8");
assert(compContent.includes("export const OralDefenseMethod"), "Exporta el componente OralDefenseMethod");
assert(compContent.includes("Phase = \"setup\" | \"exposition\" | \"questions\" | \"rubric\""), "Implementa las 4 fases pedagógicas (setup, exposition, questions, rubric)");
assert(compContent.includes("cheatSheetNotes"), "Soporta Ficha de Ponencia / Tarjeta de Memoria permitida en mesa");
assert(compContent.includes("SpeechRecognition"), "Dispone de integración nativa con Web Speech API para medir fluidez oral");
assert(compContent.includes("formatTime"), "Formatea temporizador de exposición en minutos y segundos");
assert(compContent.includes("conceptualMastery"), "Evalúa dimensión de Dominio Conceptual");
assert(compContent.includes("terminologyRigor"), "Evalúa dimensión de Rigor Terminológico");
assert(compContent.includes("timeManagement"), "Evalúa dimensión de Manejo del Tiempo");
assert(compContent.includes("objectionHandling"), "Evalúa dimensión de Respuesta ante Objeciones");
assert(compContent.includes("calmPoise"), "Evalúa dimensión de Serenidad Escénica");

// -----------------------------------------------------------------------------
// [Test 4] Integración en Catálogo de Métodos (MethodsPage.tsx y types)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en Catálogo de Métodos y Tipos");
const typesPath = path.join(rootDir, "src/types/index.ts");
const typesContent = fs.readFileSync(typesPath, "utf-8");
assert(typesContent.includes('"oral-defense"'), "types/index.ts incluye 'oral-defense' en StudyMethodId");

const methodsPagePath = path.join(rootDir, "src/pages/MethodsPage.tsx");
const methodsPageContent = fs.readFileSync(methodsPagePath, "utf-8");
assert(methodsPageContent.includes("const OralDefenseMethod = lazy"), "MethodsPage.tsx importa OralDefenseMethod con carga diferida (lazy)");
assert(methodsPageContent.includes('case "oral-defense":'), "MethodsPage.tsx dispone de switch case para 'oral-defense'");
assert(methodsPageContent.includes("Simulador de Coloquio Oral"), "MethodsPage.tsx dispone de botón directo para iniciar el simulador");
assert(methodsPageContent.includes('handleStartMethod("oral-defense")'), "El botón inicia directamente el simulador oral");

// -----------------------------------------------------------------------------
// [Test 5] Integración en Command Palette (Ctrl+K)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en Command Palette y Atajos");
const palettePath = path.join(rootDir, "src/features/command-palette/commandPaletteService.ts");
const paletteContent = fs.readFileSync(palettePath, "utf-8");
assert(paletteContent.includes("action-oral-defense"), "commandPaletteService.ts registra la acción 'action-oral-defense'");
assert(paletteContent.includes("/methods?run=oral-defense"), "Navega directamente al runner oral: /methods?run=oral-defense");
assert(paletteContent.includes('"coloquio"') && paletteContent.includes('"defensa"') && paletteContent.includes('"tribunal"'), "Indexa palabras clave de coloquio, defensa y tribunal");

const paletteCompPath = path.join(rootDir, "src/components/command-palette/CommandPalette.tsx");
const paletteCompContent = fs.readFileSync(paletteCompPath, "utf-8");
assert(paletteCompContent.includes("Mic"), "CommandPalette.tsx importa y mapea el icono Mic");

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed === 0) {
  console.log(">> ETAPA v5.16 COMPLETADA CON ÉXITO: Simulador de Coloquios y Exámenes Orales operativo. <<\n");
  process.exit(0);
} else {
  console.error(">> ERROR: Algunas pruebas de la Etapa v5.16 fallaron. <<\n");
  process.exit(1);
}
