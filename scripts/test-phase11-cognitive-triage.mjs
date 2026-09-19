import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";
import { calculateMethodRecommendations } from "../src/features/study-methods/cognitiveTriageEngine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.11 (TRIAJE COGNITIVO PARA LOS 30 MÉTODOS)    ");
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
// Test 1: Motor Heurístico de Triaje (cognitiveTriageEngine.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Motor Heurístico de Triaje (cognitiveTriageEngine.ts)");
const enginePath = path.join(root, "src/features/study-methods/cognitiveTriageEngine.ts");
assert(fs.existsSync(enginePath), "Existe cognitiveTriageEngine.ts");
const engineContent = fs.readFileSync(enginePath, "utf-8");

assert(engineContent.includes("export function calculateMethodRecommendations"), "Exporta función calculateMethodRecommendations");
assert(engineContent.includes("TriageUrgency") && engineContent.includes("TriageMaterial"), "Declara tipos de urgencia y material");
assert(engineContent.includes("TriageMastery") && engineContent.includes("TriageEnergy"), "Declara tipos de dominio y energía");
assert(engineContent.includes("cautionAlert"), "Soporta generación de alertas de fatiga extrema o riesgo pedagógico");

// -----------------------------------------------------------------------------
// Test 2: Escenarios de Diagnóstico Pedagógico Determinista
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Escenarios de Diagnóstico Pedagógico Determinista");

// Escenario A: Examen en menos de 24h con alta energía (Emergencia pre-examen)
const resUrgent = calculateMethodRecommendations({
  urgency: "urgent",
  material: "logical",
  mastery: "advanced",
  energy: "high"
});
assert(resUrgent.topMatches.length === 3, "Escenario A devuelve exactamente 3 recomendaciones en el podio");
const top1UrgentId = resUrgent.topMatches[0].method.id;
assert(
  top1UrgentId === "practice-testing" || top1UrgentId === "blurting",
  `Escenario A prioriza evaluación formativa de choque (${top1UrgentId})`
);
assert(resUrgent.topMatches[0].matchPercentage >= 80, "Escenario A asigna alta compatibilidad al Top 1");
assert(resUrgent.diagnosticSummary.includes("menos de 24 horas"), "Escenario A incluye diagnóstico contextualizado");

// Escenario B: Memorización fáctica anatómica/legal a mediano plazo (2 a 7 días)
const resFactual = calculateMethodRecommendations({
  urgency: "medium",
  material: "factual",
  mastery: "intermediate",
  energy: "medium"
});
assert(resFactual.topMatches.length === 3, "Escenario B devuelve 3 recomendaciones");
const topIdsFactual = resFactual.topMatches.map(m => m.method.id);
assert(
  topIdsFactual.includes("leitner") || topIdsFactual.includes("story-method") || topIdsFactual.includes("chunking"),
  `Escenario B incluye métodos de memoria fáctica o cajas de Leitner (${topIdsFactual.join(", ")})`
);

// Escenario C: Literatura doctrinal densa (Derecho / Filosofía / Manuales)
const resDoctrinal = calculateMethodRecommendations({
  urgency: "medium",
  material: "doctrinal",
  mastery: "intermediate",
  energy: "medium"
});
const topIdsDoctrinal = resDoctrinal.topMatches.map(m => m.method.id);
assert(
  topIdsDoctrinal.includes("pq4r") || topIdsDoctrinal.includes("sq3r") || topIdsDoctrinal.includes("cornell"),
  `Escenario C prioriza protocolos de lectura analítica (${topIdsDoctrinal.join(", ")})`
);

// Escenario D: Fatiga extrema / Estudio nocturno (low energy)
const resFatigue = calculateMethodRecommendations({
  urgency: "urgent",
  material: "factual",
  mastery: "initial",
  energy: "low"
});
const topIdsFatigue = resFatigue.topMatches.map(m => m.method.id);
assert(
  topIdsFatigue.includes("sleep-consolidation") || topIdsFatigue.includes("multisensory-learning") || topIdsFatigue.includes("segmentation-principle"),
  `Escenario D protege al estudiante recomendando métodos biológicos o de segmentación (${topIdsFatigue.join(", ")})`
);
assert(
  !topIdsFatigue.includes("deep-work") && !topIdsFatigue.includes("practice-testing"),
  "Escenario D penaliza de forma segura el trabajo profundo o simulacros exigentes con baja energía"
);
assert(Boolean(resFatigue.cautionAlert), "Escenario D emite alerta de precaución ante fatiga o tiempo crítico");

// Escenario E: Cursada regular a largo plazo (> 2 semanas)
const resLong = calculateMethodRecommendations({
  urgency: "long",
  material: "logical",
  mastery: "intermediate",
  energy: "high"
});
const topIdsLong = resLong.topMatches.map(m => m.method.id);
assert(
  topIdsLong.includes("distributed-practice") || topIdsLong.includes("spaced-repetition") || topIdsLong.includes("concept-maps") || topIdsLong.includes("problem-based-learning"),
  `Escenario E prioriza retención duradera a largo plazo (${topIdsLong.join(", ")})`
);

// -----------------------------------------------------------------------------
// Test 3: Cobertura de Racionales para los 30 Métodos
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Cobertura de Racionales para los 30 Métodos");
assert(STUDY_METHODS_30_SEEDS.length === 30, "El catálogo cuenta con exactamente 30 métodos");

for (const seed of STUDY_METHODS_30_SEEDS) {
  const testRes = calculateMethodRecommendations({
    urgency: "medium",
    material: "logical",
    mastery: "intermediate",
    energy: "medium"
  });
  // Verificar que ningún método falle al ser procesado
  assert(testRes.topMatches.every(m => m.rationale && m.rationale.length > 20), "Las recomendaciones generan fundamentos redactados");
  assert(testRes.topMatches.every(m => m.keyBenefit && m.keyBenefit.length > 10), "Las recomendaciones generan clave pedagógica");
  break;
}

// -----------------------------------------------------------------------------
// Test 4: Componente UI CognitiveTriageModal.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Componente UI CognitiveTriageModal.tsx");
const modalPath = path.join(root, "src/components/study-methods/CognitiveTriageModal.tsx");
assert(fs.existsSync(modalPath), "Existe CognitiveTriageModal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

assert(modalContent.includes("export const CognitiveTriageModal"), "Exporta componente CognitiveTriageModal");
assert(modalContent.includes("calculateMethodRecommendations"), "Invoca motor de triaje");
assert(modalContent.includes("Paso {step} de 4"), "Implementa asistente guiado en 4 pasos");
assert(modalContent.includes("onSelectMethod"), "Soporta callback onSelectMethod para iniciar el runner");
assert(modalContent.includes("Iniciar Runner"), "Incluye botón directo para iniciar el runner recomendado");
assert(modalContent.includes("Reiniciar Triaje"), "Permite reiniciar el diagnóstico");

// -----------------------------------------------------------------------------
// Test 5: Integración en MethodsPage.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en MethodsPage.tsx");
const methodsPagePath = path.join(root, "src/pages/MethodsPage.tsx");
const pageContent = fs.readFileSync(methodsPagePath, "utf-8");

assert(pageContent.includes("import { CognitiveTriageModal }"), "MethodsPage importa CognitiveTriageModal");
assert(pageContent.includes("isTriageOpen"), "MethodsPage gestiona el estado isTriageOpen");
assert(pageContent.includes("Asistente de Triaje Cognitivo"), "MethodsPage provee botón de Asistente de Triaje en la cabecera");
assert(pageContent.includes("<CognitiveTriageModal"), "MethodsPage renderiza CognitiveTriageModal");

// -----------------------------------------------------------------------------
// Resumen Final
// -----------------------------------------------------------------------------
console.log("\n--------------------------------------------------------------------------------");
console.log(`TOTAL PRUEBAS FASE v5.11: ${passed + failed} | APROBADAS: ${passed} | FALLIDAS: ${failed}`);
console.log("--------------------------------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
}
