import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ramerDouglasPeucker,
  applyEmaFilter,
  beautifyStroke,
} from "../src/components/whiteboard/whiteboardEngine.ts";

import { beautifyStrokeNative } from "../src/platform/nativeStroke.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.29 (OPTIMIZADOR DE TRAZOS EN RUST & ATRIBUTOS) ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Test 1] Arquitectura de Módulos en Rust
// -----------------------------------------------------------------------------
console.log("[Test 1] Arquitectura de Módulos en Rust");

test("Existe src-tauri/src/domain/strokes/mod.rs", () => {
  const p = path.join(rootDir, "src-tauri", "src", "domain", "strokes", "mod.rs");
  assert.ok(fs.existsSync(p), "strokes/mod.rs debe existir");
  const src = fs.readFileSync(p, "utf-8");
  assert.ok(src.includes("ramer_douglas_peucker"), "Debe implementar ramer_douglas_peucker en Rust");
  assert.ok(src.includes("apply_ema_filter"), "Debe implementar apply_ema_filter en Rust");
  assert.ok(src.includes("beautify_points"), "Debe implementar beautify_points en Rust");
});

test("Existe src-tauri/src/commands/stroke_commands.rs y se registra en lib.rs", () => {
  const cmdPath = path.join(rootDir, "src-tauri", "src", "commands", "stroke_commands.rs");
  assert.ok(fs.existsSync(cmdPath), "stroke_commands.rs debe existir");
  const libSrc = fs.readFileSync(path.join(rootDir, "src-tauri", "src", "lib.rs"), "utf-8");
  assert.ok(libSrc.includes("commands::stroke_commands::beautify_stroke"), "Debe registrar beautify_stroke en lib.rs");
  assert.ok(libSrc.includes("commands::stroke_commands::simplify_stroke"), "Debe registrar simplify_stroke en lib.rs");
});

// -----------------------------------------------------------------------------
// [Test 2] Puentes de Plataforma en TypeScript (nativeStroke.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Puentes de Plataforma en TypeScript (nativeStroke.ts)");

test("Existe src/platform/nativeStroke.ts y se reexporta en platform/index.ts", () => {
  const strokeBridge = path.join(rootDir, "src", "platform", "nativeStroke.ts");
  assert.ok(fs.existsSync(strokeBridge), "nativeStroke.ts debe existir");
  const indexSrc = fs.readFileSync(path.join(rootDir, "src", "platform", "index.ts"), "utf-8");
  assert.ok(indexSrc.includes('export * from "./nativeStroke"'), "platform/index.ts debe reexportar nativeStroke");
});

test("VirtualBlackboard.tsx utiliza beautifyStrokeNative para máximo rendimiento", () => {
  const vbSrc = fs.readFileSync(path.join(rootDir, "src", "components", "whiteboard", "VirtualBlackboard.tsx"), "utf-8");
  assert.ok(vbSrc.includes("beautifyStrokeNative"), "VirtualBlackboard debe llamar a beautifyStrokeNative");
});

// -----------------------------------------------------------------------------
// [Test 3] Comportamiento Algorítmico y Paridad de Ramer-Douglas-Peucker (RDP)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Comportamiento Algorítmico de RDP");

test("RDP reduce puntos perfectamente colineales a solo los dos extremos", () => {
  const colinearPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
    { x: 20, y: 20 },
    { x: 30, y: 30 },
    { x: 40, y: 40 },
  ];
  const simplified = ramerDouglasPeucker(colinearPoints, 1.0);
  assert.equal(simplified.length, 2, "Debe reducir 5 puntos colineales a 2 extremos");
  assert.equal(simplified[0].x, 0);
  assert.equal(simplified[1].x, 40);
});

test("RDP preserva vértices con deflexión mayor a epsilon", () => {
  const cornerPoints = [
    { x: 0, y: 0 },
    { x: 10, y: 0.1 },
    { x: 20, y: 30 }, // Vértice prominente
    { x: 30, y: 0.1 },
    { x: 40, y: 0 },
  ];
  const simplified = ramerDouglasPeucker(cornerPoints, 2.0);
  assert.ok(simplified.length >= 3, "Debe conservar el vértice");
  assert.ok(simplified.some((p) => p.x === 20 && p.y === 30), "Debe conservar la coordenada del vértice");
});

// -----------------------------------------------------------------------------
// [Test 4] Comportamiento del Filtro de Media Móvil Exponencial (EMA)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Comportamiento del Filtro EMA");

test("Filtro EMA atenúa ruido de alta frecuencia en coordenadas", () => {
  const noisyPoints = [
    { x: 0, y: 0 },
    { x: 5, y: 10 },  // Pico de temblor
    { x: 10, y: 2 },
    { x: 15, y: 12 }, // Pico de temblor
    { x: 20, y: 0 },
  ];
  const smoothed = applyEmaFilter(noisyPoints, 0.5);
  assert.equal(smoothed.length, noisyPoints.length, "Conserva longitud de puntos");
  // El primer punto es idéntico
  assert.equal(smoothed[0].x, 0);
  assert.equal(smoothed[0].y, 0);
  // El segundo punto está suavizado: 0.5 * 10 + 0.5 * 0 = 5.0 en lugar de 10.0
  assert.equal(smoothed[1].y, 5.0);
});

// -----------------------------------------------------------------------------
// [Test 5] beautifyStrokeNative Fallback Determinista
// -----------------------------------------------------------------------------
console.log("\n[Test 5] beautifyStrokeNative Fallback Determinista");

test("beautifyStrokeNative procesa el trazo y devuelve un trazo prolijado", async () => {
  const stroke = {
    id: "test_stroke_1",
    points: [
      { x: 0, y: 0 },
      { x: 5, y: 0.2 },
      { x: 10, y: 0.1 },
      { x: 15, y: 10 },
      { x: 20, y: 20 },
    ],
    color: "#F4F4F0",
    width: 3,
    tool: "pen",
  };

  const result = await beautifyStrokeNative(stroke, 2.0);
  assert.equal(result.id, stroke.id);
  assert.equal(result.beautified, true);
  assert.ok(result.points.length > 0);
});

console.log("\n================================================================================");
console.log(`   RESULTADO SUITE v5.29: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}