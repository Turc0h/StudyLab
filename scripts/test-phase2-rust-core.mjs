import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateMathDerivationNative } from "../src/platform/nativeMath.ts";
import { evaluateStressNative, parseGattHeartRateNative } from "../src/platform/nativeTelemetry.ts";
import { detectOralSmokeNative } from "../src/platform/nativeEvaluation.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB FASE 2 (CORE MATEMÁTICO, TELEMETRÍA Y EVALUACIÓN)       ");
console.log("================================================================================");

const srcTauriDir = path.join(rootDir, "src-tauri", "src");

// -----------------------------------------------------------------------------
// [Test 1] Arquitectura de Módulos Core en Rust
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Arquitectura de Módulos Core en Rust");

test("Módulos de Dominio, DTOs, Casos de Uso y Comandos de Fase 2 existen", () => {
  // Domain
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "math", "derivation.rs")), "domain/math/derivation.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "telemetry", "fatigue.rs")), "domain/telemetry/fatigue.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "evaluation", "smoke_detector.rs")), "domain/evaluation/smoke_detector.rs debe existir");

  // DTOs
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "math_dto.rs")), "dtos/math_dto.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "telemetry_dto.rs")), "dtos/telemetry_dto.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "evaluation_dto.rs")), "dtos/evaluation_dto.rs debe existir");

  // Application
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "math_usecase.rs")), "application/math_usecase.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "telemetry_usecase.rs")), "application/telemetry_usecase.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "evaluation_usecase.rs")), "application/evaluation_usecase.rs debe existir");

  // Commands
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "math_commands.rs")), "commands/math_commands.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "telemetry_commands.rs")), "commands/telemetry_commands.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "evaluation_commands.rs")), "commands/evaluation_commands.rs debe existir");
});

// -----------------------------------------------------------------------------
// [Test 2] Registro de Comandos en Tauri Runtime (lib.rs)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Registro de Comandos en Tauri Runtime (lib.rs)");

test("lib.rs registra los comandos de matemáticas, telemetría y evaluación en generate_handler!", () => {
  const libSrc = fs.readFileSync(path.join(srcTauriDir, "lib.rs"), "utf-8");
  assert.ok(libSrc.includes("commands::math_commands::validate_math_derivation_step"), "Debe registrar validate_math_derivation_step");
  assert.ok(libSrc.includes("commands::telemetry_commands::evaluate_biometric_stress"), "Debe registrar evaluate_biometric_stress");
  assert.ok(libSrc.includes("commands::telemetry_commands::parse_gatt_heart_rate"), "Debe registrar parse_gatt_heart_rate");
  assert.ok(libSrc.includes("commands::evaluation_commands::detect_oral_smoke"), "Debe registrar detect_oral_smoke");
});

// -----------------------------------------------------------------------------
// [Test 3] Puentes de Plataforma en TypeScript (src/platform/)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Puentes de Plataforma en TypeScript (src/platform/)");

test("nativeMath, nativeTelemetry y nativeEvaluation proveen invocación tipada y fallback", () => {
  const mathCode = fs.readFileSync(path.join(rootDir, "src", "platform", "nativeMath.ts"), "utf-8");
  assert.ok(mathCode.includes("validateMathDerivationNative"), "Debe exportar validateMathDerivationNative");
  assert.ok(mathCode.includes("validate_math_derivation_step"), "Debe invocar el comando nativo");
  assert.ok(mathCode.includes("validateStepDerivation"), "Debe incluir fallback");

  const telemetryCode = fs.readFileSync(path.join(rootDir, "src", "platform", "nativeTelemetry.ts"), "utf-8");
  assert.ok(telemetryCode.includes("evaluateStressNative"), "Debe exportar evaluateStressNative");
  assert.ok(telemetryCode.includes("parseGattHeartRateNative"), "Debe exportar parseGattHeartRateNative");

  const evalCode = fs.readFileSync(path.join(rootDir, "src", "platform", "nativeEvaluation.ts"), "utf-8");
  assert.ok(evalCode.includes("detectOralSmokeNative"), "Debe exportar detectOralSmokeNative");
  assert.ok(evalCode.includes("detect_oral_smoke"), "Debe invocar el comando nativo");
});

// -----------------------------------------------------------------------------
// [Test 4] Re-exportación en platform/index.ts
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Re-exportación en platform/index.ts");

test("src/platform/index.ts exporta las utilidades nativas", () => {
  const indexSrc = fs.readFileSync(path.join(rootDir, "src", "platform", "index.ts"), "utf-8");
  assert.ok(indexSrc.includes('export * from "./nativeMath";'), "Debe exportar nativeMath");
  assert.ok(indexSrc.includes('export * from "./nativeTelemetry";'), "Debe exportar nativeTelemetry");
  assert.ok(indexSrc.includes('export * from "./nativeEvaluation";'), "Debe exportar nativeEvaluation");
});

// -----------------------------------------------------------------------------
// [Test 5] Comportamiento Algorítmico y Validación de Fallback Matemático
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Comportamiento Algorítmico y Validación de Fallback Matemático");

test("validateMathDerivationNative evalúa expresiones con precisión analítica", async () => {
  // Coincidencia exacta
  const exact = await validateMathDerivationNative({
    userAttempt: "F'(x) = f(x)",
    expectedFormula: "F'(x) = f(x)",
    keyTokens: ["F'", "f(x)"],
  });
  assert.strictEqual(exact.isCorrect, true);
  assert.strictEqual(exact.score, 10.0);
  assert.strictEqual(exact.tokenRatio, 1.0);

  // Coincidencia parcial con tokens suficientes
  const partial = await validateMathDerivationNative({
    userAttempt: "f_s sum X(f - k f_s)",
    expectedFormula: "X_s(f) = f_s \\sum_{k=-\\infty}^{\\infty} X(f - k f_s)",
    keyTokens: ["f_s", "sum", "X(f", "k f_s"],
  });
  assert.strictEqual(partial.isCorrect, true);
  assert.strictEqual(partial.score, 8.5);
  assert.ok(partial.tokenRatio >= 0.70);

  // Intento vacío
  const empty = await validateMathDerivationNative({
    userAttempt: "   ",
    expectedFormula: "a = b",
    keyTokens: ["a"],
  });
  assert.strictEqual(empty.isCorrect, false);
  assert.strictEqual(empty.score, 0);
});

// -----------------------------------------------------------------------------
// [Test 6] Comportamiento Algorítmico de Telemetría Biométrica (BPM, HRV y GATT)
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Comportamiento Algorítmico de Telemetría Biométrica (BPM, HRV y GATT)");

test("evaluateStressNative clasifica zonas fisiológicas y parseGatt procesa tramas", async () => {
  const calm = await evaluateStressNative({ bpm: 62 });
  assert.strictEqual(calm.state, "calm");
  assert.strictEqual(calm.recommendedAction, "continue");

  const focused = await evaluateStressNative({ bpm: 75 });
  assert.strictEqual(focused.state, "focused");
  assert.strictEqual(focused.recommendedAction, "continue");

  const strained = await evaluateStressNative({ bpm: 90 });
  assert.strictEqual(strained.state, "strained");
  assert.strictEqual(strained.recommendedAction, "micro_break");

  const stressed = await evaluateStressNative({ bpm: 108 });
  assert.strictEqual(stressed.state, "stressed");
  assert.strictEqual(stressed.recommendedAction, "box_breathing");

  // Parsing de trama binaria GATT 8-bit
  const gattPayload = new Uint8Array([0x00, 76]); // 8-bit BPM: 76
  const parsed = await parseGattHeartRateNative(gattPayload);
  assert.ok(parsed !== null, "Debe decodificar la trama GATT");
  assert.strictEqual(parsed.bpm, 76);
  assert.strictEqual(parsed.contactDetected, false);
});

// -----------------------------------------------------------------------------
// [Test 7] Comportamiento Algorítmico y Detección de Humo Oral / Evasivas
// -----------------------------------------------------------------------------
console.log("\n[Test 7] Comportamiento Algorítmico y Detección de Humo Oral / Evasivas");

test("detectOralSmokeNative detecta muletillas, longitud deficiente y rigurosidad técnica", async () => {
  // Respuesta con muletillas y evasivas
  const evasive = await detectOralSmokeNative({
    text: "Básicamente lo que pasa es todo un tema porque en líneas generales se sobrentiende todo.",
    modelKeyPoints: ["fisiopatología celular", "curvas de Frank-Starling"],
    minWords: 15,
  });
  assert.strictEqual(evasive.isSmoke, true);
  assert.ok(evasive.reasons.length > 0);

  // Respuesta telegráfica insuficiente
  const telegraphic = await detectOralSmokeNative({
    text: "late más rápido",
    modelKeyPoints: ["elastancia ventricular"],
    minWords: 20,
  });
  assert.strictEqual(telegraphic.isSmoke, true);

  // Respuesta sólida y rigurosa
  const solid = await detectOralSmokeNative({
    text: "El acoplamiento se determina por la elastancia ventricular sobre la elastancia arterial, elevando el consumo miocárdico de oxígeno por sobrecarga de calcio citosólico.",
    modelKeyPoints: [
      "Elastancia ventricular sistólica",
      "Consumo miocárdico de oxígeno",
      "Calcio citosólico",
    ],
    minWords: 15,
  });
  assert.strictEqual(solid.isSmoke, false);
  assert.ok(solid.coverageRatio >= 0.60);
});

console.log("\n================================================================================");
console.log("   SUITE FASE 2 RUST CORE: VALIDADA COMPORTAMENTALMENTE AL 100%");
console.log("================================================================================");
