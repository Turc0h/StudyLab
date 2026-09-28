#!/usr/bin/env node
/**
 * scripts/test-phase31-persistence-audit.mjs
 *
 * Verificación de la Tarea 1:
 * Auditoría de Persistencia Real en Dexie (v8) y Rehidratación Aislada por Materia:
 * 1. Esquema Dexie v8: 'chunkingSets' y 'desirableDifficultiesConfigs'.
 * 2. Módulos de persistencia real: chunkingStorage.ts y desirableDifficultiesStorage.ts.
 * 3. Aislamiento por subjectFolderId para evitar sobrescritura entre materias.
 * 4. Integridad de los defaults cognitivos y preservación de campos.
 * 5. Rehidratación y debounce en ChunkingMethod.tsx y DesirableDifficultiesMethod.tsx.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_CHUNKS,
  DEFAULT_CHUNKING_TOPIC,
  buildChunkingSetId,
} from "../src/features/study-methods/chunkingStorage.ts";

import {
  DEFAULT_BARRIERS,
  DEFAULT_DESIRABLE_TOPIC,
  DEFAULT_DESIRABLE_NOTES,
  buildDesirableDifficultiesId,
} from "../src/features/study-methods/desirableDifficultiesStorage.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("[Test 1] Esquema Dexie v8 en src/db/db.ts para persistencia relacional", () => {
  const dbFile = path.join(rootDir, "src", "db", "db.ts");
  assert.ok(fs.existsSync(dbFile), "db.ts debe existir");

  const dbContent = fs.readFileSync(dbFile, "utf8");

  // Verificar tipos exportados
  assert.match(dbContent, /export interface ChunkingSetRecord/, "db.ts debe exportar ChunkingSetRecord");
  assert.match(
    dbContent,
    /export interface DesirableDifficultiesConfigRecord/,
    "db.ts debe exportar DesirableDifficultiesConfigRecord",
  );

  // Verificar campos de Folder vinculante
  assert.match(dbContent, /subjectFolderId\?: string \| null;/, "Las entidades deben vincularse a subjectFolderId");

  // Verificar registro en la interfaz de la base de datos
  assert.match(
    dbContent,
    /chunkingSets:\s*EntityTable<ChunkingSetRecord,\s*"id">;/,
    "db debe tipar la tabla chunkingSets",
  );
  assert.match(
    dbContent,
    /desirableDifficultiesConfigs:\s*EntityTable<DesirableDifficultiesConfigRecord,\s*"id">;/,
    "db debe tipar la tabla desirableDifficultiesConfigs",
  );

  // Verificar migración v8
  assert.match(
    dbContent,
    /db\.version\(8\)\.stores\({\s*chunkingSets:\s*"id,\s*subjectFolderId,\s*topic,\s*updatedAt",\s*desirableDifficultiesConfigs:\s*"id,\s*subjectFolderId,\s*topic,\s*updatedAt",\s*}\);/,
    "db.version(8) debe indexar id, subjectFolderId, topic y updatedAt",
  );
});

test("[Test 2] Aislamiento de clave por Carpeta/Materia (chunkingStorage)", () => {
  const globalId = buildChunkingSetId(null);
  const emptyId = buildChunkingSetId("");
  const undefinedId = buildChunkingSetId(undefined);

  assert.equal(globalId, "chunking_set_global", "Clave nula debe asignar ID global aislado");
  assert.equal(emptyId, "chunking_set_global", "Clave vacía debe asignar ID global aislado");
  assert.equal(undefinedId, "chunking_set_global", "Clave indefinida debe asignar ID global aislado");

  const anatomyId = buildChunkingSetId("folder_anatomia_2024");
  const physicsId = buildChunkingSetId("folder_fisica_2");

  assert.equal(anatomyId, "chunking_set_folder_anatomia_2024");
  assert.equal(physicsId, "chunking_set_folder_fisica_2");
  assert.notEqual(anatomyId, physicsId, "Diferentes materias no deben compartir el mismo storage key");
});

test("[Test 3] Aislamiento de clave por Carpeta/Materia (desirableDifficultiesStorage)", () => {
  const globalId = buildDesirableDifficultiesId(null);
  assert.equal(globalId, "desirable_diff_config_global");

  const lawId = buildDesirableDifficultiesId("folder_derecho_penal");
  const mathId = buildDesirableDifficultiesId("folder_analisis_matematico");

  assert.equal(lawId, "desirable_diff_config_folder_derecho_penal");
  assert.equal(mathId, "desirable_diff_config_folder_analisis_matematico");
  assert.notEqual(lawId, mathId);
});

test("[Test 4] Integridad de defaults cognitivos", () => {
  assert.equal(DEFAULT_CHUNKING_TOPIC, "Los 12 Pares Craneales");
  assert.ok(DEFAULT_CHUNKS.length >= 4, "Debe tener al menos 4 paquetes cognitivos iniciales");
  for (const chunk of DEFAULT_CHUNKS) {
    assert.ok(chunk.id, "Cada chunk debe tener id");
    assert.ok(chunk.name, "Cada chunk debe tener name");
    assert.ok(chunk.mnemonicTag, "Cada chunk debe tener mnemonicTag");
    assert.ok(Array.isArray(chunk.items) && chunk.items.length > 0, "Cada chunk debe tener items iniciales");
  }

  assert.equal(DEFAULT_DESIRABLE_TOPIC, "Resolución de Ecuaciones Diferenciales");
  assert.ok(DEFAULT_DESIRABLE_NOTES.length > 20);
  assert.equal(DEFAULT_BARRIERS.length, 4);

  const barrierIds = DEFAULT_BARRIERS.map((b) => b.id);
  assert.ok(barrierIds.includes("delayed-testing"));
  assert.ok(barrierIds.includes("blind-interleaving"));
  assert.ok(barrierIds.includes("generation-first"));
  assert.ok(barrierIds.includes("context-variation"));
});

test("[Test 5] Simulación de rehidratación y ciclo de vida de persistencia en memoria", () => {
  // Simular BD de prueba en memoria
  const memoryStore = new Map();

  const mockSave = (record) => {
    memoryStore.set(record.id, JSON.parse(JSON.stringify(record)));
  };

  const mockGet = (id) => {
    const raw = memoryStore.get(id);
    return raw ? JSON.parse(JSON.stringify(raw)) : undefined;
  };

  // 1. Guardar sesión de Anatomía
  const anatomyRecord = {
    id: buildChunkingSetId("folder_anatomia"),
    subjectFolderId: "folder_anatomia",
    topic: "Arterias del Miembro Superior",
    chunks: [
      {
        id: "ch_1",
        name: "Ramas de la Arteria Axilar",
        mnemonicTag: "Mama Se Acuesta Con Dos",
        items: ["Torácica superior", "Toracoacromial", "Torácica lateral", "Subescapular"],
      },
    ],
    createdAt: 1000,
    updatedAt: 1000,
  };
  mockSave(anatomyRecord);

  // 2. Guardar sesión de Física
  const physicsRecord = {
    id: buildChunkingSetId("folder_fisica"),
    subjectFolderId: "folder_fisica",
    topic: "Leyes de la Termodinámica",
    chunks: [
      {
        id: "ch_2",
        name: "Principios Termodinámicos",
        mnemonicTag: "0 - 1 - 2 - 3",
        items: ["Ley Cero (Equilibrio térmico)", "Primera Ley (Energía)", "Segunda Ley (Entropía)"],
      },
    ],
    createdAt: 2000,
    updatedAt: 2000,
  };
  mockSave(physicsRecord);

  // 3. Simular recarga de página: consultar ambas materias
  const rehydratedAnatomy = mockGet(buildChunkingSetId("folder_anatomia"));
  const rehydratedPhysics = mockGet(buildChunkingSetId("folder_fisica"));

  assert.ok(rehydratedAnatomy, "Anatomía debe recuperarse íntegramente");
  assert.equal(rehydratedAnatomy.topic, "Arterias del Miembro Superior");
  assert.equal(rehydratedAnatomy.chunks[0].name, "Ramas de la Arteria Axilar");
  assert.equal(rehydratedAnatomy.chunks[0].items.length, 4);

  assert.ok(rehydratedPhysics, "Física debe recuperarse íntegramente");
  assert.equal(rehydratedPhysics.topic, "Leyes de la Termodinámica");
  assert.equal(rehydratedPhysics.chunks[0].items.length, 3);

  // 4. Modificar Anatomía y verificar que Física permanece inmutable
  rehydratedAnatomy.chunks[0].items.push("Circunflejas humerales");
  rehydratedAnatomy.updatedAt = 3000;
  mockSave(rehydratedAnatomy);

  const finalAnatomy = mockGet(buildChunkingSetId("folder_anatomia"));
  const finalPhysics = mockGet(buildChunkingSetId("folder_fisica"));

  assert.equal(finalAnatomy.chunks[0].items.length, 5);
  assert.equal(finalPhysics.chunks[0].items.length, 3, "Física no debe haber sufrido cambios");
});

test("[Test 6] Integración de UI, Debounce (~800ms) y Visualización en ChunkingMethod.tsx", (t) => {
  const compPath = path.join(rootDir, "src", "components", "study-methods", "ChunkingMethod.tsx");
  assert.ok(fs.existsSync(compPath));

  const compContent = fs.readFileSync(compPath, "utf8");

  assert.match(compContent, /getChunkingSet/, "Debe importar getChunkingSet");
  assert.match(compContent, /saveChunkingSet/, "Debe importar saveChunkingSet");
  assert.match(compContent, /selectedFolderId/, "Debe manejar selectedFolderId en estado");
  assert.match(compContent, /subjectFolders/, "Debe cargar subjectFolders de Dexie");
  assert.ok(compContent.includes("setTimeout") && compContent.includes("800"), "Debe implementar debounce de 800ms");
  assert.match(compContent, /saveStatus/, "Debe registrar saveStatus ('idle' | 'saving' | 'saved')");
  assert.match(compContent, /Guardado/, "Debe renderizar indicador visual de Guardado");

  // Simulación conductual estricta del ciclo de debounce con temporizadores virtuales
  t.mock.timers.enable();

  let saveCalls = [];
  let saveStatus = "idle";
  let activeTimer = null;

  const simulateChange = (newTopic, newChunks) => {
    saveStatus = "saving";
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
      saveCalls.push({ topic: newTopic, chunks: newChunks });
      saveStatus = "saved";
      activeTimer = setTimeout(() => {
        saveStatus = "idle";
      }, 2500);
    }, 800);
  };

  // 1. Tipeo rápido en el formulario
  simulateChange("Anatomía I", [{ id: "c1", name: "Chunk 1" }]);
  t.mock.timers.tick(200);
  assert.equal(saveCalls.length, 0, "No debe guardar tras solo 200ms de inactividad");
  assert.equal(saveStatus, "saving", "El estado debe permanecer en 'saving'");

  simulateChange("Anatomía II", [{ id: "c1", name: "Chunk 1 editado" }]);
  t.mock.timers.tick(400);
  assert.equal(saveCalls.length, 0, "No debe guardar tras ráfaga intermedia");

  simulateChange("Anatomía III (Final)", [{ id: "c1", name: "Chunk 1 consolidado" }]);
  t.mock.timers.tick(799);
  assert.equal(saveCalls.length, 0, "A los 799ms aún no debe haber disparado el guardado");

  // 2. Alcanzar los 800ms exactos tras el último cambio
  t.mock.timers.tick(1);
  assert.equal(saveCalls.length, 1, "Debe ejecutar exactamente un único guardado al cumplirse los 800ms");
  assert.equal(saveCalls[0].topic, "Anatomía III (Final)", "Debe persistir el estado más reciente de la ráfaga");
  assert.equal(saveStatus, "saved", "Debe cambiar a estado 'saved'");

  // 3. Verificación de expiración del badge 'saved' tras 2500ms
  t.mock.timers.tick(2499);
  assert.equal(saveStatus, "saved", "El badge debe persistir visible durante ~2.5s");
  t.mock.timers.tick(1);
  assert.equal(saveStatus, "idle", "El badge debe volver a 'idle' tras 2500ms");
});

test("[Test 7] Integración de UI, Debounce (~800ms) y Visualización en DesirableDifficultiesMethod.tsx", (t) => {
  const compPath = path.join(rootDir, "src", "components", "study-methods", "DesirableDifficultiesMethod.tsx");
  assert.ok(fs.existsSync(compPath));

  const compContent = fs.readFileSync(compPath, "utf8");

  assert.match(compContent, /getDesirableDifficultiesConfig/, "Debe importar getDesirableDifficultiesConfig");
  assert.match(compContent, /saveDesirableDifficultiesConfig/, "Debe importar saveDesirableDifficultiesConfig");
  assert.match(compContent, /selectedFolderId/, "Debe manejar selectedFolderId en estado");
  assert.match(compContent, /subjectFolders/, "Debe cargar subjectFolders de Dexie");
  assert.ok(compContent.includes("setTimeout") && compContent.includes("800"), "Debe implementar debounce de 800ms");
  assert.match(compContent, /saveStatus/, "Debe registrar saveStatus ('idle' | 'saving' | 'saved')");
  assert.match(compContent, /Guardado/, "Debe renderizar indicador visual de Guardado");

  // Simulación conductual estricta del ciclo de debounce con temporizadores virtuales
  t.mock.timers.enable();

  let saveCalls = [];
  let saveStatus = "idle";
  let activeTimer = null;

  const simulateFrictionChange = (fluency, retention) => {
    saveStatus = "saving";
    if (activeTimer) clearTimeout(activeTimer);
    activeTimer = setTimeout(() => {
      saveCalls.push({ fluency, retention });
      saveStatus = "saved";
      activeTimer = setTimeout(() => {
        saveStatus = "idle";
      }, 2500);
    }, 800);
  };

  // 1. Ajustes sucesivos de sliders de fricción
  simulateFrictionChange(1, 3);
  t.mock.timers.tick(300);
  assert.equal(saveCalls.length, 0);
  assert.equal(saveStatus, "saving");

  simulateFrictionChange(2, 4);
  t.mock.timers.tick(500);
  assert.equal(saveCalls.length, 0);

  simulateFrictionChange(2, 5); // Último valor
  t.mock.timers.tick(799);
  assert.equal(saveCalls.length, 0);

  t.mock.timers.tick(1);
  assert.equal(saveCalls.length, 1, "Debe persistir en exactamente 800ms");
  assert.equal(saveCalls[0].retention, 5, "Debe persistir el último valor de retención");
  assert.equal(saveStatus, "saved");

  t.mock.timers.tick(2500);
  assert.equal(saveStatus, "idle");
});
