import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.7 (MAPAS CONCEPTUALES, CHUNKING Y PBL)         ");
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
// Test 1: Runner de Mapas Conceptuales Novakianos (ConceptMapsMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner de Mapas Conceptuales Novakianos (ConceptMapsMethod.tsx)");
const conceptMapsFile = fs.readFileSync(path.join(root, "src/components/study-methods/ConceptMapsMethod.tsx"), "utf-8");

assert(conceptMapsFile.includes("DEFAULT_CONCEPTS"), "Define conceptos jerárquicos por defecto");
assert(conceptMapsFile.includes("DEFAULT_PROPOSITIONS"), "Define tripletas proposicionales semánticas de inicio");
assert(conceptMapsFile.includes("cúspide"), "Incorpora niveles jerárquicos novakianos (cúspide, intermedio, específico)");
assert(conceptMapsFile.includes("handleAddProposition"), "Permite formular proposiciones lógicas dirigidas");
assert(conceptMapsFile.includes('methodId: "concept-maps"'), "Guarda sesión con methodId: 'concept-maps'");

// -----------------------------------------------------------------------------
// Test 2: Runner de Agrupación Cognitiva (ChunkingMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Runner de Agrupación Cognitiva (ChunkingMethod.tsx)");
const chunkingFile = fs.readFileSync(path.join(root, "src/components/study-methods/ChunkingMethod.tsx"), "utf-8");

assert(chunkingFile.includes("DEFAULT_CHUNKS"), "Define paquetes cognitivos de referencia");
assert(chunkingFile.includes("mnemonicTag"), "Asigna anclajes o etiquetas mnemotécnicas a cada bloque");
assert(chunkingFile.includes("Miller / Cowan"), "Referencia la capacidad de memoria de trabajo (4 ± 1)");
assert(chunkingFile.includes("toggleReveal"), "Ofrece modo drill con ocultamiento interactivo para evocación");
assert(chunkingFile.includes('methodId: "chunking"'), "Guarda sesión con methodId: 'chunking'");

// -----------------------------------------------------------------------------
// Test 3: Runner de Aprendizaje Basado en Problemas (ProblemBasedLearningMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Runner de Aprendizaje Basado en Problemas (ProblemBasedLearningMethod.tsx)");
const pblFile = fs.readFileSync(path.join(root, "src/components/study-methods/ProblemBasedLearningMethod.tsx"), "utf-8");

assert(pblFile.includes("DEFAULT_FACTS"), "Define matriz de hechos comprobados");
assert(pblFile.includes("DEFAULT_UNKNOWNS"), "Identifica incógnitas y vacíos del escenario");
assert(pblFile.includes("learningNeed"), "Formula necesidades explícitas de aprendizaje bibliográfico");
assert(pblFile.includes("metacognitiveReflection"), "Exige reflexión metacognitiva sobre principios transferibles");
assert(pblFile.includes('methodId: "problem-based-learning"'), "Guarda sesión con methodId: 'problem-based-learning'");

// -----------------------------------------------------------------------------
// Test 4: Estado del Catálogo (22 Métodos Interactivos)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Estado del Catálogo y Promoción a 22 Runners");
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
  "concept-maps",
  "chunking",
  "problem-based-learning",
];

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(STUDY_METHODS_30_SEEDS.length === 30, `Total de 30 métodos preservado (actual: ${STUDY_METHODS_30_SEEDS.length})`);
assert(implementedCount === 22, `Exactamente 22 métodos poseen runner interactivo activo (actual: ${implementedCount})`);
assert(theoreticalCount === 8, `Exactamente 8 métodos conservan ficha científica guiada (actual: ${theoreticalCount})`);

for (const id of EXPECTED_IDS) {
  const m = STUDY_METHODS_30_SEEDS.find((item) => item.id === id);
  assert(m && m.implemented === true, `Método '${id}' tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 5: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en MethodsPage.tsx");
const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");

assert(methodsPageFile.includes("ConceptMapsMethod"), "MethodsPage importa perezosamente ConceptMapsMethod");
assert(methodsPageFile.includes("ChunkingMethod"), "MethodsPage importa perezosamente ChunkingMethod");
assert(methodsPageFile.includes("ProblemBasedLearningMethod"), "MethodsPage importa perezosamente ProblemBasedLearningMethod");
assert(methodsPageFile.includes('case "concept-maps":'), "Switch case para 'concept-maps'");
assert(methodsPageFile.includes('case "chunking":'), "Switch case para 'chunking'");
assert(methodsPageFile.includes('case "problem-based-learning":'), "Switch case para 'problem-based-learning'");

// -----------------------------------------------------------------------------
// Test 6: Tipado en src/types/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Tipado en src/types/index.ts");
const typesFile = fs.readFileSync(path.join(root, "src/types/index.ts"), "utf-8");

assert(typesFile.includes('"concept-maps"'), 'StudyMethodId incluye "concept-maps"');
assert(typesFile.includes('"chunking"'), 'StudyMethodId incluye "chunking"');
assert(typesFile.includes('"problem-based-learning"'), 'StudyMethodId incluye "problem-based-learning"');

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
