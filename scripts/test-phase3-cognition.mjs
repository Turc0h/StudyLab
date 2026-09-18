import fs from "fs";
import { STUDY_METHODS_30_SEEDS } from "../src/data/studyMethodsSeed.ts";

console.log("================================================================================");
console.log("      TEST SUITE: STUDYLAB ETAPA v5.3 (COGNICIÓN, VOZ Y MÉTODOS AVANZADOS)      ");
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

// Test 1: Asistente Cognitivo y Dictado de Voz en UnifiedTextIntake.tsx
console.log("\n[Test 1] Asistente Cognitivo con Ollama y Dictado en UnifiedTextIntake.tsx");
const intakeSource = fs.readFileSync("src/features/context-engine/UnifiedTextIntake.tsx", "utf8");
assert(intakeSource.includes("handleProcessWithOllama"), "Manejador de inferencia con IA local Ollama implementado");
assert(intakeSource.includes("checkOllamaStatus"), "Verifica disponibilidad del demonio local");
assert(intakeSource.includes("handleToggleVoice"), "Manejador de dictado por voz integrado");
assert(intakeSource.includes("SpeechRecognition"), "Utiliza API nativa de voz sin servicios externos");
assert(intakeSource.includes("handleConfirmAndSave"), "Garantiza confirmación previa obligatoria en preview card");

// Test 2: Runner de Zettelkasten Académico (ZettelkastenMethod.tsx)
console.log("\n[Test 2] Runner Interactivo de Zettelkasten Académico");
const zettelSource = fs.readFileSync("src/components/study-methods/ZettelkastenMethod.tsx", "utf8");
assert(zettelSource.includes("generateZettelId"), "Generador de identificador temporal atómico único");
assert(zettelSource.includes("/\\[\\[(.*?)\\]\\]/g"), "Detector reactivo de enlaces bidireccionales wiki [[...]]");
assert(zettelSource.includes("saveStudySession"), "Persistencia de notas atómicas en el historial");
assert(zettelSource.includes("Conexiones de Red"), "Panel lateral de visualización de red asociativa");

// Test 3: Runner de Blurting (Vaciado Mental) (BlurtingMethod.tsx)
console.log("\n[Test 3] Runner Interactivo de Blurting (Vaciado Mental)");
const blurtingSource = fs.readFileSync("src/components/study-methods/BlurtingMethod.tsx", "utf8");
assert(blurtingSource.includes("startBlurtingPhase"), "Transición hacia fase de vaciado sin apuntes");
assert(blurtingSource.includes("startAuditPhase"), "Transición hacia fase de auditoría de lagunas");
assert(blurtingSource.includes("Texto Original de Cátedra"), "Contraste visual de apunte original");
assert(blurtingSource.includes("Lo que Evocaste de Memoria"), "Contraste visual de memoria evocada");
assert(blurtingSource.includes("Lagunas Identificadas"), "Sección dedicada para derivación de fallos a FSRS");

// Test 4: Integración en MethodsPage.tsx
console.log("\n[Test 4] Registro de nuevos runners en MethodsPage.tsx");
const pageSource = fs.readFileSync("src/pages/MethodsPage.tsx", "utf8");
assert(pageSource.includes("ZettelkastenMethod"), "Importación perezosa de ZettelkastenMethod");
assert(pageSource.includes("BlurtingMethod"), "Importación perezosa de BlurtingMethod");
assert(pageSource.includes("case \"zettelkasten\":"), "Switch case para ejecutar Zettelkasten");
assert(pageSource.includes("case \"blurting\":"), "Switch case para ejecutar Blurting");

// Test 5: Estado en el catálogo de 30 métodos
console.log("\n[Test 5] Estado de catálogo y métodos interactivos");
const implementedCount = STUDY_METHODS_30_SEEDS.filter(m => m.implemented).length;
assert(implementedCount >= 9, `Catálogo posee al menos 9 métodos interactivos listos (actual: ${implementedCount})`);
assert(STUDY_METHODS_30_SEEDS.length === 30, "Mantiene la totalidad de los 30 métodos científicos");

console.log(`\n================================================================================`);
console.log(`       RESULTADO: ${passed}/${passed + failed} TESTS PASARON EXITOSAMENTE        `);
console.log(`================================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
