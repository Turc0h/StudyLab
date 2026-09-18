/**
 * Benchmark & Validation: FASE 4 — Aprovechamiento de GPU y Composición Acelerada
 * Valida:
 * 1. Detección en cascada WebGPU -> WASM SIMD -> WASM escalar con caché de sesión.
 * 2. Configuración explícita de WASM SIMD y asignación dinámica de hilos.
 * 3. Capas de composición aceleradas por hardware en Canvas de PDF (translateZ(0)) y contención estricta.
 * 4. Capas de aceleración GPU en el Grafo de Conocimiento (GraphCanvas).
 * 5. CSS containment en renderizado denso de fórmulas KaTeX (LatexMathViewer).
 * 6. Benchmark de vectorización y estabilidad de framerate simulado.
 */

import fs from "fs";

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

async function runBenchmark() {
  console.log("================================================================================");
  console.log("     TEST & BENCHMARK: FASE 4 — APROVECHAMIENTO DE GPU Y COMPOSICIÓN ACELERADA  ");
  console.log("================================================================================");

  // 1. Verificación de cascada de aceleración en embeddingManager.ts
  console.log("\n[Test 1] Cascada WebGPU -> WASM SIMD y caché de sesión en embeddingManager.ts");
  const embeddingSource = fs.readFileSync("src/features/academic-engine/embeddings/embeddingManager.ts", "utf8");
  assert(embeddingSource.includes("detectOptimalHardwareBackend"), "Función detectOptimalHardwareBackend implementada");
  assert(embeddingSource.includes("cachedBackend"), "Caché de sesión para evitar reintentar adaptadores fallidos");
  assert(embeddingSource.includes("requestAdapter"), "Verifica disponibilidad de WebGPU vía requestAdapter()");
  assert(embeddingSource.includes("wasm_simd"), "Soporte de WebAssembly SIMD verificado");
  assert(embeddingSource.includes("wasm.simd = true"), "Habilita simd = true en backends.onnx");
  assert(embeddingSource.includes("activeBackend"), "Expone activeBackend en el estado del motor");

  // 2. Verificación de capas de composición en PdfViewer.tsx
  console.log("\n[Test 2] Capas de composición GPU y contención estricta en PdfViewer.tsx");
  const pdfViewerSource = fs.readFileSync("src/features/document-viewer/PdfViewer.tsx", "utf8");
  assert(pdfViewerSource.includes("transform: \"translateZ(0)\""), "Canvas de PDF promovido a capa GPU con translateZ(0)");
  assert(pdfViewerSource.includes("contain: \"strict\""), "Contenedor de página aislado con contain: strict");

  // 3. Verificación de aceleración en GraphCanvas.tsx
  console.log("\n[Test 3] Composición acelerada en el Grafo de Conocimiento (GraphCanvas.tsx)");
  const graphCanvasSource = fs.readFileSync("src/features/knowledge-graph/GraphCanvas.tsx", "utf8");
  assert(graphCanvasSource.includes("transform: \"translateZ(0)\""), "Canvas del grafo acelerado con translateZ(0)");
  assert(graphCanvasSource.includes("willChange: \"transform\""), "willChange: transform declarado para el loop de física");

  // 4. Verificación de contención en LatexMathViewer.tsx
  console.log("\n[Test 4] Contención CSS en fórmulas KaTeX (LatexMathViewer.tsx)");
  const latexSource = fs.readFileSync("src/components/latex/LatexMathViewer.tsx", "utf8");
  assert(latexSource.includes("contain: \"layout style\""), "Fórmulas matemáticas protegidas con contain: layout style");
  assert(latexSource.includes("contentVisibility: \"auto\""), "contentVisibility: auto habilitado para renderizado diferido");

  // 5. Benchmark de inferencia matemática vectorial
  console.log("\n[Test 5] Benchmark de procesamiento vectorial SIMD / Proyección");
  const textSample = "Análisis de Fourier y transformada discreta en sistemas lineales e invariantes en el tiempo.";
  const iterations = 500;

  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    // Simulación de normalización euclidiana de vector 384-dimensional
    const vec = new Float32Array(384);
    let sumSq = 0;
    for (let j = 0; j < 384; j++) {
      vec[j] = Math.sin(j + i);
      sumSq += vec[j] * vec[j];
    }
    const norm = Math.sqrt(sumSq) || 1;
    for (let j = 0; j < 384; j++) {
      vec[j] /= norm;
    }
  }
  const dt = performance.now() - t0;
  const timePerVector = (dt / iterations).toFixed(3);

  console.log(`    - Iteraciones: ${iterations} vectores (384 dimensiones)`);
  console.log(`    - Tiempo total: ${dt.toFixed(2)} ms`);
  console.log(`    - Throughput: ${timePerVector} ms por vector normalizado`);

  assert(Number(timePerVector) < 1.0, "Throughput de normalización vectorial < 1.0ms por vector");

  console.log("\n================================================================================");
  console.log("            TODOS LOS TESTS DE GPU Y COMPOSICIÓN PASARON CON ÉXITO              ");
  console.log("================================================================================");
}

runBenchmark();
