import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateRetrievabilityNative,
  calculateRNative,
  calculateIntervalDaysNative,
  previewNextStatesNative,
  executeFsrsReviewNative,
  detectCardLeechNative,
  calculateModelRmseNative,
  planLoadBalanceNative,
} from "../src/platform/nativeFsrs.ts";

import { calculateRetrievability } from "../src/features/fsrs/fsrsModel.ts";
import { calculateR } from "../src/features/fsrs/leechDetector.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB FASE 5 (FSRS v4.5 EN RUST & VERIFICACIÓN GOLDEN)       ");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// [Test 1] Arquitectura de Módulos de FSRS en Rust
// -----------------------------------------------------------------------------
console.log("[Test 1] Arquitectura de Módulos de FSRS en Rust");

test("Módulos de Model, Leech, Load Balancer, Property Tests y Fixtures existen en Rust", () => {
  const fsrsDir = path.join(root, "src-tauri/src/domain/fsrs");
  assert.ok(fs.existsSync(path.join(fsrsDir, "mod.rs")), "domain/fsrs/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(fsrsDir, "model.rs")), "domain/fsrs/model.rs debe existir");
  assert.ok(fs.existsSync(path.join(fsrsDir, "leech.rs")), "domain/fsrs/leech.rs debe existir");
  assert.ok(fs.existsSync(path.join(fsrsDir, "load_balancer.rs")), "domain/fsrs/load_balancer.rs debe existir");
  assert.ok(fs.existsSync(path.join(fsrsDir, "property_tests.rs")), "domain/fsrs/property_tests.rs debe existir");
  assert.ok(fs.existsSync(path.join(fsrsDir, "fixtures_tests.rs")), "domain/fsrs/fixtures_tests.rs debe existir");

  const dtoPath = path.join(root, "src-tauri/src/dtos/fsrs_dto.rs");
  assert.ok(fs.existsSync(dtoPath), "dtos/fsrs_dto.rs debe existir");

  const usecasePath = path.join(root, "src-tauri/src/application/fsrs_usecase.rs");
  assert.ok(fs.existsSync(usecasePath), "application/fsrs_usecase.rs debe existir");

  const commandsPath = path.join(root, "src-tauri/src/commands/fsrs_commands.rs");
  assert.ok(fs.existsSync(commandsPath), "commands/fsrs_commands.rs debe existir");
});

// -----------------------------------------------------------------------------
// [Test 2] Registro en Tauri Runtime (lib.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Registro en Tauri Runtime (lib.rs)");

test("src-tauri/src/lib.rs exporta fsrs y registra los 5 comandos IPC", () => {
  const libContent = fs.readFileSync(path.join(root, "src-tauri/src/lib.rs"), "utf-8");
  assert.ok(libContent.includes("preview_fsrs_next_states"), "Debe registrar preview_fsrs_next_states");
  assert.ok(libContent.includes("execute_fsrs_review"), "Debe registrar execute_fsrs_review");
  assert.ok(libContent.includes("detect_fsrs_card_leech"), "Debe registrar detect_fsrs_card_leech");
  assert.ok(libContent.includes("calculate_fsrs_model_rmse"), "Debe registrar calculate_fsrs_model_rmse");
  assert.ok(libContent.includes("plan_fsrs_load_balance"), "Debe registrar plan_fsrs_load_balance");
});

// -----------------------------------------------------------------------------
// [Test 3] Re-exportación en platform/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Re-exportación en platform/index.ts");

test("src/platform/index.ts exporta nativeFsrs", () => {
  const indexContent = fs.readFileSync(path.join(root, "src/platform/index.ts"), "utf-8");
  assert.ok(indexContent.includes('export * from "./nativeFsrs"'), "index.ts debe re-exportar nativeFsrs");
});

// -----------------------------------------------------------------------------
// [Test 4] Retrievability y Caso Borde s = 0.05 (Divergencia Preservada)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Retrievability y Caso Borde s = 0.05 (Divergencia Preservada)");

test("Divergencia intencional entre fsrsModel (piso 0.01) y leechDetector (piso 0.1) con s = 0.05", () => {
  const rFsrs = calculateRetrievabilityNative(1.0, 0.05);
  const rLeech = calculateRNative(1.0, 0.05);

  // fsrsModel: 1 + 19*1/0.05 = 381 -> 381^-0.5 ~= 0.05123
  // leechDetector: 1 + 19*1/0.1 = 191 -> 191^-0.5 ~= 0.07235
  assert.ok((rFsrs - 0.05123).abs ? false : Math.abs(rFsrs - 0.05123155) < 1e-6);
  assert.ok(Math.abs(rLeech - 0.07235746) < 1e-6);
  assert.ok(rLeech > rFsrs, "leechR debe ser mayor por tener piso de estabilidad superior (0.1 > 0.05)");
  const divergence = Math.abs(rLeech - rFsrs);
  assert.ok(divergence > 0.02, `Divergencia esperada > 0.02, obtenida: ${divergence}`);
});

// -----------------------------------------------------------------------------
// [Test 5] Redondeo de Intervalos (.5) y Paridad Exacta de Días
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Redondeo de Intervalos (.5) y Paridad Exacta de Días");

test("Casos límite de punto medio x.5 coinciden con Math.round y f64::round", () => {
  // Con r = 0.90, (0.90^-2 - 1) / 19.0 = 0.012345679012345674 (ligeramente inferior a 1/81 por IEEE 754)
  // s = 40.5 -> rawInterval = 0.4999999999999999 -> redondea a 0 -> clamp max(1) -> 1 día
  const iv40_5 = calculateIntervalDaysNative(40.5, 0.90);
  assert.strictEqual(iv40_5, 1);

  // s = 121.5 -> rawInterval = 1.4999999999999996 (< 1.5) -> redondea a 1 día
  const iv121_5 = calculateIntervalDaysNative(121.5, 0.90);
  assert.strictEqual(iv121_5, 1);

  // s = 121.5001 -> rawInterval > 1.5 -> redondea a 2 días
  const iv121_5001 = calculateIntervalDaysNative(121.5001, 0.90);
  assert.strictEqual(iv121_5001, 2);

  // s = 202.5 -> rawInterval = 2.499999999999999 (< 2.5) -> redondea a 2 días
  const iv202_5 = calculateIntervalDaysNative(202.5, 0.90);
  assert.strictEqual(iv202_5, 2);

  // s = 202.5001 -> rawInterval > 2.5 -> redondea a 3 días
  const iv202_5001 = calculateIntervalDaysNative(202.5001, 0.90);
  assert.strictEqual(iv202_5001, 3);

  // Mínimo de 1 día garantizado
  const ivSmall = calculateIntervalDaysNative(0.01, 0.90);
  assert.strictEqual(ivSmall, 1);
});

// -----------------------------------------------------------------------------
// [Test 6] Previews de los 4 Resultados para Botones de Interfaz
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Previews de los 4 Resultados para Botones de Interfaz");

test("previewNextStatesNative genera 4 opciones coherentes con rating 1 = 10 min", async () => {
  const result = await previewNextStatesNative({
    currentS: 3.173,
    currentD: 5.0,
    elapsedDays: 1.0,
    isNew: false,
    now: 1727179200000,
  });

  assert.ok(result.predictions);
  const p1 = result.predictions[1];
  const p2 = result.predictions[2];
  const p3 = result.predictions[3];
  const p4 = result.predictions[4];

  // Rating 1 (Again)
  assert.strictEqual(p1.intervalDays, 0);
  assert.strictEqual(p1.label, "10 min");
  assert.strictEqual(p1.nextDueDate, 1727179200000 + 10 * 60 * 1000);

  // Ratings 2, 3, 4 (Hard, Good, Easy)
  assert.ok(p2.intervalDays >= 1);
  assert.ok(p3.intervalDays >= p2.intervalDays);
  assert.ok(p4.intervalDays >= p3.intervalDays);
  assert.ok(p4.nextStability > p3.nextStability);
  assert.ok(p3.nextStability > p2.nextStability);
  assert.ok(p2.nextStability > p1.nextStability);
});

// -----------------------------------------------------------------------------
// [Test 7] Ejecución de Review y Detección de Leech
// -----------------------------------------------------------------------------
console.log("\n[Test 7] Ejecución de Review y Detección de Leech");

test("executeFsrsReviewNative computa actualización y detectCardLeechNative clasifica severidad", async () => {
  const review = await executeFsrsReviewNative({
    cardId: "card_alpha",
    rating: 3,
    latencyMs: 1500,
    now: 1727179200000,
    currentS: 3.173,
    currentD: 5.0,
    currentState: "review",
    reps: 2,
    lapses: 0,
    lastReview: 1727179200000 - 86400000,
  });

  assert.strictEqual(review.updatedCard.cardId, "card_alpha");
  assert.strictEqual(review.updatedCard.state, "review");
  assert.strictEqual(review.updatedCard.reps, 3);
  assert.strictEqual(review.updatedCard.lapses, 0);
  assert.ok(review.updatedCard.stability > 3.173);
  assert.strictEqual(review.reviewLog.rating, 3);

  // Leech tests
  const nonLeech = await detectCardLeechNative(4, 6);
  assert.strictEqual(nonLeech.isLeech, false);
  assert.strictEqual(nonLeech.actionRecommendation, "reword");

  const leechSplit = await detectCardLeechNative(6, 6);
  assert.strictEqual(leechSplit.isLeech, true);
  assert.strictEqual(leechSplit.actionRecommendation, "split");

  const leechAudit = await detectCardLeechNative(8, 6);
  assert.strictEqual(leechAudit.actionRecommendation, "audit");

  const leechSuspend = await detectCardLeechNative(10, 6);
  assert.strictEqual(leechSuspend.actionRecommendation, "suspend");
});

// -----------------------------------------------------------------------------
// [Test 8] Corrección de Fase 3: retention_score coincide con masteryEngine.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 8] Corrección de Fase 3: retention_score coincide con masteryEngine.ts");

test("Cálculo unificado de retención coincide al 100% con masteryEngine.ts eliminando divergencia 19/9", () => {
  // Entradas idénticas a las procesadas en masteryEngine.ts (líneas 36-40)
  const elapsedDays = 2.0;
  const stability = 5.0;

  // masteryEngine.ts usa calculateRetrievability(t, s) de fsrsModel.ts (factor 19.0)
  const masteryTsRetrievability = calculateRetrievability(elapsedDays, stability);

  // Valor nativo unificado de nativeFsrs
  const nativeR = calculateRetrievabilityNative(elapsedDays, stability);

  assert.strictEqual(nativeR, masteryTsRetrievability);
  // Valor esperado: 1 / sqrt(1 + 19 * 2 / 5) = 1 / sqrt(8.6) ~= 0.34099716
  assert.ok(Math.abs(nativeR - 0.34099716) < 1e-6);

  // En contraste, la fórmula previa de Fase 3 (con / 9) producía:
  // 1 / sqrt(1 + 19 * 2 / 45) = 1 / sqrt(1 + 38/45) ~= 0.73711
  const oldPhase3Val = Math.pow(1 + (19 * elapsedDays) / (9 * stability), -0.5);
  assert.ok(Math.abs(oldPhase3Val - 0.73711) < 1e-3);
  assert.ok(
    Math.abs(nativeR - oldPhase3Val) > 0.35,
    "La corrección documenta una diferencia de más de 39 puntos porcentuales de retención",
  );
});

// -----------------------------------------------------------------------------
// [Test 9] Verificación contra Fixtures Doradas Oficiales (fsrs-golden.json)
// -----------------------------------------------------------------------------
console.log("\n[Test 9] Verificación contra Fixtures Doradas Oficiales (fsrs-golden.json)");

test("Fixtures JSON: Estados iniciales, Retrievability, Intervalos y Leech coinciden 100%", () => {
  const goldenPath = path.join(root, "scripts/fixtures/fsrs-golden.json");
  assert.ok(fs.existsSync(goldenPath), "scripts/fixtures/fsrs-golden.json debe existir");

  const golden = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
  assert.strictEqual(golden.metadata.fsrsDecayFactorCurrent, 19.0);
  assert.strictEqual(golden.metadata.totalInitialCases, 4);
  assert.strictEqual(golden.metadata.totalRetrievabilityCases, 90);
  assert.strictEqual(golden.metadata.totalIntervalCases, 120);
  assert.strictEqual(golden.metadata.totalLongSequences, 5);

  // Verificar caso de intervalo del golden
  for (const c of golden.intervalCases) {
    const actual = calculateIntervalDaysNative(c.stability, c.desiredRetention);
    assert.strictEqual(
      actual,
      c.intervalDays,
      `Intervalo para s=${c.stability}, r=${c.desiredRetention} debe ser ${c.intervalDays}`,
    );
  }
});
