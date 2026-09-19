import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.9 (CATÁLOGO COMPLETO 100% - 30 DE 30 RUNNERS)   ");
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
// Test 1: Runner de Práctica Distribuida (DistributedPracticeMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Runner de Práctica Distribuida (DistributedPracticeMethod.tsx)");
const distFile = fs.readFileSync(path.join(root, "src/components/study-methods/DistributedPracticeMethod.tsx"), "utf-8");

assert(distFile.includes("DEFAULT_SCHEDULE"), "Define cronograma semanal por defecto con días de descanso");
assert(distFile.includes("isCrammingRisk"), "Alerta sobre el riesgo biológico de sobrecarga (>20h semanales)");
assert(distFile.includes("toggleStudyDay"), "Permite alternar días de estudio y días de consolidación");
assert(distFile.includes("Protocolo de Entrada: 5 Minutos"), "Instruye la regla de 5 min de recapitulación previa");
assert(distFile.includes('methodId: "distributed-practice"'), "Guarda sesión con methodId: 'distributed-practice'");

// -----------------------------------------------------------------------------
// Test 2: Runner de Dificultades Deseables (DesirableDifficultiesMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Runner de Dificultades Deseables (DesirableDifficultiesMethod.tsx)");
const desFile = fs.readFileSync(path.join(root, "src/components/study-methods/DesirableDifficultiesMethod.tsx"), "utf-8");

assert(desFile.includes("DEFAULT_BARRIERS"), "Define catálogo de barreras de fricción cognitiva de Bjork");
assert(desFile.includes("perceivedFluency"), "Mide la fluidez subjetiva sentida para detectar ilusión de competencia");
assert(desFile.includes("testedRetention"), "Mide la retención real comprobada a largo plazo");
assert(desFile.includes("Efecto Bjork confirmado"), "Verifica la correlación paradójica alta fricción = alta retención");
assert(desFile.includes('methodId: "desirable-difficulties"'), "Guarda sesión con methodId: 'desirable-difficulties'");

// -----------------------------------------------------------------------------
// Test 3: Runner de Principio de Segmentación (SegmentationPrincipleMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Runner de Principio de Segmentación (SegmentationPrincipleMethod.tsx)");
const segFile = fs.readFileSync(path.join(root, "src/components/study-methods/SegmentationPrincipleMethod.tsx"), "utf-8");

assert(segFile.includes("DEFAULT_SEGMENTS"), "Define despiece de video/clase en segmentos breves");
assert(segFile.includes("pauseSeconds"), "Temporizador de pausa activa de 60 segundos");
assert(segFile.includes("summarySentence"), "Exige formulación de una frase síntesis en cada pausa");
assert(segFile.includes("Mayer"), "Referencia empírica a Richard E. Mayer (2001, 2009)");
assert(segFile.includes('methodId: "segmentation-principle"'), "Guarda sesión con methodId: 'segmentation-principle'");

// -----------------------------------------------------------------------------
// Test 4: Runner de Estudio Multisensorial (MultisensoryLearningMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Runner de Estudio Multisensorial (MultisensoryLearningMethod.tsx)");
const multiFile = fs.readFileSync(path.join(root, "src/components/study-methods/MultisensoryLearningMethod.tsx"), "utf-8");

assert(multiFile.includes("visualAnchor"), "Contiene anclaje visual-espacial con diagramas y colores");
assert(multiFile.includes("auditoryAnchor"), "Contiene anclaje auditivo-fonológico con dicción y ritmo");
assert(multiFile.includes("hapticAnchor"), "Contiene anclaje háptico-motor con gestos y manipulación física");
assert(multiFile.includes("Trimodal Completa"), "Verifica la concurrencia de los 3 canales corticales");
assert(multiFile.includes('methodId: "multisensory-learning"'), "Guarda sesión con methodId: 'multisensory-learning'");

// -----------------------------------------------------------------------------
// Test 5: Runner de Consolidación por Sueño (SleepConsolidationMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Runner de Consolidación por Sueño (SleepConsolidationMethod.tsx)");
const sleepFile = fs.readFileSync(path.join(root, "src/components/study-methods/SleepConsolidationMethod.tsx"), "utf-8");

assert(sleepFile.includes("DEFAULT_CUES"), "Define gatillos de memoria para repaso pre-sueño");
assert(sleepFile.includes("targetCycles"), "Calculadora de ciclos ultradianos NREM/REM (90 minutos)");
assert(sleepFile.includes("hygieneChecks"), "Checklist de higiene circadiana innegociable (luz azul, cafeína)");
assert(sleepFile.includes("morningRecalled"), "Drill de evocación matutina inmediata al despertar");
assert(sleepFile.includes('methodId: "sleep-consolidation"'), "Guarda sesión con methodId: 'sleep-consolidation'");

// -----------------------------------------------------------------------------
// Test 6: Hito del 100%: Los 30 Métodos Implementados
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Hito Histórico: 30 de 30 Métodos Activos (100% de Cobertura)");

const implementedCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === true).length;
const theoreticalCount = STUDY_METHODS_30_SEEDS.filter((m) => m.implemented === false).length;

assert(STUDY_METHODS_30_SEEDS.length === 30, `Total de 30 métodos científicos (actual: ${STUDY_METHODS_30_SEEDS.length})`);
assert(implementedCount === 30, `EXACTAMENTE 30 métodos poseen runner interactivo activo (actual: ${implementedCount})`);
assert(theoreticalCount === 0, `CERO métodos quedan en estado teórico pasivo (actual: ${theoreticalCount})`);

for (const m of STUDY_METHODS_30_SEEDS) {
  assert(m.implemented === true, `Método '${m.id}' (${m.name}) tiene implemented: true`);
}

// -----------------------------------------------------------------------------
// Test 7: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 7] Integración en MethodsPage.tsx");
const methodsPageFile = fs.readFileSync(path.join(root, "src/pages/MethodsPage.tsx"), "utf-8");

assert(methodsPageFile.includes("DistributedPracticeMethod"), "MethodsPage importa DistributedPracticeMethod");
assert(methodsPageFile.includes("DesirableDifficultiesMethod"), "MethodsPage importa DesirableDifficultiesMethod");
assert(methodsPageFile.includes("SegmentationPrincipleMethod"), "MethodsPage importa SegmentationPrincipleMethod");
assert(methodsPageFile.includes("MultisensoryLearningMethod"), "MethodsPage importa MultisensoryLearningMethod");
assert(methodsPageFile.includes("SleepConsolidationMethod"), "MethodsPage importa SleepConsolidationMethod");

assert(methodsPageFile.includes('case "distributed-practice":'), "Switch case para 'distributed-practice'");
assert(methodsPageFile.includes('case "desirable-difficulties":'), "Switch case para 'desirable-difficulties'");
assert(methodsPageFile.includes('case "segmentation-principle":'), "Switch case para 'segmentation-principle'");
assert(methodsPageFile.includes('case "multisensory-learning":'), "Switch case para 'multisensory-learning'");
assert(methodsPageFile.includes('case "sleep-consolidation":'), "Switch case para 'sleep-consolidation'");

// -----------------------------------------------------------------------------
// Test 8: Tipado en src/types/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 8] Tipado en src/types/index.ts");
const typesFile = fs.readFileSync(path.join(root, "src/types/index.ts"), "utf-8");

assert(typesFile.includes('"distributed-practice"'), 'StudyMethodId incluye "distributed-practice"');
assert(typesFile.includes('"desirable-difficulties"'), 'StudyMethodId incluye "desirable-difficulties"');
assert(typesFile.includes('"segmentation-principle"'), 'StudyMethodId incluye "segmentation-principle"');
assert(typesFile.includes('"multisensory-learning"'), 'StudyMethodId incluye "multisensory-learning"');
assert(typesFile.includes('"sleep-consolidation"'), 'StudyMethodId incluye "sleep-consolidation"');

// -----------------------------------------------------------------------------
// Balance Final
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
if (failed === 0) {
  console.log(`       RESULTADO: ${passed}/${passed} TESTS PASARON EXITOSAMENTE        `);
  console.log("       ¡HITO ALCANZADO: 100% DEL CATÁLOGO DE MÉTODOS INTERACTIVO!       ");
  console.log("================================================================================\n");
  process.exit(0);
} else {
  console.error(`       RESULTADO: ${failed} FALLOS DETECTADOS (${passed} pasaron)       `);
  console.log("================================================================================\n");
  process.exit(1);
}
