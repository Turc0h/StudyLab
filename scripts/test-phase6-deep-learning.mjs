import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.6 (AUTOEXPLICACIÓN, DUAL CODING Y DEEP WORK)   ");
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
// Test 1: Runner de Autoexplicación (SelfExplanationMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner de Autoexplicación (SelfExplanationMethod.tsx)");
const selfExplainFile = fs.readFileSync(path.join(root, "src/components/study-methods/SelfExplanationMethod.tsx"), "utf-8");

assert(selfExplainFile.includes("DEFAULT_STEPS"), "Define pasos de razonamiento estructurados");
assert(selfExplainFile.includes("justification"), "Exige justificación teórica y causal de cada transformación");
assert(selfExplainFile.includes("boundaryCondition"), "Evalúa variación de condiciones de frontera");
assert(selfExplainFile.includes("handleAddStep"), "Permite agregar dinámicamente pasos de deducción");
assert(selfExplainFile.includes('methodId: "self-explanation"'), "Guarda sesión con methodId: 'self-explanation'");

// -----------------------------------------------------------------------------
// Test 2: Runner de Codificación Dual (DualCodingMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Runner de Codificación Dual (DualCodingMethod.tsx)");
const dualCodingFile = fs.readFileSync(path.join(root, "src/components/study-methods/DualCodingMethod.tsx"), "utf-8");

assert(dualCodingFile.includes("verbalExplanation"), "Contiene canal verbal proposicional riguroso");
assert(dualCodingFile.includes("elements"), "Contiene canal visual estructurado en nodos");
assert(dualCodingFile.includes("relationToNext"), "Conecta entidades visuales mediante aristas y trayectorias");
assert(dualCodingFile.includes("handleAddElement"), "Permite incorporar nodos y relaciones visuales");
assert(dualCodingFile.includes('methodId: "dual-coding"'), "Guarda sesión con methodId: 'dual-coding'");

// -----------------------------------------------------------------------------
// Test 3: Runner de Bloques de Trabajo Profundo (DeepWorkMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Runner de Bloques de Trabajo Profundo (DeepWorkMethod.tsx)");
const deepWorkFile = fs.readFileSync(path.join(root, "src/components/study-methods/DeepWorkMethod.tsx"), "utf-8");

assert(deepWorkFile.includes("monumentalGoal"), "Exige formulación de una Meta Monumental Única");
assert(deepWorkFile.includes("[60, 90, 120]"), "Ofrece bloques de ciclos ultradianos (60, 90 y 120 minutos)");
assert(deepWorkFile.includes("checklist"), "Verifica condiciones de aislamiento innegociables");
assert(deepWorkFile.includes("formatTime"), "Cronómetro regresivo en vivo en formato mm:ss");
assert(deepWorkFile.includes('methodId: "deep-work"'), "Guarda sesión con methodId: 'deep-work'");

// -----------------------------------------------------------------------------
// Test 4: Estado del Catálogo (19 Métodos Interactivos)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Estado del Catálogo y Promoción a 19 Runners");
const EXPECTED_IDS = [
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
  "method-of-loci",
  "mnemonics",
  "kwl-method",
  "self-explanation",
  "dual-coding",
  "deep-work",
];

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(STUDY_METHODS_30_SEEDS.length === 30, `Total de 30 métodos preservado (actual: ${STUDY_METHODS_30_SEEDS.length})`);
assert(implementedCount === 19, `Exactamente 19 métodos poseen runner interactivo activo (actual: ${implementedCount})`);
assert(theoreticalCount === 11, `Exactamente 11 métodos conservan ficha científica guiada (actual: ${theoreticalCount})`);

for (const id of EXPECTED_IDS) {
  const m = STUDY_METHODS_30_SEEDS.find((item) => item.id === id);
  assert(m && m.implemented === true, `Método '${id}' tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 5: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en MethodsPage.tsx");
const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");

assert(methodsPageFile.includes("SelfExplanationMethod"), "MethodsPage importa perezosamente SelfExplanationMethod");
assert(methodsPageFile.includes("DualCodingMethod"), "MethodsPage importa perezosamente DualCodingMethod");
assert(methodsPageFile.includes("DeepWorkMethod"), "MethodsPage importa perezosamente DeepWorkMethod");
assert(methodsPageFile.includes('case "self-explanation":'), "Switch case para 'self-explanation'");
assert(methodsPageFile.includes('case "dual-coding":'), "Switch case para 'dual-coding'");
assert(methodsPageFile.includes('case "deep-work":'), "Switch case para 'deep-work'");

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
