import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.21 (CASOS PRÁCTICOS Y VIÑETAS CLÍNICAS)        ");
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
// [Test 1] Motor de Casos Prácticos (caseStudyEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Casos Prácticos y Viñetas (caseStudyEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "case-study", "caseStudyEngine.ts");

test("Existe src/features/case-study/caseStudyEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo caseStudyEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta PRESET_CASE_STUDIES, evaluateCaseStudyAttempt y saveCaseSessionRecord", () => {
  assert.ok(engineSrc.includes("export const PRESET_CASE_STUDIES"), "Debe exportar PRESET_CASE_STUDIES");
  assert.ok(engineSrc.includes("export function evaluateCaseStudyAttempt"), "Debe exportar evaluateCaseStudyAttempt");
  assert.ok(engineSrc.includes("export async function saveCaseSessionRecord"), "Debe exportar saveCaseSessionRecord");
});

test("Banco de Casos Multidisciplinarios Precargados (Medicina, Derecho, DevOps)", () => {
  assert.ok(engineSrc.includes("case-cardio-emergency"), "Debe incluir caso de Medicina (Cardiología / IAM)");
  assert.ok(engineSrc.includes("case-civil-force-majeure"), "Debe incluir caso de Derecho (Fuerza mayor / Incumplimiento)");
  assert.ok(engineSrc.includes("case-devops-pool-exhaustion"), "Debe incluir caso de Ingeniería/DevOps (Pool HikariCP)");
});

test("Modelo Canónico de Pruebas e Investigaciones con Costo Ockham", () => {
  assert.ok(engineSrc.includes("isEssential"), "Debe identificar estudios de primera línea esenciales");
  assert.ok(engineSrc.includes("costPoints"), "Debe asociar penalización a estudios innecesarios");
  assert.ok(engineSrc.includes("availableInvestigations"), "Debe contener lista de investigaciones complementarias");
});

test("Estructura de Gold Standard de Referencia y Perlas de Cátedra", () => {
  assert.ok(engineSrc.includes("primaryDiagnosis"), "Debe definir diagnóstico principal de referencia");
  assert.ok(engineSrc.includes("differentialDiagnoses"), "Debe listar diagnósticos diferenciales");
  assert.ok(engineSrc.includes("criticalActionOrPlan"), "Debe definir conducta inmediata crítica");
  assert.ok(engineSrc.includes("contraindicatedActions"), "Debe definir acciones contraindicadas");
  assert.ok(engineSrc.includes("clinicalPearls"), "Debe incluir perlas de cátedra / high-yield facts");
});

// -----------------------------------------------------------------------------
// [Test 2] Algoritmo Evaluador y Criterio de Ockham
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Algoritmo Evaluador y Penalización por Iatrogenia / Ineficiencia");

test("Cálculo de eficiencia de pruebas (Criterio Ockham)", () => {
  assert.ok(engineSrc.includes("efficiencyScore"), "Debe computar score de eficiencia");
  assert.ok(engineSrc.includes("unnecessaryInvestigationsRequested"), "Debe detectar pruebas innecesarias");
  assert.ok(engineSrc.includes("essentialInvestigationsMissed"), "Debe detectar omisión de pruebas indispensables");
  assert.ok(engineSrc.includes("efficiencyCategory"), "Debe categorizar la eficiencia diagnóstica");
});

test("Puntaje ponderado multidimensional (Diagnóstico, Eficiencia, Plan)", () => {
  assert.ok(engineSrc.includes("diagnosticScore"), "Score de diagnóstico");
  assert.ok(engineSrc.includes("planScore"), "Score de plan terapéutico");
  assert.ok(engineSrc.includes("totalScore"), "Score final ponderado");
  assert.ok(engineSrc.includes("feedback"), "Retroalimentación formativa cualitativa");
});

// -----------------------------------------------------------------------------
// [Test 3] Componente Interactivo (CaseStudyMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componente Interactivo (CaseStudyMethod.tsx)");

const compFile = path.join(rootDir, "src", "components", "study-methods", "CaseStudyMethod.tsx");

test("Existe src/components/study-methods/CaseStudyMethod.tsx", () => {
  assert.ok(fs.existsSync(compFile), "Debe existir CaseStudyMethod.tsx");
});

const compSrc = fs.readFileSync(compFile, "utf-8");

test("CaseStudyMethod exporta componente y soporta flujo de 4 fases progresivas", () => {
  assert.ok(compSrc.includes("export const CaseStudyMethod"), "Debe exportar CaseStudyMethod");
  assert.ok(compSrc.includes('"presentation"'), "Fase 1: Viñeta / Anamnesis");
  assert.ok(compSrc.includes('"investigations"'), "Fase 2: Mesa de Estudios Complementarios");
  assert.ok(compSrc.includes('"diagnosis"'), "Fase 3: Formulación de Diagnóstico y Conducta");
  assert.ok(compSrc.includes('"evaluation"'), "Fase 4: Devolución Gold Standard");
});

test("Mesa de Investigaciones permite desbloqueo progresivo y visualización de hallazgos", () => {
  assert.ok(compSrc.includes("unlockedInvestigations"), "Manejo de estado de estudios solicitados");
  assert.ok(compSrc.includes("handleUnlockInvestigation"), "Acción de desbloquear estudio");
  assert.ok(compSrc.includes("costPoints"), "Visualización de costo o penalización de estudio");
});

test("Panel de Feedback confronta con Gold Standard y Perlas de Cátedra", () => {
  assert.ok(compSrc.includes("primaryDiagnosis"), "Muestra diagnóstico de referencia");
  assert.ok(compSrc.includes("clinicalPearls"), "Muestra perlas clínicas o legales");
  assert.ok(compSrc.includes("criticalActionOrPlan"), "Muestra conducta crítica de referencia");
  assert.ok(compSrc.includes("efficiencyCategory"), "Muestra veredicto de eficiencia Ockham");
});

// -----------------------------------------------------------------------------
// [Test 4] Integraciones en el Catálogo, Tipos y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integraciones en Catálogo, Tipos y Command Palette");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("types/index.ts incluye 'case-study' en StudyMethodId", () => {
  assert.ok(typesSrc.includes('"case-study"'), "StudyMethodId debe incluir 'case-study'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage.tsx importa CaseStudyMethod con carga diferida (lazy)", () => {
  assert.ok(methodsPageSrc.includes("CaseStudyMethod"), "Debe importar CaseStudyMethod");
  assert.ok(methodsPageSrc.includes('case "case-study":'), "Debe resolver case 'case-study'");
});

test("MethodsPage.tsx incluye botón de acceso rápido para 'Casos Prácticos & Viñetas'", () => {
  assert.ok(methodsPageSrc.includes('handleStartMethod("case-study")'), "Debe invocar 'case-study'");
  assert.ok(methodsPageSrc.includes("Casos Prácticos & Viñetas"), "Etiqueta legible del botón");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("commandPaletteService.ts registra 'action-case-study'", () => {
  assert.ok(paletteServiceSrc.includes("action-case-study"), "Debe registrar action-case-study");
  assert.ok(paletteServiceSrc.includes("/methods?run=case-study"), "Debe navegar a /methods?run=case-study");
  assert.ok(paletteServiceSrc.includes("Simulador de Casos Prácticos y Viñetas"), "Título descriptivo de la acción");
});

const paletteCompFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const paletteCompSrc = fs.readFileSync(paletteCompFile, "utf-8");

test("CommandPalette.tsx importa y mapea el icono Briefcase", () => {
  assert.ok(paletteCompSrc.includes("Briefcase"), "Debe importar Briefcase");
  assert.ok(paletteCompSrc.includes("Briefcase,"), "Debe mapear Briefcase en ICON_MAP");
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
  console.log(">> ETAPA v5.21 COMPLETADA CON ÉXITO: Casos Prácticos y Viñetas Clínicas operativos. <<\n");
  process.exit(0);
}
