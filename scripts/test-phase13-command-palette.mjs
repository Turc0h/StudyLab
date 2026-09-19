import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchCommandPalette } from "../src/features/command-palette/commandPaletteService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.13 (COMMAND PALETTE Y NAVEGACIÓN UNIVERSAL)  ");
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
// Test 1: Store de Paleta de Comandos (useCommandPaletteStore.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Store de Estado Global (useCommandPaletteStore.ts)");
const storePath = path.join(root, "src/stores/useCommandPaletteStore.ts");
assert(fs.existsSync(storePath), "Existe useCommandPaletteStore.ts");
const storeContent = fs.readFileSync(storePath, "utf-8");

assert(storeContent.includes("export const useCommandPaletteStore"), "Exporta useCommandPaletteStore");
assert(storeContent.includes("isOpen: boolean"), "Declara propiedad de visibilidad isOpen");
assert(storeContent.includes("query: string"), "Declara propiedad de consulta query");
assert(storeContent.includes("open:") && storeContent.includes("close:"), "Declara acciones open y close");
assert(storeContent.includes("toggle:"), "Declara acción toggle");

// -----------------------------------------------------------------------------
// Test 2: Servicio de Búsqueda Multimodal (commandPaletteService.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Motor de Búsqueda y Ponderación (commandPaletteService.ts)");
const servicePath = path.join(root, "src/features/command-palette/commandPaletteService.ts");
assert(fs.existsSync(servicePath), "Existe commandPaletteService.ts");
const serviceContent = fs.readFileSync(servicePath, "utf-8");

assert(serviceContent.includes("export async function searchCommandPalette"), "Exporta searchCommandPalette");
assert(serviceContent.includes("CommandPaletteCategory"), "Declara tipos de categorías");
assert(serviceContent.includes("STUDY_METHODS_30_SEEDS"), "Indexa los 30 métodos de estudio");
assert(serviceContent.includes("db.files"), "Indexa documentos y archivos de Dexie");
assert(serviceContent.includes("db.contextProjects"), "Indexa proyectos del Motor de Contexto");

// -----------------------------------------------------------------------------
// Test 3: Casos de Búsqueda Determinista Multientidad
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Consultas y Disparadores Multientidad");

let navigatedRoute = "";
let themeToggled = false;
let focusModeEntered = false;
let orgToggled = false;
let notifToggled = false;

const mockActions = {
  navigate: (to) => { navigatedRoute = to; },
  toggleTheme: () => { themeToggled = true; },
  enterFocusMode: () => { focusModeEntered = true; },
  toggleOrg: () => { orgToggled = true; },
  toggleNotif: () => { notifToggled = true; },
};

// Caso A: Consulta vacía -> Devuelve acciones sugeridas y métodos destacados
const emptyResults = await searchCommandPalette("", mockActions);
assert(emptyResults.length > 0, `Consulta vacía devuelve resultados sugeridos (${emptyResults.length} ítems)`);
const hasTriage = emptyResults.some((i) => i.id === "action-triage");
const hasBackup = emptyResults.some((i) => i.id === "action-backup");
assert(hasTriage, "Consulta vacía incluye Asistente de Triaje Cognitivo");
assert(hasBackup, "Consulta vacía incluye Respaldo portable .studylab-bundle");

// Caso B: Búsqueda de técnica por nombre ("feynman")
const feynmanResults = await searchCommandPalette("feynman", mockActions);
assert(feynmanResults.length > 0, "Búsqueda 'feynman' encuentra resultados");
assert(feynmanResults[0].id.includes("feynman"), `Top resultado es la Técnica Feynman (${feynmanResults[0].title})`);
feynmanResults[0].onSelect();
assert(navigatedRoute.includes("/methods?run=feynman"), `Acción de Feynman navega directamente al runner: ${navigatedRoute}`);

// Caso C: Búsqueda de técnica por alias ("loci" o "palacio")
const lociResults = await searchCommandPalette("loci", mockActions);
assert(lociResults.length > 0, "Búsqueda 'loci' encuentra el Palacio de la Memoria");
assert(lociResults[0].id.includes("loci") || lociResults[0].id.includes("memory-palace"), "Identifica método mnemotécnico espacial");

// Caso D: Búsqueda de acción de sistema ("triaje")
const triageResults = await searchCommandPalette("triaje", mockActions);
assert(triageResults.length > 0, "Búsqueda 'triaje' encuentra el asistente de diagnóstico");
triageResults[0].onSelect();
assert(navigatedRoute.includes("/methods?triage=true"), `Acción navega a triaje: ${navigatedRoute}`);

// Caso E: Búsqueda de acción de sistema ("backup" o "bundle")
const backupResults = await searchCommandPalette("bundle", mockActions);
assert(backupResults.length > 0, "Búsqueda 'bundle' encuentra el respaldo de workspace");
backupResults[0].onSelect();
assert(navigatedRoute.includes("/settings"), `Acción navega a configuración: ${navigatedRoute}`);

// Caso F: Búsqueda de acción de sistema ("enfoque")
const focusResults = await searchCommandPalette("enfoque", mockActions);
assert(focusResults.length > 0, "Búsqueda 'enfoque' encuentra acción de Modo Enfoque");
focusResults[0].onSelect();
assert(focusModeEntered, "Ejecuta acción de activar Modo Enfoque sin fricción");

// Caso G: Búsqueda de acción de sistema ("tema" o "oscuro")
const themeResults = await searchCommandPalette("oscuro", mockActions);
assert(themeResults.length > 0, "Búsqueda 'oscuro' encuentra acción de alternar tema");
themeResults[0].onSelect();
assert(themeToggled, "Ejecuta acción de alternar tema visual");

// -----------------------------------------------------------------------------
// Test 4: Componente Visual (CommandPalette.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Componente Visual (CommandPalette.tsx)");
const componentPath = path.join(root, "src/components/command-palette/CommandPalette.tsx");
assert(fs.existsSync(componentPath), "Existe CommandPalette.tsx");
const componentContent = fs.readFileSync(componentPath, "utf-8");

assert(componentContent.includes("export const CommandPalette"), "Exporta componente CommandPalette");
assert(componentContent.includes("useCommandPaletteStore"), "Se conecta a useCommandPaletteStore");
assert(componentContent.includes("handleKeyDown"), "Maneja navegación accesible por teclado");
assert(componentContent.includes("ArrowDown") && componentContent.includes("ArrowUp"), "Soporta navegación con flechas arriba/abajo");
assert(componentContent.includes("Enter"), "Soporta ejecución instantánea con tecla Enter");
assert(componentContent.includes("Escape"), "Soporta cierre instantáneo con tecla Escape");
assert(componentContent.includes("CATEGORY_COLORS"), "Aplica códigos de color semánticos por categoría");

// -----------------------------------------------------------------------------
// Test 5: Integración en Shell.tsx y Header.tsx
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Integración en Shell.tsx y Header.tsx");
const shellPath = path.join(root, "src/components/layout/Shell.tsx");
assert(fs.existsSync(shellPath), "Existe Shell.tsx");
const shellContent = fs.readFileSync(shellPath, "utf-8");

assert(shellContent.includes("CommandPalette"), "Shell.tsx importa CommandPalette");
assert(shellContent.includes("<CommandPalette"), "Shell.tsx monta <CommandPalette />");
assert(
  shellContent.includes("e.key.toLowerCase() === \"k\"") || shellContent.includes("key === \"k\""),
  "Shell.tsx escucha globalmente el atajo Ctrl+K / Cmd+K"
);

const headerPath = path.join(root, "src/components/layout/Header.tsx");
assert(fs.existsSync(headerPath), "Existe Header.tsx");
const headerContent = fs.readFileSync(headerPath, "utf-8");

assert(headerContent.includes("useCommandPaletteStore"), "Header.tsx se conecta al store de la paleta");
assert(headerContent.includes("openCommandPalette"), "Header.tsx dispone de disparador de apertura");
assert(headerContent.includes("⌘K") || headerContent.includes("Ctrl+K"), "Header.tsx muestra el indicador visual de atajo ⌘K");

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> ETAPA v5.13 COMPLETADA CON ÉXITO: Paleta de Comandos y Navegación Universal operativa. <<\n");
}
