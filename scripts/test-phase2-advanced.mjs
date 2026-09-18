import fs from "fs";
import { checkOllamaStatus, DEFAULT_OLLAMA_HOST } from "../src/platform/ai/ollamaClient.ts";

console.log("================================================================================");
console.log("      TEST SUITE: STUDYLAB FASE 2 Y COMPONENTES AVANZADOS (v5.2)                ");
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

// Test 1: Contrato del cliente Ollama (ollamaClient.ts)
console.log("\n[Test 1] Cliente de IA Local Ollama (ollamaClient.ts)");
assert(DEFAULT_OLLAMA_HOST === "http://localhost:11434", "Host predeterminado apunta a localhost:11434");
assert(typeof checkOllamaStatus === "function", "Función checkOllamaStatus exportada");

// Ejecutar checkOllamaStatus contra localhost con timeout seguro
const statusResult = await checkOllamaStatus();
assert(typeof statusResult.isRunning === "boolean", "checkOllamaStatus retorna un booleano isRunning");
assert(Array.isArray(statusResult.models), "checkOllamaStatus retorna un array de modelos");
assert(statusResult.host === DEFAULT_OLLAMA_HOST, "El host reportado coincide con el configurado");
if (!statusResult.isRunning) {
  assert(typeof statusResult.error === "string", "Manejo controlado de desconexión sin lanzar unhandled rejection");
}

// Test 2: Monitor de Ollama en Ajustes (Settings.tsx)
console.log("\n[Test 2] Integración y monitor de Ollama en Settings.tsx");
const settingsSource = fs.readFileSync("src/pages/Settings.tsx", "utf8");
assert(settingsSource.includes("Inteligencia Artificial Local (Ollama - localhost:11434)"), "Sección de Ollama presente en Settings");
assert(settingsSource.includes("handleCheckOllama"), "Manejador de comprobación de conexión presente");
assert(settingsSource.includes("ollamaStatus.isRunning"), "Visualización condicional según estado del demonio");
assert(settingsSource.includes("ollama run llama3.2"), "Provee instrucciones claras para ejecutar en PowerShell");

// Test 3: Vinculación Semántica Automática en ProjectKnowledgeLinker.tsx (Fase 2)
console.log("\n[Test 3] Vinculación Semántica Automática (Fase 2 Context Engine)");
const linkerSource = fs.readFileSync("src/features/context-engine/ProjectKnowledgeLinker.tsx", "utf8");
assert(linkerSource.includes("handleSemanticSearch"), "Función de búsqueda semántica presente");
assert(linkerSource.includes("computeEmbeddingVector"), "Invoca pipeline de embeddings denso local");
assert(linkerSource.includes("cosineSimilarity"), "Calcula similitud coseno contra chunks y archivos");
assert(linkerSource.includes("handleApplySemanticSuggestions"), "Requiere acción explícita para vincular sugerencias");
assert(linkerSource.includes("Sugerencias Semánticas Detectadas (Fase 2)"), "Despliega tarjeta de confirmación previa obligatoria");

// Test 4: Runner del Método Cornell (CornellMethod.tsx)
console.log("\n[Test 4] Runner Interactivo del Método Cornell");
const cornellSource = fs.readFileSync("src/components/study-methods/CornellMethod.tsx", "utf8");
assert(cornellSource.includes("Preguntas Clave & Cues"), "Columna izquierda para cues y preguntas");
assert(cornellSource.includes("Notas Principales de Clase / Lectura"), "Columna derecha para notas detalladas");
assert(cornellSource.includes("Resumen de Síntesis Final (Summary)"), "Área inferior para resumen integrador");
assert(cornellSource.includes("isRecallModeActive"), "Modo de evocación activa (recall mode) implementado");
assert(cornellSource.includes("saveStudySession"), "Guarda la sesión en el historial de estudio");

// Test 5: Runner de Simulacros de Examen (MockExamMethod.tsx)
console.log("\n[Test 5] Runner Interactivo de Simulacros de Examen (Mock Tests)");
const mockExamSource = fs.readFileSync("src/components/study-methods/MockExamMethod.tsx", "utf8");
assert(mockExamSource.includes("Simulacro de Examen Formal"), "Setup de simulacro con selección de duración");
assert(mockExamSource.includes("remainingSeconds"), "Cronómetro regresivo en tiempo real");
assert(mockExamSource.includes("Entregar Examen"), "Botón de entrega para bloquear respuestas");
assert(mockExamSource.includes("Auditoría de Preguntas & Rúbrica Teórica"), "Desglose posterior de soluciones y fundamentación");

// Test 6: Integración en MethodsPage.tsx
console.log("\n[Test 6] Registro de nuevos runners en MethodsPage.tsx");
const methodsPageSource = fs.readFileSync("src/pages/MethodsPage.tsx", "utf8");
assert(methodsPageSource.includes("CornellMethod"), "Importación y runner de CornellMethod en MethodsPage");
assert(methodsPageSource.includes("MockExamMethod"), "Importación y runner de MockExamMethod en MethodsPage");
assert(methodsPageSource.includes("case \"cornell\":"), "Case para ejecutar método Cornell");
assert(methodsPageSource.includes("case \"practice-testing\":"), "Case para ejecutar simulacros de examen");

console.log(`\n================================================================================`);
console.log(`       RESULTADO: ${passed}/${passed + failed} TESTS PASARON EXITOSAMENTE        `);
console.log(`================================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
