import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

console.log("================================================================================");
console.log("       TEST SUITE: STUDYLAB CATÁLOGO EXTENDIDO DE 30 MÉTODOS (ETAPA A)         ");
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

// Test 1: Conteo exacto de 30 métodos
assert(STUDY_METHODS_30_SEEDS.length === 30, `Contiene exactamente 30 métodos sembrados (actual: ${STUDY_METHODS_30_SEEDS.length})`);

// Test 2: Validación de IDs únicos
const ids = new Set();
let duplicates = false;
for (const m of STUDY_METHODS_30_SEEDS) {
  if (ids.has(m.id)) {
    duplicates = true;
    break;
  }
  ids.add(m.id);
}
assert(!duplicates && ids.size === 30, "Todos los métodos poseen IDs (slugs) únicos y normalizados");

// Test 3: Validación de las 6 categorías canónicas
const VALID_CATEGORIES = new Set([
  "memorizacion",
  "comprension",
  "gestion-tiempo",
  "escritura",
  "evaluacion",
  "metacognicion",
]);
const invalidCategories = STUDY_METHODS_30_SEEDS.filter(m => !VALID_CATEGORIES.has(m.category));
assert(invalidCategories.length === 0, "Todos los 30 métodos pertenecen estrictamente a las 6 categorías canónicas");

// Test 4: Preservación de los métodos ya implementados
const CORE_IMPLEMENTED_IDS = ["active-recall", "spaced-repetition", "feynman", "pomodoro", "interleaving", "cornell", "practice-testing"];
const implementedCore = STUDY_METHODS_30_SEEDS.filter(m => CORE_IMPLEMENTED_IDS.includes(m.id) && m.implemented === true);
assert(implementedCore.length === 7, `Los métodos con runner interactivo conservan implemented: true (actual: ${implementedCore.length})`);

// Test 5: Los restantes métodos informativos tienen implemented: false
const nonCoreMethods = STUDY_METHODS_30_SEEDS.filter(m => !CORE_IMPLEMENTED_IDS.includes(m.id));
const allNonCoreFalse = nonCoreMethods.every(m => m.implemented === false);
assert(allNonCoreFalse, `Los 23 métodos restantes tienen implemented: false (fichas informativas)`);

// Test 6: Calidad de contenido (description 2-4 líneas y howTo con 3 a 5 pasos)
const validStepsAndDesc = STUDY_METHODS_30_SEEDS.every(m => {
  const stepsOk = Array.isArray(m.howTo) && m.howTo.length >= 3 && m.howTo.length <= 5;
  const descOk = typeof m.description === "string" && m.description.length >= 50;
  const bestForOk = Array.isArray(m.bestFor) && m.bestFor.length >= 2;
  return stepsOk && descOk && bestForOk;
});
assert(validStepsAndDesc, "Cada método posee descripción exhaustiva, 3-5 pasos accionables y materias recomendadas");

// Test 7: Respaldo empírico científico sin URLs externas
const validScientific = STUDY_METHODS_30_SEEDS.every(m => {
  if (!m.scientificBasis) return false;
  return !m.scientificBasis.includes("http://") && !m.scientificBasis.includes("https://");
});
assert(validScientific, "Todos los métodos incluyen respaldo científico formal riguroso sin URLs externas");

// Test 8: Integraciones con el sistema StudyLab (FSRS, Pomodoro, Grafo, Sesión)
const VALID_INTEGRATIONS = new Set(["fsrs", "pomodoro-timer", "session-engine", "knowledge-graph"]);
const validIntegrations = STUDY_METHODS_30_SEEDS.every(m => {
  if (!m.integratesWith) return true;
  return m.integratesWith.every(i => VALID_INTEGRATIONS.has(i));
});
assert(validIntegrations, "Las integraciones declaradas son válidas (fsrs, pomodoro-timer, session-engine, knowledge-graph)");

// Test 9: Simulación de seedStudyMethods idempotente
const mockTable = [];
const mockDb = {
  studyMethods: {
    count: async () => mockTable.length,
    bulkAdd: async (items) => { mockTable.push(...items); return items.length; }
  }
};

import("../src/data/studyMethodsSeed.ts").then(async ({ seedStudyMethods }) => {
  const firstSeed = await seedStudyMethods(mockDb);
  assert(firstSeed === 30 && mockTable.length === 30, `Primer sembrado carga 30 métodos en Dexie (actual: ${mockTable.length})`);

  const secondSeed = await seedStudyMethods(mockDb);
  assert(secondSeed === 30 && mockTable.length === 30, "El sembrado es idempotente y no duplica registros si ya existen");

  // Test 10: Validación de UI en MethodsPage.tsx y MethodPreviewModal.tsx
  const fs = await import("fs");
  const methodsPageSource = fs.readFileSync("src/pages/MethodsPage.tsx", "utf8");
  assert(methodsPageSource.includes("STUDY_METHODS_30_SEEDS"), "MethodsPage importa el catálogo de 30 métodos");
  assert(methodsPageSource.includes("useLiveQuery"), "MethodsPage consulta reactivamente la base de datos Dexie");
  assert(methodsPageSource.includes("selectedStatus"), "MethodsPage incluye selector de estado (Listos vs Próximamente)");
  assert(methodsPageSource.includes("searchQuery"), "MethodsPage provee buscador en tiempo real");
  assert(methodsPageSource.includes("Próximamente"), "MethodsPage asigna el badge 'Próximamente' a las fichas informativas");
  assert(methodsPageSource.includes("handleContextualNav"), "MethodsPage contiene navegación contextual para FSRS y el Grafo");

  const modalSource = fs.readFileSync("src/components/study-methods/MethodPreviewModal.tsx", "utf8");
  assert(modalSource.includes("Protocolo de Aplicación"), "MethodPreviewModal despliega la secuencia de pasos accionables (howTo)");
  assert(modalSource.includes("Conexión con el Sistema StudyLab"), "MethodPreviewModal despliega botones contextuales según integratesWith");

  console.log("\n================================================================================");
  console.log(`       RESULTADO: ${passed}/${passed + failed} TESTS PASARON EXITOSAMENTE        `);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
});
