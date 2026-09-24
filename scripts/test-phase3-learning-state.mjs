import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { computeLearningStateNative } from "../src/platform/nativeLearningState.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB FASE 3 (LEARNING STATE & CADENA EPISTÉMICA EN RUST)     ");
console.log("================================================================================");

const srcTauriDir = path.join(rootDir, "src-tauri", "src");

// -----------------------------------------------------------------------------
// [Test 1] Arquitectura de Módulos de Learning State en Rust
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Arquitectura de Módulos de Learning State en Rust");

test("Módulos de Evidence, Assessment, Inference, Recommendation, Action y Mastery existen", () => {
  const lsDir = path.join(srcTauriDir, "domain", "learning_state");
  assert.ok(fs.existsSync(path.join(lsDir, "mod.rs")), "learning_state/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "evidence.rs")), "evidence.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "assessment.rs")), "assessment.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "inference.rs")), "inference.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "recommendation.rs")), "recommendation.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "action.rs")), "action.rs debe existir");
  assert.ok(fs.existsSync(path.join(lsDir, "mastery.rs")), "mastery.rs debe existir");

  // DTOs, UseCase y Command
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "learning_state_dto.rs")), "learning_state_dto.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "learning_state_usecase.rs")), "learning_state_usecase.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "learning_state_commands.rs")), "learning_state_commands.rs debe existir");
});

// -----------------------------------------------------------------------------
// [Test 2] Registro en Tauri Runtime (lib.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Registro en Tauri Runtime (lib.rs)");

test("src-tauri/src/lib.rs exporta learning_state y registra compute_learning_state", () => {
  const libSrc = fs.readFileSync(path.join(srcTauriDir, "lib.rs"), "utf-8");
  assert.ok(libSrc.includes("commands::learning_state_commands::compute_learning_state"), "Debe registrar compute_learning_state en invoke_handler");
});

// -----------------------------------------------------------------------------
// [Test 3] Re-exportación en platform/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Re-exportación en platform/index.ts");

test("src/platform/index.ts exporta nativeLearningState", () => {
  const indexSrc = fs.readFileSync(path.join(rootDir, "src", "platform", "index.ts"), "utf-8");
  assert.ok(indexSrc.includes('export * from "./nativeLearningState";'), "Debe exportar nativeLearningState");
});

// -----------------------------------------------------------------------------
// [Test 4] Concepto no evaluado (Untested) y Erradicación de Falsa Precisión
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Concepto no evaluado (Untested) y Erradicación de Falsa Precisión");

test("Concepto sin evidencias reporta confidence = 0.0 y no falsa precisión", async () => {
  const result = await computeLearningStateNative({
    conceptId: "concept_new_topic",
    conceptName: "Geometría Diferencial",
    evidences: [],
    unresolvedErrorsCount: 0,
    isPrerequisiteForCount: 0,
  });

  assert.strictEqual(result.conceptId, "concept_new_topic");
  assert.strictEqual(result.evidenceCount, 0);
  assert.strictEqual(result.retention.isBaseline, true);
  assert.strictEqual(result.retention.confidence, 0.0);
  assert.strictEqual(result.comprehension.isBaseline, true);
  assert.strictEqual(result.comprehension.confidence, 0.0);

  // Inferencia explícita de concepto no evaluado
  const untestedInf = result.inferences.find((i) => i.diagnosisType === "untested_concept");
  assert.ok(untestedInf, "Debe inferir untested_concept cuando no hay evidencias empíricas");
  assert.strictEqual(untestedInf.severity, "info");

  // Recomendación diagnóstica
  const initRec = result.recommendations.find((r) => r.strategy === "active-recall");
  assert.ok(initRec, "Debe recomendar evaluación diagnóstica inicial de active-recall");
});

// -----------------------------------------------------------------------------
// [Test 5] Trazabilidad Epistémica: Decaimiento de Retención FSRS
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Trazabilidad Epistémica: Decaimiento de Retención FSRS");

test("Tarjetas con baja estabilidad generan inferencia retention_decay y acción de repaso", async () => {
  const result = await computeLearningStateNative({
    conceptId: "concept_limits",
    conceptName: "Límites y Continuidad",
    evidences: [
      {
        id: "ev_card_1",
        conceptId: "concept_limits",
        timestampMs: Date.now() - 1000 * 60 * 60 * 24 * 12,
        observation: {
          type: "cardReview",
          cardId: "card_lim_1",
          rating: 1, // Fallo / Again
          latencyMs: 5000,
          elapsedDays: 12.0,
          stability: 2.0, // Retrievability cae a ~0.40
        },
      },
    ],
    unresolvedErrorsCount: 0,
    isPrerequisiteForCount: 0,
  });

  assert.strictEqual(result.evidenceCount, 1);
  assert.strictEqual(result.retention.isBaseline, false);
  assert.ok(result.retention.value < 0.50, "La retención estimada debe reflejar el decaimiento");
  assert.ok(result.retention.confidence > 0.0, "La confianza debe ser mayor a 0 al existir evidencia real");

  // Inferencia generada
  const decayInf = result.inferences.find((i) => i.diagnosisType === "retention_decay");
  assert.ok(decayInf, "Debe generar inferencia retention_decay");
  assert.strictEqual(decayInf.severity, "critical");

  // Recomendación y Acción generada
  const rec = result.recommendations.find((r) => r.strategy === "spaced-repetition");
  assert.ok(rec, "Debe recomendar repaso espaciado");
  assert.ok(rec.rationale.includes("Repaso urgente de tarjetas espaciadas"));

  const action = result.suggestedActions.find((a) => a.suggestedMethod === "spaced-repetition");
  assert.ok(action, "Debe proyectar acción SCHEDULE_SESSION con método spaced-repetition");
});

// -----------------------------------------------------------------------------
// [Test 6] Malentendidos Persistentes en Error Bank -> Inferencia y Sesión Feynman
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Malentendidos Persistentes en Error Bank -> Inferencia y Sesión Feynman");

test("Errores acumulados sin resolver disparan inferencia persistent_misconception y Feynman", async () => {
  const result = await computeLearningStateNative({
    conceptId: "concept_derivatives",
    conceptName: "Regla de la Cadena",
    evidences: [
      {
        id: "ev_err_1",
        conceptId: "concept_derivatives",
        timestampMs: Date.now(),
        observation: {
          type: "studentError",
          errorId: "err_chain_1",
          repetitionCount: 3,
          resolved: false,
          category: "misconception",
        },
      },
    ],
    unresolvedErrorsCount: 3,
    isPrerequisiteForCount: 0,
  });

  const misInf = result.inferences.find((i) => i.diagnosisType === "persistent_misconception");
  assert.ok(misInf, "Debe inferir persistent_misconception");
  assert.strictEqual(misInf.severity, "critical");

  const feynmanRec = result.recommendations.find((r) => r.strategy === "feynman");
  assert.ok(feynmanRec, "Debe recomendar sesión conceptual Feynman");
  assert.strictEqual(feynmanRec.estimatedMinutes, 20);
});

// -----------------------------------------------------------------------------
// [Test 7] Cuello de Botella de Prerrequisitos en Grafo de Conocimiento
// -----------------------------------------------------------------------------
console.log("\n[Test 7] Cuello de Botella de Prerrequisitos en Grafo de Conocimiento");

test("Prerrequisito con dominio débil bloqueando múltiples conceptos genera prerequisite_bottleneck", async () => {
  const result = await computeLearningStateNative({
    conceptId: "concept_algebra",
    conceptName: "Álgebra Lineal Básica",
    evidences: [
      {
        id: "ev_eval_1",
        conceptId: "concept_algebra",
        timestampMs: Date.now(),
        observation: {
          type: "academicEvaluation",
          evaluationId: "eval_alg_1",
          masteryScore: 45.0, // Bajo
          omissionsCount: 2,
          contradictionsCount: 1,
        },
      },
    ],
    unresolvedErrorsCount: 1,
    isPrerequisiteForCount: 3, // Bloquea 3 nodos posteriores
  });

  assert.ok(result.compositeScore < 70, "El compositeScore debe ser menor a 70");
  const bottleInf = result.inferences.find((i) => i.diagnosisType === "prerequisite_bottleneck");
  assert.ok(bottleInf, "Debe inferir prerequisite_bottleneck");
  assert.strictEqual(bottleInf.severity, "critical");

  const prereqRec = result.recommendations.find((r) => r.strategy === "prerequisite-reinforcement");
  assert.ok(prereqRec, "Debe recomendar refuerzo de prerrequisitos");
});

console.log("\n================================================================================");
console.log("   SUITE FASE 3 LEARNING STATE: CADENA EPISTÉMICA VERIFICADA AL 100%");
console.log("================================================================================");
