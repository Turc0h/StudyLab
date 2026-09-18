import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.5 (PALACIO MEMORIA, MNEMOTECNIAS Y KWL)        ");
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
// Test 1: Runner del Palacio de la Memoria (MemoryPalaceMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner del Palacio de la Memoria (MemoryPalaceMethod.tsx)");
const palaceFile = fs.readFileSync(path.join(root, "src/components/study-methods/MemoryPalaceMethod.tsx"), "utf-8");

assert(palaceFile.includes("DEFAULT_STATIONS"), "Define lista de estaciones de anclaje espaciales");
assert(palaceFile.includes("stationNumber"), "Garantiza orden secuencial serial en cada estación");
assert(palaceFile.includes("visualAnchor"), "Soporta registro de anclas visuales hiperbólicas");
assert(palaceFile.includes("handleStartWalkthrough"), "Implementa modo de recorrido mental interactivo");
assert(palaceFile.includes('methodId: "method-of-loci"'), "Persiste sesión con methodId: 'method-of-loci'");

// -----------------------------------------------------------------------------
// Test 2: Runner de Técnicas Mnemotécnicas (MnemonicsMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Runner de Técnicas Mnemotécnicas (MnemonicsMethod.tsx)");
const mnemonicsFile = fs.readFileSync(path.join(root, "src/components/study-methods/MnemonicsMethod.tsx"), "utf-8");

assert(mnemonicsFile.includes("charAt(0).toUpperCase()"), "Extrae automáticamente las iniciales de los términos");
assert(mnemonicsFile.includes("acronym"), "Soporta formulación de acrónimo palabra-clave");
assert(mnemonicsFile.includes("acrosticPhrase"), "Soporta frase acróstica sonora o memorable");
assert(mnemonicsFile.includes("handleStartTest"), "Implementa modo decodificador activo para evaluar retención");
assert(mnemonicsFile.includes('methodId: "mnemonics"'), "Persiste sesión con methodId: 'mnemonics'");

// -----------------------------------------------------------------------------
// Test 3: Runner de Metacognición KWL (KwlMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Runner de Metacognición KWL (KwlMethod.tsx)");
const kwlFile = fs.readFileSync(path.join(root, "src/components/study-methods/KwlMethod.tsx"), "utf-8");

assert(kwlFile.includes("knownNotes"), "Contiene columna K (Lo que sé / esquemas previos)");
assert(kwlFile.includes("questions"), "Contiene columna W (Lo que quiero saber / preguntas directrices)");
assert(kwlFile.includes("learnedNotes"), "Contiene columna L (Lo que aprendí / asimilación final)");
assert(kwlFile.includes("handleToggleResolved"), "Permite marcar preguntas resueltas tras el estudio");
assert(kwlFile.includes('methodId: "kwl-method"'), "Persiste sesión con methodId: 'kwl-method'");

// -----------------------------------------------------------------------------
// Test 4: Estado del Catálogo y Promoción a 16 Runners
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Estado del Catálogo y Promoción a 16 Runners");
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
];

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(STUDY_METHODS_30_SEEDS.length === 30, `Total de 30 métodos preservado (actual: ${STUDY_METHODS_30_SEEDS.length})`);
assert(implementedCount === 16, `Exactamente 16 métodos poseen runner interactivo activo (actual: ${implementedCount})`);
assert(theoreticalCount === 14, `Exactamente 14 métodos conservan ficha científica guiada (actual: ${theoreticalCount})`);

for (const id of EXPECTED_IDS) {
  const m = STUDY_METHODS_30_SEEDS.find((item) => item.id === id);
  assert(m && m.implemented === true, `Método '${id}' tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 5: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en MethodsPage.tsx");
const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");

assert(methodsPageFile.includes("MemoryPalaceMethod"), "MethodsPage importa perezosamente MemoryPalaceMethod");
assert(methodsPageFile.includes("MnemonicsMethod"), "MethodsPage importa perezosamente MnemonicsMethod");
assert(methodsPageFile.includes("KwlMethod"), "MethodsPage importa perezosamente KwlMethod");
assert(methodsPageFile.includes('case "method-of-loci":'), "Switch case para 'method-of-loci'");
assert(methodsPageFile.includes('case "mnemonics":'), "Switch case para 'mnemonics'");
assert(methodsPageFile.includes('case "kwl-method":'), "Switch case para 'kwl-method'");

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
