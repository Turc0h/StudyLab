#!/usr/bin/env node
/**
 * scripts/run-all-checks.mjs
 *
 * Orquestador Unificado de Calidad y Verificación de Cátedra para StudyLab.
 * Ejecuta en orden secuencial determinista:
 * 1. Verificación de Tipado TypeScript (tsc -b)
 * 2. Linter y Estándares de Código (oxlint)
 * 3. Batería de Suites Científicas y Algorítmicas (Rust IPC, FSRS, Dashboard, Pizarra, Leitner, etc.)
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const isWindows = process.platform === "win32";

const CHECKS = [
  {
    name: "TypeScript Compiler (tsc -b)",
    command: isWindows ? "npx.cmd" : "npx",
    args: ["tsc", "-b"],
  },
  {
    name: "Linter de Proyecto (npm run lint)",
    command: isWindows ? "npm.cmd" : "npm",
    args: ["run", "lint"],
  },
  {
    name: "Telemetría de Dashboard & FSRS Real",
    command: "node",
    args: ["scripts/test-dashboard-telemetry.mjs"],
  },
  {
    name: "Pizarra Matemática & OCR Experimental",
    command: "node",
    args: ["scripts/test-phase27-math-blackboard.mjs"],
  },
  {
    name: "Método Leitner & Fichero Universitario",
    command: "node",
    args: ["scripts/test-phase4-leitner-modes.mjs"],
  },
  {
    name: "Métodos Conceptuales (Novak, Chunking, PBL)",
    command: "node",
    args: ["scripts/test-phase7-conceptual-methods.mjs"],
  },
  {
    name: "Refinamiento Visual & Cohesión de Diseño",
    command: "node",
    args: ["scripts/test-visual-cohesion.mjs"],
  },
  {
    name: "Optimizador de Trazos & Geometría en Rust",
    command: "node",
    args: ["scripts/test-phase29-stroke-optimizer.mjs"],
  },
  {
    name: "Suite de Plataforma Nativa Rust (Fases 1 a 5)",
    command: isWindows ? "npm.cmd" : "npm",
    args: ["run", "test:rust"],
  },
  {
    name: "Pizarra Autónoma, FTS, Compresión y Dossier (Fase 30)",
    command: "node",
    args: ["scripts/test-phase30-rust-advancement.mjs"],
  },
  {
    name: "Auditoría de Persistencia Real Dexie v8 (Fase 31)",
    command: "node",
    args: ["--loader", "./scripts/ts-loader.mjs", "scripts/test-phase31-persistence-audit.mjs"],
  },
  {
    name: "Suite de Comportamiento de Interaction Shells (Fase 32)",
    command: "node",
    args: ["--loader", "./scripts/ts-loader.mjs", "scripts/test-phase32-shells-behavior.mjs"],
  },
];

console.log("================================================================================");
console.log("       STUDYLAB — PIPELINE UNIFICADO DE VERIFICACIÓN TOTAL (TEST:ALL)           ");
console.log("================================================================================\n");

async function runStep(check, index, total) {
  const stepLabel = `[${index + 1}/${total}] ${check.name}`;
  console.log(`\n▶ ${stepLabel}...`);
  const start = performance.now();

  return new Promise((resolve, reject) => {
    const proc = spawn(check.command, check.args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: isWindows,
    });

    proc.on("close", (code) => {
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`✔ ${stepLabel} [PASS] (${elapsed}s)`);
        resolve({ name: check.name, duration: elapsed, status: "PASS" });
      } else {
        console.error(`✖ ${stepLabel} [FAIL] con código ${code} (${elapsed}s)`);
        reject(new Error(`Fallo en etapa: ${check.name}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

async function main() {
  const results = [];
  const totalStart = performance.now();

  try {
    for (let i = 0; i < CHECKS.length; i++) {
      const res = await runStep(CHECKS[i], i, CHECKS.length);
      results.push(res);
    }

    const totalElapsed = ((performance.now() - totalStart) / 1000).toFixed(2);
    console.log("\n================================================================================");
    console.log("                       REPORTE CONSOLIDADO DE CALIDAD                           ");
    console.log("================================================================================");
    console.table(results);
    console.log(`\n🎉 TODAS LAS VERIFICACIONES PASARON CON ÉXITO en ${totalElapsed}s.`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Proceso abortado: ${err.message}`);
    process.exit(1);
  }
}

main();
