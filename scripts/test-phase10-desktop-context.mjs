import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.10 (CONTEXTO DE ENTORNO DESKTOP EN RUST)    ");
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
// Test 1: Módulo Rust Nativo (src-tauri/src/desktop_context.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Módulo Rust Nativo (src-tauri/src/desktop_context.rs)");
const rustFilePath = path.join(root, "src-tauri/src/desktop_context.rs");
assert(fs.existsSync(rustFilePath), "Existe src-tauri/src/desktop_context.rs");
const rustContent = fs.readFileSync(rustFilePath, "utf-8");

assert(rustContent.includes("pub struct DetectedStudyApp"), "Define struct público DetectedStudyApp");
assert(rustContent.includes("pub fn detect_active_study_tools"), "Declara comando tauri #[tauri::command] detect_active_study_tools");
assert(rustContent.includes("custom_whitelist: Option<Vec<String>>"), "Acepta lista blanca personalizada opt-in");
assert(rustContent.includes("allowed_set: HashSet<String>"), "Implementa HashSet estricto para no inspeccionar procesos no autorizados");
assert(rustContent.includes("logical-depth") && rustContent.includes("memory-fortress"), "Mapea herramientas hacia perfiles cognitivos canónicos");
assert(rustContent.includes("divergent-synthesis") && rustContent.includes("exam-simulation"), "Cubre los 4 perfiles cognitivos de StudyLab");
assert(rustContent.includes("code.exe") && rustContent.includes("sumatrapdf.exe"), "Incluye ejecutables de estudio estándar en lista blanca");
assert(rustContent.includes("obsidian.exe") && rustContent.includes("anki.exe"), "Incluye gestores de notas y flashcards en lista blanca");

// -----------------------------------------------------------------------------
// Test 2: Registro en el runtime de Tauri (src-tauri/src/lib.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Registro en el runtime de Tauri (src-tauri/src/lib.rs)");
const libFilePath = path.join(root, "src-tauri/src/lib.rs");
const libContent = fs.readFileSync(libFilePath, "utf-8");

assert(libContent.includes("pub mod desktop_context;"), "Declara pub mod desktop_context;");
assert(libContent.includes("desktop_context::detect_active_study_tools"), "Registra comando detect_active_study_tools en invoke_handler!");

// -----------------------------------------------------------------------------
// Test 3: Servicio Frontend de Contexto (desktopContextService.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Servicio Frontend de Contexto (desktopContextService.ts)");
const serviceFilePath = path.join(root, "src/features/context-engine/desktopContextService.ts");
assert(fs.existsSync(serviceFilePath), "Existe desktopContextService.ts");
const serviceContent = fs.readFileSync(serviceFilePath, "utf-8");

assert(serviceContent.includes("export interface DetectedStudyApp"), "Exporta interfaz DetectedStudyApp");
assert(serviceContent.includes("export interface StudyEnvironmentReport"), "Exporta interfaz StudyEnvironmentReport");
assert(serviceContent.includes("export const CANONICAL_STUDY_WHITELIST"), "Exporta lista blanca CANONICAL_STUDY_WHITELIST");
assert(serviceContent.includes("export const PROFILE_METADATA"), "Exporta metadatos y métodos recomendados por perfil");
assert(serviceContent.includes("export function isTauriEnvironment"), "Exporta función isTauriEnvironment");
assert(serviceContent.includes("export async function detectActiveStudyTools"), "Exporta función asíncrona detectActiveStudyTools");
assert(serviceContent.includes("export function analyzeEnvironmentReport"), "Exporta analizador determinista analyzeEnvironmentReport");

// -----------------------------------------------------------------------------
// Test 4: Algoritmo de Ponderación Cognitiva en Memoria
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Algoritmo de Ponderación Cognitiva en Memoria");
const { analyzeEnvironmentReport } = await import("../src/features/context-engine/desktopContextService.ts");

// Caso A: Sin procesos
const emptyReport = analyzeEnvironmentReport([]);
assert(emptyReport.suggestedProfile === "logical-depth", "Reporte vacío sugiere perfil predeterminado logical-depth");
assert(emptyReport.detectedApps.length === 0, "No reporta aplicaciones si la lista es vacía");
assert(emptyReport.confidence >= 0.5, "Confianza base adecuada para estado inicial");

// Caso B: Herramientas de programación (IDE)
const devApps = [
  { process_name: "code.exe", display_name: "Visual Studio Code", category: "IDE", suggested_profile: "logical-depth" },
  { process_name: "rstudio.exe", display_name: "RStudio", category: "Cálculo", suggested_profile: "logical-depth" }
];
const devReport = analyzeEnvironmentReport(devApps);
assert(devReport.suggestedProfile === "logical-depth", "Detecta perfil logical-depth para herramientas de desarrollo");
assert(devReport.confidence > 0.7, "Confianza incrementada al detectar múltiples herramientas coincidentes");
assert(devReport.recommendedMethods.some(m => m.id === "feynman"), "Recomienda Técnica Feynman para logical-depth");
assert(devReport.recommendedMethods.some(m => m.id === "problem-based-learning"), "Recomienda PBL para logical-depth");

// Caso C: Lectores de Documentos PDF
const docApps = [
  { process_name: "sumatrapdf.exe", display_name: "SumatraPDF", category: "Visor PDF", suggested_profile: "memory-fortress" },
  { process_name: "calibre.exe", display_name: "Calibre", category: "E-Books", suggested_profile: "memory-fortress" }
];
const docReport = analyzeEnvironmentReport(docApps);
assert(docReport.suggestedProfile === "memory-fortress", "Detecta perfil memory-fortress para visores de lectura");
assert(docReport.recommendedMethods.some(m => m.id === "leitner"), "Recomienda Método Leitner para memory-fortress");
assert(docReport.recommendedMethods.some(m => m.id === "spaced-repetition"), "Recomienda Repaso Espaciado para memory-fortress");

// Caso D: Gestores de Notas y Síntesis
const noteApps = [
  { process_name: "obsidian.exe", display_name: "Obsidian", category: "Segundo Cerebro", suggested_profile: "divergent-synthesis" }
];
const noteReport = analyzeEnvironmentReport(noteApps);
assert(noteReport.suggestedProfile === "divergent-synthesis", "Detecta perfil divergent-synthesis para toma de notas");
assert(noteReport.recommendedMethods.some(m => m.id === "zettelkasten"), "Recomienda Zettelkasten para notas atómicas");

// -----------------------------------------------------------------------------
// Test 5: Componente UI DesktopEnvironmentContext.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Componente UI DesktopEnvironmentContext.tsx");
const compFilePath = path.join(root, "src/features/context-engine/DesktopEnvironmentContext.tsx");
assert(fs.existsSync(compFilePath), "Existe DesktopEnvironmentContext.tsx");
const compContent = fs.readFileSync(compFilePath, "utf-8");

assert(compContent.includes("export const DesktopEnvironmentContext"), "Exporta componente DesktopEnvironmentContext");
assert(compContent.includes("detectActiveStudyTools"), "Invoca función de detección de herramientas");
assert(compContent.includes("analyzeEnvironmentReport"), "Utiliza el analizador de contexto");
assert(compContent.includes("Privacidad y Ética Innegociable"), "Contiene aviso explícito de privacidad local");
assert(compContent.includes("Escanear Ahora"), "Provee botón de refresco manual");
assert(compContent.includes("Auto (30s)"), "Provee alternador de escaneo periódico");
assert(compContent.includes("Activar Postura"), "Permite activar la postura mental con un clic");
assert(compContent.includes("Iniciar Método"), "Permite lanzar los métodos recomendados directamente");

// -----------------------------------------------------------------------------
// Test 6: Integración en ContextEngineDashboard.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Integración en ContextEngineDashboard.tsx");
const dashFilePath = path.join(root, "src/features/context-engine/ContextEngineDashboard.tsx");
const dashContent = fs.readFileSync(dashFilePath, "utf-8");

assert(dashContent.includes("import { DesktopEnvironmentContext }"), "Importa DesktopEnvironmentContext en el dashboard");
assert(dashContent.includes('id: "desktop", label: "Entorno Desktop"'), "Registra pestaña 'Entorno Desktop' con icono Laptop");
assert(dashContent.includes('{activeTab === "desktop" && <DesktopEnvironmentContext />}'), "Monta la vista condicionalmente cuando activeTab === 'desktop'");

// -----------------------------------------------------------------------------
// Resumen Final
// -----------------------------------------------------------------------------
console.log("\n--------------------------------------------------------------------------------");
console.log(`TOTAL PRUEBAS FASE v5.10: ${passed + failed} | APROBADAS: ${passed} | FALLIDAS: ${failed}`);
console.log("--------------------------------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}
