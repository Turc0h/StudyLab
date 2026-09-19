import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.8 (EFECTO PROTEGIDO, RELATO Y PQ4R)           ");
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
// Test 1: Runner de Enseñar a Otros (ProtegeEffectMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner de Enseñar a Otros (ProtegeEffectMethod.tsx)");
const protegeFile = fs.readFileSync(path.join(root, "src/components/study-methods/ProtegeEffectMethod.tsx"), "utf-8");

assert(protegeFile.includes("DEFAULT_POINTS"), "Define puntos de lección y analogías por defecto");
assert(protegeFile.includes("analogy"), "Exige traducción de conceptos a analogías del mundo real");
assert(protegeFile.includes("DEFAULT_QUESTIONS"), "Simula preguntas inquisitivas del aprendiz");
assert(protegeFile.includes("needsReview"), "Permite marcar dudas para consulta de cátedra");
assert(protegeFile.includes('methodId: "protege-effect"'), "Guarda sesión con methodId: 'protege-effect'");

// -----------------------------------------------------------------------------
// Test 2: Runner del Método del Relato (StoryMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Runner del Método del Relato (StoryMethod.tsx)");
const storyFile = fs.readFileSync(path.join(root, "src/components/study-methods/StoryMethod.tsx"), "utf-8");

assert(storyFile.includes("DEFAULT_STORY_LINKS"), "Define eslabones narrativos secuenciales");
assert(storyFile.includes("narrativeScene"), "Asocia escenas visuales dramáticas a cada término");
assert(storyFile.includes("toggleRevealTerm"), "Modo drill para decodificar términos a partir de la historia");
assert(storyFile.includes("Bower & Clark"), "Referencia empírica histórica a Bower & Clark (1969)");
assert(storyFile.includes('methodId: "story-method"'), "Guarda sesión con methodId: 'story-method'");

// -----------------------------------------------------------------------------
// Test 3: Runner del Método PQ4R (Pq4rMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Runner del Método PQ4R (Pq4rMethod.tsx)");
const pq4rFile = fs.readFileSync(path.join(root, "src/components/study-methods/Pq4rMethod.tsx"), "utf-8");

assert(pq4rFile.includes("preview"), "Contiene fase de inspección estructural Preview");
assert(pq4rFile.includes("question"), "Contiene fase de formulación de preguntas Question");
assert(pq4rFile.includes("reflectConnections"), "Contiene la fase nuclear reflexiva REFLECT con contraejemplos");
assert(pq4rFile.includes("reciteSynthesis"), "Contiene fase de recitado activo sin apuntes");
assert(pq4rFile.includes('methodId: "pq4r"'), "Guarda sesión con methodId: 'pq4r'");

// -----------------------------------------------------------------------------
// Test 4: Estado del Catálogo (25 Métodos Interactivos)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Estado del Catálogo y Promoción a 25 Runners");
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
  "protege-effect",
  "story-method",
  "pq4r",
];

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(STUDY_METHODS_30_SEEDS.length === 30, `Total de 30 métodos preservado (actual: ${STUDY_METHODS_30_SEEDS.length})`);
assert(implementedCount >= 25, `Al menos 25 métodos poseen runner interactivo activo (actual: ${implementedCount})`);

for (const id of EXPECTED_IDS) {
  const m = STUDY_METHODS_30_SEEDS.find((item) => item.id === id);
  assert(m && m.implemented === true, `Método '${id}' tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 5: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en MethodsPage.tsx");
const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");

assert(methodsPageFile.includes("ProtegeEffectMethod"), "MethodsPage importa perezosamente ProtegeEffectMethod");
assert(methodsPageFile.includes("StoryMethod"), "MethodsPage importa perezosamente StoryMethod");
assert(methodsPageFile.includes("Pq4rMethod"), "MethodsPage importa perezosamente Pq4rMethod");
assert(methodsPageFile.includes('case "protege-effect":'), "Switch case para 'protege-effect'");
assert(methodsPageFile.includes('case "story-method":'), "Switch case para 'story-method'");
assert(methodsPageFile.includes('case "pq4r":'), "Switch case para 'pq4r'");

// -----------------------------------------------------------------------------
// Test 6: Tipado en src/types/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Tipado en src/types/index.ts");
const typesFile = fs.readFileSync(path.join(root, "src/types/index.ts"), "utf-8");

assert(typesFile.includes('"protege-effect"'), 'StudyMethodId incluye "protege-effect"');
assert(typesFile.includes('"story-method"'), 'StudyMethodId incluye "story-method"');
assert(typesFile.includes('"pq4r"'), 'StudyMethodId incluye "pq4r"');

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
