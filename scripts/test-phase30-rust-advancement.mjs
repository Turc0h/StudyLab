#!/usr/bin/env node
/**
 * scripts/test-phase30-rust-advancement.mjs
 *
 * Verificación de la Fase 30:
 * 1. Pizarra Virtual Dedicada (/blackboard y Sidebar)
 * 2. Motor de Búsqueda FTS & Tokenizador Académico en Rust
 * 3. Compresión Binaria Delta de Trazos de Pizarra en Rust
 * 4. Compilador de Dossiers y Resúmenes Académicos en Rust
 * 5. Puentes en src/platform/ y Fallback Web Determinista
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("[Test 1] Apartado Autónomo de Pizarra Virtual (/blackboard)", () => {
  // Verificar existencia de BlackboardPage.tsx
  const pagePath = path.join(rootDir, "src", "pages", "BlackboardPage.tsx");
  assert.ok(fs.existsSync(pagePath), "BlackboardPage.tsx debe existir");

  const pageContent = fs.readFileSync(pagePath, "utf8");
  assert.match(pageContent, /VirtualBlackboard/, "Debe montar VirtualBlackboard");
  assert.match(pageContent, /Pizarra Virtual/, "Debe tener título de cátedra");

  // Verificar ruta en App.tsx
  const appPath = path.join(rootDir, "src", "App.tsx");
  const appContent = fs.readFileSync(appPath, "utf8");
  assert.match(appContent, /path:\s*"blackboard"/, "App.tsx debe declarar la ruta /blackboard");

  // Verificar presencia en Sidebar.tsx
  const sidebarPath = path.join(rootDir, "src", "components", "layout", "Sidebar.tsx");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf8");
  assert.match(sidebarContent, /to:\s*"\/blackboard"/, "Sidebar debe tener el enlace a /blackboard");
  assert.match(sidebarContent, /label:\s*"Pizarra Virtual"/, "Sidebar debe rotular 'Pizarra Virtual'");

  // Verificar presencia en CommandPalette
  const cpPath = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
  const cpContent = fs.readFileSync(cpPath, "utf8");
  assert.match(cpContent, /action-blackboard/, "Command palette debe tener la acción de Pizarra Virtual");
});

test("[Test 2] Arquitectura de Módulos Rust (Search, Dossier, Compression)", () => {
  const searchMod = path.join(rootDir, "src-tauri", "src", "domain", "search", "mod.rs");
  const dossierMod = path.join(rootDir, "src-tauri", "src", "domain", "dossier", "mod.rs");
  const compMod = path.join(rootDir, "src-tauri", "src", "domain", "strokes", "compression.rs");

  assert.ok(fs.existsSync(searchMod), "domain/search/mod.rs debe existir");
  assert.ok(fs.existsSync(dossierMod), "domain/dossier/mod.rs debe existir");
  assert.ok(fs.existsSync(compMod), "domain/strokes/compression.rs debe existir");

  const domainMod = path.join(rootDir, "src-tauri", "src", "domain", "mod.rs");
  const domainContent = fs.readFileSync(domainMod, "utf8");
  assert.match(domainContent, /pub mod search;/, "domain/mod.rs debe exportar search");
  assert.match(domainContent, /pub mod dossier;/, "domain/mod.rs debe exportar dossier");
});

test("[Test 3] Registro de Comandos en Tauri Runtime (lib.rs)", () => {
  const libPath = path.join(rootDir, "src-tauri", "src", "lib.rs");
  const libContent = fs.readFileSync(libPath, "utf8");

  assert.match(libContent, /search_academic_chunks/, "lib.rs debe registrar search_academic_chunks");
  assert.match(libContent, /tokenize_text_fast/, "lib.rs debe registrar tokenize_text_fast");
  assert.match(libContent, /compress_strokes_binary/, "lib.rs debe registrar compress_strokes_binary");
  assert.match(libContent, /decompress_strokes_binary/, "lib.rs debe registrar decompress_strokes_binary");
  assert.match(libContent, /compile_academic_dossier/, "lib.rs debe registrar compile_academic_dossier");
});

test("[Test 4] Re-exportación en platform/index.ts", () => {
  const indexPath = path.join(rootDir, "src", "platform", "index.ts");
  const indexContent = fs.readFileSync(indexPath, "utf8");

  assert.match(indexContent, /export \* from "\.\/nativeSearch";/, "index.ts debe exportar nativeSearch");
  assert.match(indexContent, /export \* from "\.\/nativeDossier";/, "index.ts debe exportar nativeDossier");
});

test("[Test 5] Contrato y Lógica de Búsqueda FTS & Tokenizador", async () => {
  const searchBridge = path.join(rootDir, "src", "platform", "nativeSearch.ts");
  assert.ok(fs.existsSync(searchBridge), "nativeSearch.ts debe existir");

  const content = fs.readFileSync(searchBridge, "utf8");
  assert.match(content, /searchAcademicChunksNative/, "Debe exportar searchAcademicChunksNative");
  assert.match(content, /tokenizeTextNative/, "Debe exportar tokenizeTextNative");
});

test("[Test 6] Compresión Binaria Delta de Trazos Vectoriales", async () => {
  const strokeBridge = path.join(rootDir, "src", "platform", "nativeStroke.ts");
  const content = fs.readFileSync(strokeBridge, "utf8");

  assert.match(content, /compressStrokesNative/, "Debe exportar compressStrokesNative");
  assert.match(content, /decompressStrokesNative/, "Debe exportar decompressStrokesNative");
  assert.match(content, /compression_ratio_pct/, "Debe computar el ratio de compresión");
});

test("[Test 7] Compilador de Dossiers Académicos", async () => {
  const dossierBridge = path.join(rootDir, "src", "platform", "nativeDossier.ts");
  const content = fs.readFileSync(dossierBridge, "utf8");

  assert.match(content, /compileAcademicDossierNative/, "Debe exportar compileAcademicDossierNative");
  assert.match(content, /AcademicDossierOutput/, "Debe retornar AcademicDossierOutput");
});

test("[Test 8] Persistencia de Pizarras en Dexie & VirtualBlackboard", () => {
  const dbPath = path.join(rootDir, "src", "db", "db.ts");
  const dbContent = fs.readFileSync(dbPath, "utf8");
  assert.match(dbContent, /blackboards:\s*EntityTable<SavedBlackboardRecord/, "db.ts debe tipar la tabla blackboards");
  assert.match(dbContent, /version\(7\)\.stores/, "db.ts debe declarar la versión 7 con blackboards");

  const vbPath = path.join(rootDir, "src", "components", "whiteboard", "VirtualBlackboard.tsx");
  const vbContent = fs.readFileSync(vbPath, "utf8");
  assert.match(vbContent, /handleSaveBlackboard/, "VirtualBlackboard debe tener handleSaveBlackboard");
  assert.match(vbContent, /handleLoadBlackboard/, "VirtualBlackboard debe tener handleLoadBlackboard");
  assert.match(vbContent, /Mis Pizarras/, "VirtualBlackboard debe tener botón y modal de Mis Pizarras");
});

test("[Test 9] Integración FTS en Command Palette", () => {
  const cpPath = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
  const cpContent = fs.readFileSync(cpPath, "utf8");
  assert.match(cpContent, /searchAcademicChunksNative/, "commandPaletteService debe importar searchAcademicChunksNative");
  assert.match(cpContent, /Apuntes FTS/, "commandPaletteService debe etiquetar resultados como Apuntes FTS");
});

test("[Test 10] Integración de Compilador Rust en DossierPreviewModal", () => {
  const dModalPath = path.join(rootDir, "src", "components", "dossier", "DossierPreviewModal.tsx");
  const dModalContent = fs.readFileSync(dModalPath, "utf8");
  assert.match(dModalContent, /compileAcademicDossierNative/, "DossierPreviewModal debe importar compileAcademicDossierNative");
  assert.match(dModalContent, /getDossierHtmlCompiled/, "DossierPreviewModal debe compilar HTML con Rust");
});