import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.4 (MÉTODO LEITNER Y PERFILES COGNITIVOS)     ");
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
// Test 1: Runner del Método Leitner (LeitnerMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner Interactivo del Método Leitner (LeitnerMethod.tsx)");
const leitnerFile = fs.readFileSync(path.join(root, "src/components/study-methods/LeitnerMethod.tsx"), "utf-8");

assert(leitnerFile.includes("BOX_SCHEDULES = ["), "Define los 5 compartimentos canónicos de Leitner");
assert(leitnerFile.includes("Caja 1") && leitnerFile.includes("Caja 5"), "Abarca desde Caja 1 hasta Caja 5 (Graduadas)");
assert(leitnerFile.includes("Math.min(5, c.box + 1)"), "Acierto asciende la tarjeta al compartimento superior");
assert(leitnerFile.includes("box: 1"), "Fallo devuelve inmediatamente la tarjeta a la Caja 1");
assert(leitnerFile.includes('methodId: "leitner"'), "Guarda la sesión con identificador methodId: 'leitner'");
assert(leitnerFile.includes("db.flashcards.toArray()"), "Soporta importación de tarjetas reales desde la base de datos");

// -----------------------------------------------------------------------------
// Test 2: Catálogo de Métodos y Promoción a 13 Runners
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Catálogo de Métodos y Promoción a 13 Runners");
const EXPECTED_IMPLEMENTED_IDS = [
  "active-recall",
  "spaced-repetition",
  "feynman",
  "pomodoro",
  "interleaving",
  "cornell",
  "practice-testing",
  "zettelkasten",
  "blurting",
  "mind-maps",
  "leitner",
  "sq3r",
  "elaborative-interrogation",
];

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(implementedCount >= 13, `Al menos 13 métodos poseen runner interactivo activo (actual: ${implementedCount})`);
assert(STUDY_METHODS_30_SEEDS.length === 30, `Conserva el total de 30 métodos científicos (actual: ${STUDY_METHODS_30_SEEDS.length})`);

for (const id of EXPECTED_IMPLEMENTED_IDS) {
  const method = STUDY_METHODS_30_SEEDS.find((m) => m.id === id);
  assert(method && method.implemented === true, `Método '${id}' tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 3: Selector de Perfiles Cognitivos (CognitiveProfileSelector.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Selector de Perfiles Cognitivos (CognitiveProfileSelector.tsx)");
const profileFile = fs.readFileSync(path.join(root, "src/features/context-engine/CognitiveProfileSelector.tsx"), "utf-8");

assert(profileFile.includes("COGNITIVE_PROFILES: CognitiveProfile[]"), "Exporta constante COGNITIVE_PROFILES tipada");
assert(profileFile.includes('id: "logical-depth"'), "Perfil 'logical-depth' (Inmersión Lógica) registrado");
assert(profileFile.includes('id: "mnemonic-fortress"'), "Perfil 'mnemonic-fortress' (Fortaleza Mnemónica) registrado");
assert(profileFile.includes('id: "synthesis-writing"'), "Perfil 'synthesis-writing' (Síntesis & Tesis) registrado");
assert(profileFile.includes('id: "exam-crucible"'), "Perfil 'exam-crucible' (Presión de Examen) registrado");
assert(profileFile.includes("handleLaunchMethod"), "Provee manejador de lanzamiento directo hacia /methods?run=...");
assert(profileFile.includes("recommendedMethods:"), "Estructura métodos científicos sugeridos por postura mental");

// -----------------------------------------------------------------------------
// Test 4: Integración en ContextEngineDashboard.tsx y MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en ContextEngineDashboard.tsx y MethodsPage.tsx");
const dashboardFile = fs.readFileSync(path.join(root, "src/features/context-engine/ContextEngineDashboard.tsx"), "utf-8");
assert(dashboardFile.includes("CognitiveProfileSelector"), "ContextEngineDashboard importa CognitiveProfileSelector");
assert(dashboardFile.includes('id: "profiles"'), "ContextEngineDashboard expone pestaña 'profiles' para perfiles cognitivos");

const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");
assert(methodsPageFile.includes("LeitnerMethod"), "MethodsPage importa perezosamente LeitnerMethod");
assert(methodsPageFile.includes('case "leitner":'), "MethodsPage posee case 'leitner' en el despachador de runners");

// -----------------------------------------------------------------------------
// Balance Final
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
if (failed === 0) {
  console.log(`       RESULTADO: ${passed}/${passed} TESTS PASARON EXITOSAMENTE        `);
  console.log("================================================================================\n");
  process.exit(0);
} else {
  console.error(`       RESULTADO: ${failed} FALLOS DETECTADOS (${passed} pasaron)       `);
  console.log("================================================================================\n");
  process.exit(1);
}
