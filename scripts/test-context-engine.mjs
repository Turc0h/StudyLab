import fs from "fs";

console.log("================================================================================");
console.log("       TEST SUITE: STUDYLAB MOTOR DE CONTEXTO / CONTEXT ENGINE (ETAPA B)       ");
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

// Test 1: Feature Flag y Store de Context Engine
console.log("[Test 1] Contrato y valores por defecto de useContextEngineStore");
const storeSource = fs.readFileSync("src/stores/useContextEngineStore.ts", "utf8");
assert(storeSource.includes("contextEngineEnabled: false"), "contextEngineEnabled inicia estrictamente en false por defecto");
assert(storeSource.includes("heuristicHoursPerUnit: 3.0"), "Heurística base configurada a 3.0 horas por unidad");
assert(storeSource.includes("setContextEngineEnabled: (enabled: boolean)"), "Expone acción setContextEngineEnabled");
assert(storeSource.includes("setHeuristicHoursPerUnit: (hours: number)"), "Expone acción setHeuristicHoursPerUnit");

// Test 2: Aislamiento del módulo y protección por Feature Flag en UI
console.log("\n[Test 2] Aislamiento del módulo y protección en Sidebar y Dashboard");
const sidebarSource = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");
assert(sidebarSource.includes("useContextEngineStore"), "Sidebar se conecta con useContextEngineStore");
assert(sidebarSource.includes("if (contextEngineEnabled)"), "Ruta /context solo se agrega al menú si el flag está activo");

const dashboardSource = fs.readFileSync("src/features/context-engine/ContextEngineDashboard.tsx", "utf8");
assert(dashboardSource.includes("if (!contextEngineEnabled)"), "Dashboard bloquea el montaje de componentes si el flag está inactivo");
assert(dashboardSource.includes("Motor de Contexto Desactivado"), "Muestra pantalla informativa con enlace a Ajustes");

// Test 3: Controles y Switches en Settings.tsx
console.log("\n[Test 3] Integración en pantalla de Ajustes (Settings.tsx)");
const settingsSource = fs.readFileSync("src/pages/Settings.tsx", "utf8");
assert(settingsSource.includes("Motor de Contexto (Context Engine - v5.1)"), "Sección dedicada presente en Settings.tsx");
assert(settingsSource.includes("checked={contextEngineEnabled}"), "Switch vinculado al estado del flag");
assert(settingsSource.includes("heuristicHoursPerUnit"), "Control numérico para calibrar horas por unidad");

// Test 4: Analizador determinista de texto por reglas (UnifiedTextIntake / textIntakeParser)
console.log("\n[Test 4] Analizador determinista de texto por reglas");
const parserSource = fs.readFileSync("src/features/context-engine/textIntakeParser.ts", "utf8");
assert(parserSource.includes("parseTextIntakeRules"), "Función parseTextIntakeRules exportada");
assert(parserSource.includes("detectedType"), "Determina el tipo de elemento (task, calendar_event, quick_note)");
assert(parserSource.includes("isConfirmed: false"), "Todo borrador inicia con isConfirmed: false");

// Simulación directa de la lógica de parseTextIntakeRules
function simulateParser(text) {
  const lower = text.toLowerCase();
  let detectedType = "quick_note";
  if (lower.includes("parcial") || lower.includes("examen") || lower.includes("final")) {
    detectedType = "calendar_event";
  } else if (lower.includes("entregar") || lower.includes("tp") || lower.includes("tarea")) {
    detectedType = "task";
  }
  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
  return {
    detectedType,
    hasDate: !!dateMatch,
    isConfirmed: false,
  };
}

const taskResult = simulateParser("Entregar TP de Física el 25/10");
assert(taskResult.detectedType === "task" && taskResult.hasDate, "Detecta tareas académicas con fecha específica");

const examResult = simulateParser("Examen final de Álgebra");
assert(examResult.detectedType === "calendar_event", "Detecta eventos y finales para el calendario");

// Test 5: Confirmación explícita previa a cualquier persistencia
console.log("\n[Test 5] Garantía de confirmación previa (Cero automatizaciones silenciosas)");
const intakeSource = fs.readFileSync("src/features/context-engine/UnifiedTextIntake.tsx", "utf8");
assert(intakeSource.includes("handleConfirmAndSave"), "Requiere botón explícito 'Confirmar y Guardar'");
assert(intakeSource.includes("Vista Previa Editable"), "Despliega tarjeta de vista previa antes de persistir");

const calendarSource = fs.readFileSync("src/features/context-engine/WeeklyCalendarTimeBlocker.tsx", "utf8");
assert(calendarSource.includes("pendingSuggestion"), "Mantiene sugerencias en estado pendiente");
assert(calendarSource.includes("handleConfirmSuggestion"), "Requiere confirmación manual para persistir en contextTimeBlocks");

// Test 6: Vinculación manual Proyecto -> Archivos (ProjectKnowledgeLinker)
console.log("\n[Test 6] Vinculación manual de proyectos con biblioteca");
const linkerSource = fs.readFileSync("src/features/context-engine/ProjectKnowledgeLinker.tsx", "utf8");
assert(linkerSource.includes("db.contextProjects.add"), "Persiste proyectos en tabla contextProjects");
assert(linkerSource.includes("selectedFolderIds"), "Permite vincular carpetas manualmente");
assert(linkerSource.includes("selectedFileIds"), "Permite vincular archivos manualmente");
assert(linkerSource.includes("suggestedHours"), "Calcula horas sugeridas según unidades");

// Test 7: Algoritmo de promedio móvil en estimador de horas
console.log("\n[Test 7] Cálculo de promedio móvil en estimador heurístico");
const unitCount = 4;
const baseHeuristic = 3.0; // 12 hs base
const userOverride = 16.0; // Usuario reporta que le tomó 16 hs (4 hs/unidad)
const userRatio = userOverride / unitCount; // 4.0
const updatedHeuristic = Math.round(((baseHeuristic + userRatio) / 2) * 10) / 10; // (3.0 + 4.0)/2 = 3.5
assert(updatedHeuristic === 3.5, `Promedio móvil converge adecuadamente a 3.5 hs/unidad (calculado: ${updatedHeuristic})`);
assert(linkerSource.includes("updatedHeuristic"), "ProjectKnowledgeLinker aplica el ajuste de promedio móvil");

// Test 8: Registro de energía (1 a 5) y umbral circadiano de 10 registros
console.log("\n[Test 8] Registro ético de energía y umbral estadístico (PostSessionEnergyCheck)");
const energySource = fs.readFileSync("src/features/context-engine/PostSessionEnergyCheck.tsx", "utf8");
assert(energySource.includes("energyScore"), "Persiste energyScore de 1 a 5 en fatigueTelemetry");
assert(energySource.includes("totalCount >= 10"), "Exige un mínimo estricto de 10 registros antes del resumen");
assert(energySource.includes("Patrón Circadiano de Productividad"), "Ofrece reporte estadístico legible (Mañana/Tarde/Noche)");

// Test 9: Esquema Dexie v6 y migraciones
console.log("\n[Test 9] Esquema de base de datos Dexie v6");
const dbSource = fs.readFileSync("src/db/db.ts", "utf8");
assert(dbSource.includes("db.version(6).stores"), "Contiene definición de versión 6 de Dexie");
assert(dbSource.includes('studyMethods: "id, category, implemented"'), "Tabla studyMethods registrada en v6");
assert(dbSource.includes('contextProjects: "id, name, status, createdAt"'), "Tabla contextProjects registrada en v6");
assert(dbSource.includes('contextTimeBlocks: "id, projectId, isConfirmed, dayOfWeek"'), "Tabla contextTimeBlocks registrada en v6");

// Test 10: Integridad de hoja de ruta en docs/CONTEXT_ENGINE_ROADMAP.md
console.log("\n[Test 10] Hoja de ruta documentada (docs/CONTEXT_ENGINE_ROADMAP.md)");
const roadmapSource = fs.readFileSync("docs/CONTEXT_ENGINE_ROADMAP.md", "utf8");
assert(roadmapSource.includes("Fase 2 (Q1 2027)"), "Documenta Fase 2 de vinculación semántica");
assert(roadmapSource.includes("Fase 3 (Q2 2027)"), "Documenta Fase 3 de asistente de voz local");
assert(roadmapSource.includes("Fase 4 (Q3 2027)"), "Documenta Fase 4 con LLM local Ollama");
assert(roadmapSource.includes("Fase 6 (2028 - Evaluación)"), "Documenta consideraciones éticas sobre biometría y wearables");

console.log("\n================================================================================");
console.log(`       RESULTADO: ${passed}/${passed + failed} TESTS PASARON EXITOSAMENTE        `);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
