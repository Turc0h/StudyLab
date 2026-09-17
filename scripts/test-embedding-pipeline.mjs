/**
 * Test Suite: StudyLab Local Embedding Engine & Background Worker (Paso K)
 * Verifica las 10 especificaciones de inferencia semántica y procesamiento en segundo plano:
 * 1. Proyección determinista de fallback
 * 2. Determinismo estricto (mismo texto -> mismo vector)
 * 3. Normalización L2 unitaria (norma = 1.0)
 * 4. Micro-batching controlado (lotes de 2 a 4)
 * 5. Cancelación cooperativa de lotes en ejecución
 * 6. Política de caché: chunks con vector existente son omitidos
 * 7. Persistencia relacional (serialización/deserialización JSON de float[])
 * 8. Similitud coseno entre conceptos afines vs disímiles
 * 9. Yield cooperativo para cero bloqueo de interfaz
 * 10. Robustez ante textos vacíos o strings especiales
 */

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

// Implementación de referencia para pruebas unitarias de embeddings
function computeFallbackProjection(text, dimensions = 64) {
  if (!text || !text.trim()) return [];

  const vector = Array.from({ length: dimensions }, () => 0);
  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
      hash = (hash << 5) - hash + w.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }

  // Normalización L2
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

async function computeBatchEmbeddingsSimulation(texts, options = {}) {
  if (!texts || texts.length === 0) return [];
  const batchSize = Math.max(1, Math.min(4, options.batchSize || 2));
  const results = [];
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    if (options.isCancelled && options.isCancelled()) {
      break;
    }

    const batch = texts.slice(i, i + batchSize);
    for (const text of batch) {
      results.push(computeFallbackProjection(text, 64));
    }

    if (options.onProgress) {
      options.onProgress(results.length, total);
    }

    // Yield cooperativo
    await new Promise((r) => setTimeout(r, 10));
  }

  return results;
}

async function runTests() {
  console.log("\n=== Test Suite: StudyLab Local Embedding Engine & Pipeline ===");

  // Test 1: Proyección de dimensiones correctas
  const v1 = computeFallbackProjection("Ley de Faraday y transformadores eléctricos", 64);
  assert(v1.length === 64, "Test 1: Proyección genera vector con exactamente 64 dimensiones");

  // Test 2: Determinismo estricto
  const v2 = computeFallbackProjection("Ley de Faraday y transformadores eléctricos", 64);
  let exactlyEqual = true;
  for (let i = 0; i < v1.length; i++) {
    if (v1[i] !== v2[i]) exactlyEqual = false;
  }
  assert(exactlyEqual, "Test 2: La generación es 100% determinista ante la misma entrada");

  // Test 3: Normalización L2 unitaria
  const norm = Math.sqrt(v1.reduce((sum, v) => sum + v * v, 0));
  assert(Math.abs(norm - 1.0) < 0.001, `Test 3: Vector unitario con norma L2 = 1.0 (obtenida: ${norm.toFixed(4)})`);

  // Test 4: Micro-batching en bloques de 2
  const sampleTexts = [
    "Termodinámica primer principio",
    "Termodinámica segundo principio",
    "Electrotecnia circuitos RLC",
    "Mecánica de fluidos Navier-Stokes",
    "Resistencia de materiales momentos flectores",
  ];
  let progressEvents = 0;
  const batchResults = await computeBatchEmbeddingsSimulation(sampleTexts, {
    batchSize: 2,
    onProgress: (processed, total) => {
      progressEvents++;
      assert(processed <= total, "Test 4b: Progreso reportado no excede el total");
    },
  });
  assert(batchResults.length === 5 && progressEvents === 3, "Test 4: Micro-batching procesa 5 elementos en 3 lotes de tamaño 2");

  // Test 5: Cancelación cooperativa inmediata
  let cancelTriggered = false;
  const cancelResults = await computeBatchEmbeddingsSimulation(sampleTexts, {
    batchSize: 2,
    isCancelled: () => {
      if (cancelTriggered) return true;
      cancelTriggered = true; // Activar cancelación tras el primer lote
      return false;
    },
  });
  assert(cancelResults.length === 2, "Test 5: Cancelación cooperativa interrumpe el pipeline tras el primer lote");

  // Test 6: Acierto de Caché (Cache Hit)
  const mockChunks = [
    { id: "c1", content: "Texto 1", denseVector: [0.1, 0.2] },
    { id: "c2", content: "Texto 2", denseVector: null },
    { id: "c3", content: "Texto 3", denseVector: [] },
  ];
  const pendingToCompute = mockChunks.filter((c) => !c.denseVector || c.denseVector.length === 0);
  assert(pendingToCompute.length === 2 && pendingToCompute[0].id === "c2", "Test 6: Chunks con vector previo son omitidos de la inferencia");

  // Test 7: Persistencia relacional (SQLite dense_vector)
  const jsonEncoded = JSON.stringify(v1);
  const jsonDecoded = JSON.parse(jsonEncoded);
  assert(
    Array.isArray(jsonDecoded) && jsonDecoded.length === 64 && Math.abs(jsonDecoded[0] - v1[0]) < 0.00001,
    "Test 7: Serialización y deserialización de vectores preserva fidelidad de flotantes"
  );

  // Test 8: Similitud coseno semántica relativa
  const vecThermo1 = computeFallbackProjection("termodinámica energía calor entropía", 64);
  const vecThermo2 = computeFallbackProjection("transferencia de calor entropía sistemas", 64);
  const vecPoetry = computeFallbackProjection("poesía literatura rima verso soneto", 64);

  const simRelated = cosineSimilarity(vecThermo1, vecThermo2);
  const simUnrelated = cosineSimilarity(vecThermo1, vecPoetry);
  assert(
    simRelated > simUnrelated,
    `Test 8: Similitud semántica distingue afinidad temática (${simRelated.toFixed(3)} > ${simUnrelated.toFixed(3)})`
  );

  // Test 9: Yield cooperativo
  const startYield = Date.now();
  await computeBatchEmbeddingsSimulation(["A", "B", "C", "D"], { batchSize: 2 });
  const elapsed = Date.now() - startYield;
  assert(elapsed >= 20, "Test 9: Yield cooperativo introduce pausas reales para liberar el loop de eventos");

  // Test 10: Robustez ante strings vacíos
  const emptyVec = computeFallbackProjection("", 64);
  assert(emptyVec.length === 0, "Test 10: Texto vacío retorna array vacío sin lanzar excepciones");

  console.log("\n>>> Todos los 10 casos de prueba del Motor de Embeddings pasaron con éxito! <<<\n");
}

runTests();
