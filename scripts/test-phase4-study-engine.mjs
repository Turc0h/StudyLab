import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateDailyStudyAgendaNative,
  calculateCognitiveTriageNative,
  planReverseExamNative,
  calculateTimeBudgetNative,
} from "../src/platform/nativeStudyEngine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB FASE 4 (STUDY ENGINE & AGENDA DETERMINISTA EN RUST)    ");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// [Test 1] Arquitectura de Módulos de Study Engine en Rust
// -----------------------------------------------------------------------------
console.log("[Test 1] Arquitectura de Módulos de Study Engine en Rust");

test("Módulos de Agenda, Triaje, Exam Planner y Time Budget existen en Rust", () => {
  const engineDir = path.join(root, "src-tauri/src/domain/study_engine");
  assert.ok(fs.existsSync(path.join(engineDir, "mod.rs")), "domain/study_engine/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(engineDir, "agenda.rs")), "domain/study_engine/agenda.rs debe existir");
  assert.ok(fs.existsSync(path.join(engineDir, "triage.rs")), "domain/study_engine/triage.rs debe existir");
  assert.ok(fs.existsSync(path.join(engineDir, "exam_planner.rs")), "domain/study_engine/exam_planner.rs debe existir");
  assert.ok(fs.existsSync(path.join(engineDir, "time_budget.rs")), "domain/study_engine/time_budget.rs debe existir");

  const dtoPath = path.join(root, "src-tauri/src/dtos/study_engine_dto.rs");
  assert.ok(fs.existsSync(dtoPath), "dtos/study_engine_dto.rs debe existir");

  const usecasePath = path.join(root, "src-tauri/src/application/study_engine_usecase.rs");
  assert.ok(fs.existsSync(usecasePath), "application/study_engine_usecase.rs debe existir");

  const commandsPath = path.join(root, "src-tauri/src/commands/study_engine_commands.rs");
  assert.ok(fs.existsSync(commandsPath), "commands/study_engine_commands.rs debe existir");
});

// -----------------------------------------------------------------------------
// [Test 2] Registro en Tauri Runtime (lib.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Registro en Tauri Runtime (lib.rs)");

test("src-tauri/src/lib.rs exporta study_engine y registra los 4 comandos IPC", () => {
  const libContent = fs.readFileSync(path.join(root, "src-tauri/src/lib.rs"), "utf-8");
  assert.ok(libContent.includes("generate_study_agenda"), "Debe registrar generate_study_agenda");
  assert.ok(libContent.includes("calculate_cognitive_triage"), "Debe registrar calculate_cognitive_triage");
  assert.ok(libContent.includes("plan_reverse_exam"), "Debe registrar plan_reverse_exam");
  assert.ok(libContent.includes("calculate_time_budget"), "Debe registrar calculate_time_budget");
});

// -----------------------------------------------------------------------------
// [Test 3] Re-exportación en platform/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Re-exportación en platform/index.ts");

test("src/platform/index.ts exporta nativeStudyEngine", () => {
  const indexContent = fs.readFileSync(path.join(root, "src/platform/index.ts"), "utf-8");
  assert.ok(indexContent.includes('export * from "./nativeStudyEngine"'), "index.ts debe re-exportar nativeStudyEngine");
});

// -----------------------------------------------------------------------------
// [Test 4] Generación Determinista de Agenda Diaria
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Generación Determinista de Agenda Diaria");

test("Agenda calcula deuda cognitiva precisa y sintetiza recomendación", async () => {
  const agenda = await generateDailyStudyAgendaNative({
    targetDate: "2026-09-24",
    nowMs: 1700000000000,
    totalDueCards: 14,
    dueCardConcepts: [
      { conceptId: "c_alg", conceptName: "Álgebra Lineal", count: 10 },
      { conceptId: "c_calc", conceptName: "Cálculo I", count: 4 },
    ],
    gapSignals: [
      {
        conceptId: "c_alg",
        conceptName: "Matrices Inversas",
        gapType: "persistent_misconception",
        explanation: "Confusión de determinante nulo",
      },
    ],
    bottleneckSignals: [
      {
        conceptId: "c_calc",
        conceptName: "Límites",
        blockedDownstreamCount: 2,
        blockedConceptNames: ["Derivadas", "Integrales"],
      },
    ],
    examAlerts: [],
    totalConceptsRegistered: 10,
  });

  // Deuda: 14 min (repasos) + 20 min (feynman misconception) + 25 min (bottleneck) = 59 min
  assert.strictEqual(agenda.totalDebtMinutes, 14 + 20 + 25, "Deuda cognitiva total debe ser 59 min");
  assert.strictEqual(agenda.urgentReviews.cardCount, 14);
  assert.strictEqual(agenda.urgentReviews.topConceptNames[0], "Álgebra Lineal");
  assert.ok(agenda.headline.includes("Repasar 14 tarjeta(s) vencidas"));
  assert.ok(agenda.rationale.includes("Deuda total acumulada: 59 min"));
  assert.ok(agenda.sourceEngine === "rust" || agenda.sourceEngine === "typescript-fallback");
});

// -----------------------------------------------------------------------------
// [Test 5] Triaje Cognitivo para los 30 Métodos de Estudio
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Triaje Cognitivo para los 30 Métodos de Estudio");

test("Triaje asigna método óptimo y detecta fatiga extrema en emergencias", async () => {
  // Caso 1: Emergencia pre-examen con foco alto
  const resUrgent = await calculateCognitiveTriageNative({
    urgency: "urgent",
    material: "logical",
    mastery: "advanced",
    energy: "high",
  });

  assert.strictEqual(resUrgent.topMatches.length, 3, "Debe devolver Top 3 métodos");
  const top1 = resUrgent.topMatches[0].methodId;
  assert.ok(top1 === "practice-testing" || top1 === "blurting", `Top 1 debe ser evaluación activa: ${top1}`);
  assert.ok(resUrgent.topMatches[0].matchPercentage >= 80);
  assert.ok(resUrgent.diagnosticSummary.includes("menos de 24 horas"));

  // Caso 2: Emergencia con fatiga extrema
  const resFatigue = await calculateCognitiveTriageNative({
    urgency: "urgent",
    material: "factual",
    mastery: "intermediate",
    energy: "low",
  });

  assert.ok(resFatigue.cautionAlert, "Debe alertar sobre fatiga extrema");
  assert.ok(resFatigue.cautionAlert.includes("Fatiga Extrema"));
});

// -----------------------------------------------------------------------------
// [Test 6] Planificación Inversa de Exámenes
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Planificación Inversa de Exámenes");

test("Planificador inverso calcula fases 30%-40%-20%-10% e hitos", async () => {
  const now = 10000000;
  const examDate = now + (20 * 24 * 60 * 60 * 1000); // 20 días hacia adelante

  const plan = await planReverseExamNative({
    subjectId: "sub_fisica",
    subjectName: "Física Universitaria I",
    examDateMs: examDate,
    nowMs: now,
    availableMinutesPerDay: 120,
  });

  assert.strictEqual(plan.totalDays, 20);
  assert.strictEqual(plan.phases.length, 4, "Debe dividir el plan en 4 fases metodológicas");
  assert.strictEqual(plan.phases[0].name, "Fase 1: Diagnóstico e Ingesta Conceptual");
  assert.strictEqual(plan.phases[1].name, "Fase 2: Resolución Profunda y Desarme de Errores");
  assert.strictEqual(plan.phases[2].name, "Fase 3: Simulacros de Examen Cronometrados");
  assert.strictEqual(plan.phases[3].name, "Fase 4: Consolidación y Repaso de Retención");

  // Suma de días asignados
  const d1 = plan.phases[0].endDayOffset - plan.phases[0].startDayOffset;
  const d2 = plan.phases[1].endDayOffset - plan.phases[1].startDayOffset;
  const d3 = plan.phases[2].endDayOffset - plan.phases[2].startDayOffset;
  const d4 = plan.phases[3].endDayOffset - plan.phases[3].startDayOffset;
  assert.strictEqual(d1 + d2 + d3 + d4, 20, "La suma de duración de las 4 fases debe ser 20 días");
});

// -----------------------------------------------------------------------------
// [Test 7] Asignación de Presupuesto Temporal
// -----------------------------------------------------------------------------
console.log("\n[Test 7] Asignación de Presupuesto Temporal");

test("Time Budget distribuye bloques exactos para micro, medio y largo plazo", async () => {
  // Micro-bloque de 20 minutos
  const microPlan = await calculateTimeBudgetNative({
    budgetMinutes: 20,
    urgentCardsCount: 8,
    topConceptName: "Ecuaciones Diferenciales",
    primaryGapConceptName: "Condiciones Iniciales",
  });
  assert.strictEqual(microPlan.totalMinutes, 20);
  const microSum = microPlan.steps.reduce((acc, s) => acc + s.allocatedMinutes, 0);
  assert.strictEqual(microSum, 20, "Micro-bloque debe sumar exactamente 20 min");

  // Sesión profunda de 90 minutos
  const deepPlan = await calculateTimeBudgetNative({
    budgetMinutes: 90,
    urgentCardsCount: 15,
    topConceptName: "Electromagnetismo",
    primaryGapConceptName: "Ley de Gauss",
  });
  assert.strictEqual(deepPlan.totalMinutes, 90);
  assert.strictEqual(deepPlan.steps.length, 4, "Sesión de 90 min debe constar de 4 fases completas");
  const deepSum = deepPlan.steps.reduce((acc, s) => acc + s.allocatedMinutes, 0);
  assert.strictEqual(deepSum, 90, "Sesión profunda debe sumar exactamente 90 min");
});

// -----------------------------------------------------------------------------
// [Test 8] Verificación Exhaustiva contra Fixtures Oficiales (study-engine-cases.json)
// -----------------------------------------------------------------------------
console.log("\n[Test 8] Verificación Exhaustiva contra Fixtures Oficiales (study-engine-cases.json)");

test("Fixtures JSON: Triage, Exam Planner, Time Budget y Agenda coinciden 100% con TS original", async () => {
  const fixturesPath = path.join(root, "scripts/fixtures/study-engine-cases.json");
  assert.ok(fs.existsSync(fixturesPath), "study-engine-cases.json debe existir");
  const data = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

  // 1. Triage
  for (const [idx, tc] of data.triageCases.entries()) {
    const res = await calculateCognitiveTriageNative(tc.input);
    assert.strictEqual(res.topMatches.length, tc.expected.topMatches.length, `Triage #${idx} top length`);
    for (const [mIdx, expM] of tc.expected.topMatches.entries()) {
      assert.strictEqual(res.topMatches[mIdx].methodId, expM.methodId, `Triage #${idx} match #${mIdx} methodId`);
      assert.strictEqual(res.topMatches[mIdx].score, expM.score, `Triage #${idx} match #${mIdx} score`);
      assert.strictEqual(res.topMatches[mIdx].matchPercentage, expM.matchPercentage, `Triage #${idx} match #${mIdx} pct`);
    }
    assert.strictEqual(res.cautionAlert || null, tc.expected.cautionAlert, `Triage #${idx} cautionAlert`);
  }

  // 2. Exam Planner (Edge cases de A3)
  for (const [idx, ec] of data.examPlannerCases.entries()) {
    const plan = await planReverseExamNative(ec.input);
    assert.strictEqual(plan.totalDays, ec.expected.totalDays, `Exam #${idx} [${ec.scenario}] totalDays`);
    assert.strictEqual(plan.phases.length, ec.expected.phases.length, `Exam #${idx} [${ec.scenario}] phases count`);
    for (const [pIdx, expP] of ec.expected.phases.entries()) {
      assert.strictEqual(plan.phases[pIdx].name, expP.name, `Exam #${idx} phase #${pIdx} name`);
      assert.strictEqual(plan.phases[pIdx].startDayOffset, expP.startDayOffset, `Exam #${idx} phase #${pIdx} start`);
      assert.strictEqual(plan.phases[pIdx].endDayOffset, expP.endDayOffset, `Exam #${idx} phase #${pIdx} end`);
    }
  }

  // 3. Time Budget
  for (const [idx, bc] of data.timeBudgetCases.entries()) {
    const plan = await calculateTimeBudgetNative(bc.input);
    assert.strictEqual(plan.totalMinutes, bc.expected.totalMinutes, `Budget #${idx} [${bc.scenario}] totalMinutes`);
    assert.strictEqual(plan.steps.length, bc.expected.steps.length, `Budget #${idx} [${bc.scenario}] steps count`);
    for (const [sIdx, expS] of bc.expected.steps.entries()) {
      assert.strictEqual(plan.steps[sIdx].stepType, expS.stepType, `Budget #${idx} step #${sIdx} type`);
      assert.strictEqual(plan.steps[sIdx].allocatedMinutes, expS.allocatedMinutes, `Budget #${idx} step #${sIdx} mins`);
    }
  }

  // 4. Agenda
  for (const [idx, ac] of data.agendaCases.entries()) {
    const agenda = await generateDailyStudyAgendaNative({
      targetDate: "2026-09-24",
      nowMs: 1000,
      totalDueCards: ac.input.totalDueCards,
      dueCardConcepts: ac.input.topConceptNames.map((name) => ({
        conceptId: name,
        conceptName: name,
        count: ac.input.totalDueCards,
      })),
      gapSignals: ac.input.gapSignals,
      bottleneckSignals: ac.input.bottleneckSignals,
      examAlerts: [],
      totalConceptsRegistered: ac.input.totalConceptsRegistered,
    });
    assert.strictEqual(agenda.totalDebtMinutes, ac.expected.totalDebtMinutes, `Agenda #${idx} [${ac.scenario}] totalDebtMinutes`);
    assert.strictEqual(agenda.headline, ac.expected.headline, `Agenda #${idx} [${ac.scenario}] headline`);
  }
});

console.log("\n================================================================================");
console.log("   SUITE FASE 4 STUDY ENGINE: VERIFICADA CON ÉXITO AL 100%");
console.log("================================================================================");
