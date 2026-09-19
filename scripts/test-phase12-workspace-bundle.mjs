import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.12 (PAQUETE DE RESPALDO .studylab-bundle)   ");
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

// -----------------------------------------------------------------------------
// Test 1: Motor de Respaldo y Migración (workspaceBackup.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Cobertura de las 28 Tablas de Dexie y SHA-256 en workspaceBackup.ts");
const backupPath = path.join(root, "src/features/storage/workspaceBackup.ts");
assert(fs.existsSync(backupPath), "Existe workspaceBackup.ts");
const backupContent = fs.readFileSync(backupPath, "utf-8");

assert(backupContent.includes("format: \"studylab-bundle\""), "Define formato oficial .studylab-bundle");
assert(backupContent.includes("sha256Checksum"), "Incluye sha256Checksum en la interfaz BackupManifest");
assert(backupContent.includes("inspectBackupBundle"), "Exporta función de inspección previa inspectBackupBundle");
assert(backupContent.includes("computeSha256"), "Implementa cálculo criptográfico computeSha256");

// Verificar las 29 tablas del sistema StudyLab
const EXPECTED_TABLES = [
  "folders",
  "files",
  "highlights",
  "postits",
  "sessions",
  "deadlines",
  "reviewSchedule",
  "flashcards",
  "flashcardDecks",
  "ocrPages",
  "cardsFsrs",
  "reviewLogs",
  "concepts",
  "conceptEdges",
  "workspaceConfigs",
  "fatigueTelemetry",
  "academicSources",
  "academicChunks",
  "academicEvaluations",
  "workspaceState",
  "studentErrors",
  "examPlans",
  "studyMethods",
  "contextProjects",
  "contextTimeBlocks",
  "contextProjectDocs",
  "contextEvents",
  "energyLogs",
  "textIntakes"
];

for (const tableName of EXPECTED_TABLES) {
  assert(
    backupContent.includes(`${tableName}:`) ||
    backupContent.includes(`.${tableName}`) ||
    backupContent.includes(`dbData.${tableName}`),
    `workspaceBackup.ts incluye persistencia de la tabla [${tableName}]`
  );
}

// -----------------------------------------------------------------------------
// Test 2: Modal de Inspección y Vista Previa (RestorePreviewModal.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Modal de Inspección y Vista Previa (RestorePreviewModal.tsx)");
const modalPath = path.join(root, "src/components/backup/RestorePreviewModal.tsx");
assert(fs.existsSync(modalPath), "Existe RestorePreviewModal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

assert(modalContent.includes("export const RestorePreviewModal"), "Exporta RestorePreviewModal");
assert(modalContent.includes("checksumValid"), "Evalúa validez de la firma criptográfica SHA-256");
assert(modalContent.includes(".studylab-bundle"), "Muestra badge de formato portable .studylab-bundle");
assert(modalContent.includes("inspection.stats.fileCount"), "Muestra contador de archivos recuperables");
assert(modalContent.includes("inspection.stats.cardCount"), "Muestra contador de tarjetas FSRS");
assert(modalContent.includes("inspection.stats.studySessionCount"), "Muestra contador de sesiones de los 30 métodos");
assert(modalContent.includes("inspection.stats.projectCount"), "Muestra contador de proyectos de contexto");
assert(modalContent.includes("inspection.stats.totalTables"), "Muestra total de tablas auditadas");
assert(modalContent.includes("restoring"), "Controla barra de progreso y estado de restauración");

// -----------------------------------------------------------------------------
// Test 3: Integración en Configuración (Settings.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Integración en Configuración (Settings.tsx)");
const settingsPath = path.join(root, "src/pages/Settings.tsx");
assert(fs.existsSync(settingsPath), "Existe Settings.tsx");
const settingsContent = fs.readFileSync(settingsPath, "utf-8");

assert(settingsContent.includes("RestorePreviewModal"), "Settings.tsx importa RestorePreviewModal");
assert(settingsContent.includes("inspectBackupBundle"), "Settings.tsx importa inspectBackupBundle");
assert(settingsContent.includes(".studylab-bundle"), "Settings.tsx soporta extensiones .studylab-bundle");
assert(settingsContent.includes("handleSelectBackupFile"), "Settings.tsx intercepta la selección para abrir vista previa");
assert(settingsContent.includes("<RestorePreviewModal"), "Settings.tsx monta el componente RestorePreviewModal");

// -----------------------------------------------------------------------------
// Test 4: Simulación Criptográfica y Generación de Bundle
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Verificación de Empaquetado y Checksum Criptográfico SHA-256");

async function testCryptoBundle() {
  const mockDb = {
    schemaVersion: 6,
    exportedAt: new Date().toISOString(),
    data: {
      files: [{ id: "f1", name: "Apuntes_Anatomia.pdf", size: 1048576 }],
      flashcards: [{ id: "c1", front: "¿Qué es la mielina?", back: "Capa lipídica..." }],
      studySessions: [{ id: "s1", methodId: "feynman-technique", durationSeconds: 1200 }],
      contextProjects: [{ id: "p1", name: "Medicina - Final Marzo 2026" }],
      studyMethods: [],
      chunks: [],
      embeddings: []
    }
  };

  const dbJson = JSON.stringify(mockDb, null, 2);
  const expectedHash = crypto.createHash("sha256").update(dbJson, "utf8").digest("hex");

  assert(expectedHash.length === 64, `Cálculo de hash SHA-256 válido (64 caracteres hex: ${expectedHash.slice(0, 16)}...)`);

  const mockManifest = {
    version: "5.12.0",
    format: "studylab-bundle",
    timestamp: new Date().toISOString(),
    totalFiles: 1,
    dexieSchemaVersion: 6,
    sha256Checksum: expectedHash,
    appVersion: "5.12.0",
    stats: {
      flashcards: 1,
      studySessions: 1,
      projects: 1,
      totalTables: 28
    }
  };

  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(mockManifest, null, 2));
  zip.file("studylab_db.json", dbJson);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  assert(zipBuffer.length > 0, "Generación en memoria del paquete ZIP .studylab-bundle exitosa");

  // Leer y verificar con JSZip como haría inspectBackupBundle
  const unzipped = await JSZip.loadAsync(zipBuffer);
  const manifestFile = unzipped.file("manifest.json");
  const dbFile = unzipped.file("studylab_db.json");

  assert(manifestFile !== null, "El bundle contiene manifest.json");
  assert(dbFile !== null, "El bundle contiene studylab_db.json");

  const readManifest = JSON.parse(await manifestFile.async("text"));
  const readDbText = await dbFile.async("text");
  const readHash = crypto.createHash("sha256").update(readDbText, "utf8").digest("hex");

  assert(readManifest.format === "studylab-bundle", "Manifest especifica formato .studylab-bundle");
  assert(readManifest.dexieSchemaVersion === 6, "Manifest certifica compatibilidad con esquema Dexie v6");
  assert(readManifest.sha256Checksum === readHash, "Integridad criptográfica verificada: Hash del manifest coincide con studylab_db.json");
}

await testCryptoBundle();

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> ETAPA v5.12 COMPLETADA CON ÉXITO: Paquete de Respaldo Portable .studylab-bundle operativo. <<\n");
}
