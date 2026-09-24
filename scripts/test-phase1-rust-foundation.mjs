import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB FASE 1 (FUNDACIÓN RUST SEGURA & ARQUITECTURA LIMPIA)    ");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// [Test 1] Estructura de Capas en Rust (domain, dtos, application, commands)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Estructura de Capas en Rust (domain, dtos, application, commands)");

const srcTauriDir = path.join(rootDir, "src-tauri", "src");

test("Capas arquitectónicas creadas en src-tauri/src", () => {
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "mod.rs")), "domain/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "errors.rs")), "domain/errors.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "domain", "knowledge_graph", "dag.rs")), "domain/knowledge_graph/dag.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "mod.rs")), "dtos/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "dtos", "knowledge_graph_dto.rs")), "dtos/knowledge_graph_dto.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "mod.rs")), "application/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "application", "knowledge_graph_usecase.rs")), "application/knowledge_graph_usecase.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "mod.rs")), "commands/mod.rs debe existir");
  assert.ok(fs.existsSync(path.join(srcTauriDir, "commands", "knowledge_graph_commands.rs")), "commands/knowledge_graph_commands.rs debe existir");
});

// -----------------------------------------------------------------------------
// [Test 2] Errores Tipados y Serialización de Dominio (StudyLabError)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Errores Tipados y Serialización de Dominio (StudyLabError)");

test("StudyLabError define variantes estructuradas y serialización JSON", () => {
  const errorsSrc = fs.readFileSync(path.join(srcTauriDir, "domain", "errors.rs"), "utf-8");
  assert.ok(errorsSrc.includes("pub enum StudyLabError"), "Debe declarar enum StudyLabError");
  assert.ok(errorsSrc.includes("InvalidInput"), "Debe incluir variante InvalidInput");
  assert.ok(errorsSrc.includes("ValidationFailed"), "Debe incluir variante ValidationFailed");
  assert.ok(errorsSrc.includes("CycleDetected"), "Debe incluir variante CycleDetected");
  assert.ok(errorsSrc.includes("impl Serialize for StudyLabError"), "Debe implementar Serialize para Tauri IPC");
  assert.ok(errorsSrc.includes("error_code(&self)"), "Debe exponer mapeo canónico de códigos");
});

// -----------------------------------------------------------------------------
// [Test 3] Lógica Pura de Dominio (DAG Cycle Detection)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Lógica Pura de Dominio (DAG Cycle Detection)");

test("DAG cycle detection implementa validaciones, reconstrucción de caminos y tests", () => {
  const dagSrc = fs.readFileSync(path.join(srcTauriDir, "domain", "knowledge_graph", "dag.rs"), "utf-8");
  assert.ok(dagSrc.includes("pub struct DirectedEdge"), "Debe definir struct DirectedEdge");
  assert.ok(dagSrc.includes("pub struct CycleCheckResult"), "Debe definir struct CycleCheckResult");
  assert.ok(dagSrc.includes("pub fn check_candidate_edge_cycle"), "Debe definir función de dominio puro");
  assert.ok(dagSrc.includes("mod tests"), "Debe contener tests unitarios de Rust");
  assert.ok(dagSrc.includes("test_diamond_dag_valid_no_cycle"), "Debe probar caso diamante");
  assert.ok(dagSrc.includes("test_self_loop_immediately_detected"), "Debe probar auto-bucle");
});

// -----------------------------------------------------------------------------
// [Test 4] Registro en Tauri 2 runtime y lib.rs
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Registro en Tauri 2 runtime y lib.rs");

test("src-tauri/src/lib.rs exporta las nuevas capas y registra el comando IPC", () => {
  const libSrc = fs.readFileSync(path.join(srcTauriDir, "lib.rs"), "utf-8");
  assert.ok(libSrc.includes("pub mod domain;"), "Debe exportar domain");
  assert.ok(libSrc.includes("pub mod dtos;"), "Debe exportar dtos");
  assert.ok(libSrc.includes("pub mod application;"), "Debe exportar application");
  assert.ok(libSrc.includes("pub mod commands;"), "Debe exportar commands");
  assert.ok(libSrc.includes("commands::knowledge_graph_commands::check_knowledge_graph_cycle"), "Debe registrar check_knowledge_graph_cycle en invoke_handler");
});

// -----------------------------------------------------------------------------
// [Test 5] Puente Frontend en TypeScript (nativeGraph.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Puente Frontend en TypeScript (nativeGraph.ts)");

test("src/platform/nativeGraph.ts provee puente IPC con fallback determinista", async () => {
  const nativeGraphPath = path.join(rootDir, "src", "platform", "nativeGraph.ts");
  assert.ok(fs.existsSync(nativeGraphPath), "nativeGraph.ts debe existir");
  const code = fs.readFileSync(nativeGraphPath, "utf-8");
  assert.ok(code.includes("export async function checkGraphCycleNative"), "Debe exportar checkGraphCycleNative");
  assert.ok(code.includes("check_knowledge_graph_cycle"), "Debe invocar el comando nativo de Rust");
  assert.ok(code.includes("wouldCreateCycle"), "Debe incluir fallback a TypeScript");
});

console.log("\n================================================================================");
console.log("   SUITE FASE 1 RUST: LISTA PARA EJECUCIÓN");
console.log("================================================================================");
