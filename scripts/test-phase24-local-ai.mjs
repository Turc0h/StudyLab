import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.24 (IA LOCAL / PUENTE OLLAMA)                  ");
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
// [Test 1] Cliente HTTP y Streaming Ollama (ollamaClient.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Cliente HTTP y Streaming Ollama (ollamaClient.ts)");

const clientFile = path.join(rootDir, "src", "platform", "ai", "ollamaClient.ts");

test("Existe src/platform/ai/ollamaClient.ts", () => {
  assert.ok(fs.existsSync(clientFile), "El archivo ollamaClient.ts debe existir");
});

const clientSrc = fs.readFileSync(clientFile, "utf-8");

test("Exporta checkOllamaStatus, generateOllamaStream, chatOllamaStream, getStoredOllamaConfig y saveStoredOllamaConfig", () => {
  assert.ok(clientSrc.includes("export async function checkOllamaStatus"), "Debe exportar checkOllamaStatus");
  assert.ok(clientSrc.includes("export async function generateOllamaStream"), "Debe exportar generateOllamaStream");
  assert.ok(clientSrc.includes("export async function chatOllamaStream"), "Debe exportar chatOllamaStream");
  assert.ok(clientSrc.includes("export function getStoredOllamaConfig"), "Debe exportar getStoredOllamaConfig");
  assert.ok(clientSrc.includes("export function saveStoredOllamaConfig"), "Debe exportar saveStoredOllamaConfig");
});

test("Soporta streaming de tokens por lectura de buffers NDJSON", () => {
  assert.ok(clientSrc.includes("response.body.getReader()"), "Debe usar ReadableStream reader para streaming de tokens");
  assert.ok(clientSrc.includes("onChunk"), "Debe soportar callback de chunk acumulativo");
});

// -----------------------------------------------------------------------------
// [Test 2] Motor de IA Académica y Modos de Estudio (localAiEngine.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Motor de IA Académica y Modos de Estudio (localAiEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "ai-bridge", "localAiEngine.ts");

test("Existe src/features/ai-bridge/localAiEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo localAiEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta buildSystemPromptForMode, generateOfflineDeterministicResponse, executeAcademicQuery y saveAiStudySessionRecord", () => {
  assert.ok(engineSrc.includes("export function buildSystemPromptForMode"), "Debe exportar buildSystemPromptForMode");
  assert.ok(engineSrc.includes("export function generateOfflineDeterministicResponse"), "Debe exportar generateOfflineDeterministicResponse");
  assert.ok(engineSrc.includes("export async function executeAcademicQuery"), "Debe exportar executeAcademicQuery");
  assert.ok(engineSrc.includes("export async function saveAiStudySessionRecord"), "Debe exportar saveAiStudySessionRecord");
});

test("Soporta los 4 Modos Académicos Formales", () => {
  assert.ok(engineSrc.includes('"socratic_tutor"'), "Soporta Tutor Socrático");
  assert.ok(engineSrc.includes('"exam_question_generator"'), "Soporta Generador de Preguntas de Examen");
  assert.ok(engineSrc.includes('"rubric_evaluator"'), "Soporta Evaluador de Rúbricas");
  assert.ok(engineSrc.includes('"flashcard_generator"'), "Soporta Extracción de Flashcards");
});

test("Prompt Engineering Socrático con Regla de Oro Pedagógica", () => {
  assert.ok(engineSrc.includes("Tutor Socrático Universitario"), "Define rol socrático universitario");
  assert.ok(engineSrc.includes("NUNCA des la respuesta directa"), "Enforce de regla de oro pedagógica socrática");
});

test("Catálogo de Modelos Locales Recomendados (Llama 3.2, Mistral, Gemma 2, Qwen 2.5)", () => {
  assert.ok(engineSrc.includes("RECOMMENDED_LOCAL_MODELS"), "Debe exportar lista de modelos recomendados");
  assert.ok(engineSrc.includes("llama3.2"), "Recomienda Llama 3.2");
  assert.ok(engineSrc.includes("mistral"), "Recomienda Mistral");
  assert.ok(engineSrc.includes("gemma2"), "Recomienda Gemma 2");
  assert.ok(engineSrc.includes("qwen2.5"), "Recomienda Qwen 2.5");
});

test("Simulación Offline Determinista sin Bloqueos ni Caídas", () => {
  assert.ok(engineSrc.includes("Offline Academic Simulator"), "Debe identificar el simulador offline determinista");
  assert.ok(engineSrc.includes("Pregunta Socrática Guía"), "El simulador socrático formula preguntas guía");
  assert.ok(engineSrc.includes("Opción Múltiple (Active Recall Directo)"), "El simulador de parcial genera MCQs");
  assert.ok(engineSrc.includes("Evaluador de Cátedra"), "El simulador evaluador emite notas 0-10 y fortalezas");
});

// -----------------------------------------------------------------------------
// [Test 3] Componente Visual de Estudio (LocalAiMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Visual de Estudio (LocalAiMethod.tsx)");

const componentFile = path.join(rootDir, "src", "components", "study-methods", "LocalAiMethod.tsx");

test("Existe src/components/study-methods/LocalAiMethod.tsx", () => {
  assert.ok(fs.existsSync(componentFile), "El archivo LocalAiMethod.tsx debe existir");
});

const componentSrc = fs.readFileSync(componentFile, "utf-8");

test("LocalAiMethod implementa los 4 modos y visualización de streaming", () => {
  assert.ok(componentSrc.includes("activeMode"), "Gestiona modo activo");
  assert.ok(componentSrc.includes("streamedText"), "Renderiza texto en streaming continuo");
  assert.ok(componentSrc.includes("handleCopyResult"), "Permite copiar respuestas");
  assert.ok(componentSrc.includes("saveAiStudySessionRecord"), "Persiste sesiones en historial");
});

test("Panel de Configuración de Host, Modelo y Temperatura", () => {
  assert.ok(componentSrc.includes("showConfig"), "Controles de configuración de conexión");
  assert.ok(componentSrc.includes("preferredModel"), "Permite cambiar el modelo preferido");
  assert.ok(componentSrc.includes("temperature"), "Control deslizante de temperatura");
});

// -----------------------------------------------------------------------------
// [Test 4] Integración en Catálogo, Types, Command Palette y Rutas
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en Catálogo, Types, Command Palette y Rutas");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("StudyMethodId incluye 'local-ai' en src/types/index.ts", () => {
  assert.ok(typesSrc.includes('"local-ai"'), "StudyMethodId debe incluir 'local-ai'");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("Acción 'action-local-ai' registrada en Command Palette Service", () => {
  assert.ok(paletteServiceSrc.includes("action-local-ai"), "Debe existir action-local-ai");
  assert.ok(paletteServiceSrc.includes("/methods?run=local-ai"), "Debe redirigir a /methods?run=local-ai");
});

const commandPaletteFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const commandPaletteSrc = fs.readFileSync(commandPaletteFile, "utf-8");

test("CommandPalette.tsx importa y mapea el icono 'Bot'", () => {
  assert.ok(commandPaletteSrc.includes("Bot,"), "Debe importar y mapear el icono Bot");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("Runner case y Lazy Import de 'local-ai' en MethodsPage.tsx", () => {
  assert.ok(methodsPageSrc.includes("const LocalAiMethod = lazy"), "Debe importar LocalAiMethod perezosamente");
  assert.ok(methodsPageSrc.includes('case "local-ai":'), "Debe contener el switch case 'local-ai'");
  assert.ok(methodsPageSrc.includes("Tutor IA Local & Ollama"), "Debe mostrar botón de acceso directo en cabecera");
});

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADOS SUITE v5.24: ${passed} pasados, ${failed} fallidos`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}
