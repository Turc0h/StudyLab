import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.25 (AUDIO FLASHCARDS & PODCAST UNIVERSITARIO)  ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Test 1] Motor de Audio Flashcards y Playlists (audioFlashcardsEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Audio Flashcards y Playlists (audioFlashcardsEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "audio-flashcards", "audioFlashcardsEngine.ts");

test("Existe src/features/audio-flashcards/audioFlashcardsEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo audioFlashcardsEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta interfaces y configuraciones por defecto de audio", () => {
  assert.ok(engineSrc.includes("export interface AudioFlashcardItem"), "Debe exportar AudioFlashcardItem");
  assert.ok(engineSrc.includes("export interface AudioFlashcardPlaylist"), "Debe exportar AudioFlashcardPlaylist");
  assert.ok(engineSrc.includes("export interface AudioPlaybackSettings"), "Debe exportar AudioPlaybackSettings");
  assert.ok(engineSrc.includes("export const DEFAULT_AUDIO_SETTINGS"), "Debe exportar DEFAULT_AUDIO_SETTINGS");
});

test("Configuración por defecto tiene pausas óptimas de active recall (6s / 3s) y chime", () => {
  assert.ok(engineSrc.includes("recallPauseSeconds: 6"), "Pausa de evocación por defecto debe ser 6s");
  assert.ok(engineSrc.includes("answerPauseSeconds: 3"), "Pausa post-respuesta por defecto debe ser 3s");
  assert.ok(engineSrc.includes("beepCue: true"), "Chime activado por defecto");
});

test("Incluye playlists universitarias precargadas para Medicina, Derecho e Ingeniería", () => {
  assert.ok(engineSrc.includes("export const PRESET_AUDIO_PLAYLISTS"), "Debe exportar PRESET_AUDIO_PLAYLISTS");
  assert.ok(engineSrc.includes("playlist-cardio-pharma"), "Debe contener playlist de cardiología y farmacología");
  assert.ok(engineSrc.includes("playlist-civil-contracts"), "Debe contener playlist de contratos civiles y obligaciones");
  assert.ok(engineSrc.includes("playlist-distributed-systems"), "Debe contener playlist de sistemas distribuidos");
});

test("Implementa Web Speech y Web Audio sin dependencias externas binarias", () => {
  assert.ok(engineSrc.includes("SpeechSynthesisUtterance"), "Debe utilizar SpeechSynthesisUtterance");
  assert.ok(engineSrc.includes("playChimeCue"), "Debe exportar playChimeCue con síntesis nativa Web Audio");
  assert.ok(engineSrc.includes("AudioContext"), "Debe utilizar AudioContext nativo del navegador");
  assert.ok(engineSrc.includes("saveAudioStudySessionRecord"), "Debe exportar guardado de sesión en IndexedDB");
});

// -----------------------------------------------------------------------------
// [Test 2] Interfaz de Usuario y Modo Caminata (AudioFlashcardsMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Interfaz de Usuario y Modo Caminata (AudioFlashcardsMethod.tsx)");

const uiFile = path.join(rootDir, "src", "components", "study-methods", "AudioFlashcardsMethod.tsx");

test("Existe src/components/study-methods/AudioFlashcardsMethod.tsx", () => {
  assert.ok(fs.existsSync(uiFile), "El componente AudioFlashcardsMethod.tsx debe existir");
});

const uiSrc = fs.readFileSync(uiFile, "utf-8");

test("Contiene estados de reproducción, evocación activa y pausas reflexivas", () => {
  assert.ok(uiSrc.includes('"idle"'), "Debe contener estado idle");
  assert.ok(uiSrc.includes('"pause_recall"'), "Debe manejar pausa de evocación activa");
  assert.ok(uiSrc.includes('"pause_consolidation"'), "Debe manejar pausa de consolidación");
  assert.ok(uiSrc.includes("playChimeCue"), "Debe emitir señal auditiva antes de revelar la respuesta");
});

test("Soporta 'Modo Caminata (OLED)' a pantalla completa con controles de alto contraste", () => {
  assert.ok(uiSrc.includes("isWalkingMode"), "Debe tener estado isWalkingMode");
  assert.ok(uiSrc.includes("Modo Caminata"), "Debe etiquetar el modo caminata");
  assert.ok(uiSrc.includes("bg-black"), "Debe implementar fondo ultra-oscuro para pantallas OLED");
});

test("Soporta MediaSession API para controles Bluetooth de auriculares (Play/Pause/Next/Prev)", () => {
  assert.ok(uiSrc.includes("navigator.mediaSession"), "Debe integrar MediaSession API de navegadores modernos");
  assert.ok(uiSrc.includes('setActionHandler("play"'), "Debe controlar Play desde botón de auricular");
  assert.ok(uiSrc.includes('setActionHandler("pause"'), "Debe controlar Pause desde botón de auricular");
  assert.ok(uiSrc.includes('setActionHandler("nexttrack"'), "Debe avanzar tarjeta desde auricular");
  assert.ok(uiSrc.includes('setActionHandler("previoustrack"'), "Debe retroceder tarjeta desde auricular");
});

// -----------------------------------------------------------------------------
// [Test 3] Integración en el Catálogo de Métodos (types y MethodsPage.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Integración en el Catálogo de Métodos (types y MethodsPage.tsx)");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("StudyMethodId incluye 'audio-flashcards'", () => {
  assert.ok(typesSrc.includes('"audio-flashcards"'), "StudyMethodId debe incluir 'audio-flashcards'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage importa perezosamente AudioFlashcardsMethod y lo incluye en el switch", () => {
  assert.ok(methodsPageSrc.includes("AudioFlashcardsMethod"), "MethodsPage debe importar perezosamente AudioFlashcardsMethod");
  assert.ok(methodsPageSrc.includes('case "audio-flashcards":'), "MethodsPage debe despachar 'audio-flashcards'");
  assert.ok(methodsPageSrc.includes("Audio Flashcards"), "MethodsPage debe mostrar el acceso rápido a Audio Flashcards");
});

// -----------------------------------------------------------------------------
// [Test 4] Integración en la Paleta de Comandos (Command Palette)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integración en la Paleta de Comandos (Command Palette)");

const cmdServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const cmdServiceSrc = fs.readFileSync(cmdServiceFile, "utf-8");

test("commandPaletteService registra la acción 'action-audio-flashcards'", () => {
  assert.ok(cmdServiceSrc.includes("action-audio-flashcards"), "Debe registrar action-audio-flashcards");
  assert.ok(cmdServiceSrc.includes("/methods?run=audio-flashcards"), "Debe redirigir a /methods?run=audio-flashcards");
});

const cmdPaletteFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const cmdPaletteSrc = fs.readFileSync(cmdPaletteFile, "utf-8");

test("CommandPalette.tsx importa Headphones y lo registra en ICON_MAP", () => {
  assert.ok(cmdPaletteSrc.includes("Headphones"), "Debe importar Headphones de lucide-react");
  assert.ok(cmdPaletteSrc.includes("Headphones,\n};") || cmdPaletteSrc.includes("Headphones,"), "Debe mapear Headphones en ICON_MAP");
});

// -----------------------------------------------------------------------------
// Resumen de la Suite
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADO SUITE v5.25: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
