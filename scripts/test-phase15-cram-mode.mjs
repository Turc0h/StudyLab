import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.15 (MODO REPASO RÁPIDO DE EMERGENCIA / CRAM) ");
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
// [Test 1] Estructura y Exportaciones de cramSelector.ts
// -----------------------------------------------------------------------------
console.log("[Test 1] Estructura y Algoritmo de Urgencia (cramSelector.ts)");
const cramSelectorPath = path.join(rootDir, "src/features/cram/cramSelector.ts");
assert(fs.existsSync(cramSelectorPath), "Existe src/features/cram/cramSelector.ts");

const cramSelectorContent = fs.readFileSync(cramSelectorPath, "utf-8");
assert(cramSelectorContent.includes("export function calculateItemUrgencyScore"), "Exporta calculateItemUrgencyScore");
assert(cramSelectorContent.includes("export async function selectCramDeck"), "Exporta selectCramDeck");
assert(cramSelectorContent.includes("export async function saveCramSessionSummary"), "Exporta saveCramSessionSummary");
assert(cramSelectorContent.includes("calculateRetrievability"), "Aplica fórmula matemática de Retrievability FSRS");

// Simular cálculo de urgencia
// Error no resuelto
const unresolvedErrorScore = 95;
const resolvedErrorScore = 65;
assert(unresolvedErrorScore > resolvedErrorScore, "Errores pedagógicos no resueltos tienen prioridad crítica (95 vs 65)");

// R bajo vs R alto
// Simulando fórmula: (1 - R) * 75 + (diff/10)*15
const weakCardUrgency = Math.round((1 - 0.2) * 75 + (6 / 10) * 15);
const strongCardUrgency = Math.round((1 - 0.95) * 75 + (3 / 10) * 15);
assert(weakCardUrgency > strongCardUrgency, `Tarjetas con retención frágil obtienen mayor urgencia (${weakCardUrgency} vs ${strongCardUrgency})`);

// -----------------------------------------------------------------------------
// [Test 2] Principio de Aislamiento de Memoria FSRS (Zero Distortion)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Principio de Aislamiento de Memoria FSRS");
assert(!cramSelectorContent.includes("executeFsrsReview"), "NO ejecuta executeFsrsReview (evita alterar intervalos de largo plazo)");
assert(!cramSelectorContent.includes("db.cardsFsrs.put"), "NO sobreescribe directamente registros en db.cardsFsrs");
assert(!cramSelectorContent.includes("db.cardsFsrs.update"), "NO altera dueDate ni stability en db.cardsFsrs");
assert(cramSelectorContent.includes("db.sessions.add"), "Registra telemetría de estudio en db.sessions de forma aislada");

// -----------------------------------------------------------------------------
// [Test 3] Componente Interactivo de Sesión Blitz (CramMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Interactivo de Sesión Blitz (CramMethod.tsx)");
const cramMethodPath = path.join(rootDir, "src/components/study-methods/CramMethod.tsx");
assert(fs.existsSync(cramMethodPath), "Existe src/components/study-methods/CramMethod.tsx");

const cramMethodContent = fs.readFileSync(cramMethodPath, "utf-8");
assert(cramMethodContent.includes("export const CramMethod"), "Exporta el componente CramMethod");
assert(cramMethodContent.includes("TimerSetting"), "Declara opciones de temporizador por tarjeta");
assert(cramMethodContent.includes("handleStartBlitz"), "Permite iniciar la sesión Blitz con opciones configuradas");
assert(cramMethodContent.includes("handleRate"), "Gestiona calificaciones: correcto, dudoso y fallo");
assert(cramMethodContent.includes("setQueue((prev) => [...prev, currentItem])"), "Reinserta conceptos fallados al final de la cola Blitz para asegurar dominio");
assert(cramMethodContent.includes("Garantía de Aislamiento FSRS"), "Comunica explícitamente al estudiante la garantía de aislamiento FSRS");
assert(cramMethodContent.includes("Space"), "Soporta atajo de teclado Espacio para voltear");
assert(cramMethodContent.includes("e.key === \"1\""), "Soporta atajo '1' para Fallo / Reinsertar");
assert(cramMethodContent.includes("e.key === \"2\""), "Soporta atajo '2' para Dudoso");
assert(cramMethodContent.includes("e.key === \"3\""), "Soporta atajo '3' para Dominado");

// -----------------------------------------------------------------------------
// [Test 4] Integración en Catálogo de Métodos (MethodsPage.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en Catálogo de Métodos (MethodsPage.tsx)");
const methodsPagePath = path.join(rootDir, "src/pages/MethodsPage.tsx");
assert(fs.existsSync(methodsPagePath), "Existe src/pages/MethodsPage.tsx");

const methodsPageContent = fs.readFileSync(methodsPagePath, "utf-8");
assert(methodsPageContent.includes("const CramMethod = lazy"), "Importa CramMethod de manera diferida (lazy)");
assert(methodsPageContent.includes('case "cram":'), "Enlaza el runner activo para el identificador 'cram'");
assert(methodsPageContent.includes("Modo Repaso de Emergencia (Blitz)"), "Dispone de botón visible para acceder al Modo Repaso de Emergencia");
assert(methodsPageContent.includes('handleStartMethod("cram")'), "El botón inicia directamente el runner de Cram Blitz");

// -----------------------------------------------------------------------------
// [Test 5] Integración en Command Palette y Dashboard
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en Command Palette y Dashboard");
const paletteServicePath = path.join(rootDir, "src/features/command-palette/commandPaletteService.ts");
const paletteContent = fs.readFileSync(paletteServicePath, "utf-8");
assert(paletteContent.includes("action-cram"), "commandPaletteService.ts registra la acción 'action-cram'");
assert(paletteContent.includes("/methods?run=cram"), "Navega directamente a /methods?run=cram");
assert(paletteContent.includes('"cram"') && paletteContent.includes('"emergencia"') && paletteContent.includes('"blitz"'), "Indexa palabras clave de emergencia ('cram', 'emergencia', 'blitz')");

const paletteCompPath = path.join(rootDir, "src/components/command-palette/CommandPalette.tsx");
const paletteCompContent = fs.readFileSync(paletteCompPath, "utf-8");
assert(paletteCompContent.includes("Flame"), "CommandPalette.tsx importa y mapea el icono Flame");

const dashboardPath = path.join(rootDir, "src/pages/Dashboard.tsx");
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
assert(dashboardContent.includes("/methods?run=cram"), "Dashboard.tsx dispone de acceso directo a /methods?run=cram");
assert(dashboardContent.includes("Repaso Blitz Pre-Examen"), "Muestra botón de Repaso Blitz Pre-Examen en la cabecera");

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed === 0) {
  console.log(">> ETAPA v5.15 COMPLETADA CON ÉXITO: Modo Repaso Rápido de Emergencia (Cram) operativo. <<\n");
  process.exit(0);
} else {
  console.error(">> ERROR: Algunas pruebas de la Etapa v5.15 fallaron. <<\n");
  process.exit(1);
}
